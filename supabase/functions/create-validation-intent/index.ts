// supabase/functions/create-validation-intent/index.ts

import { serve } from 'https://deno.land/std@0.201.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/supabaseClient.ts'

const STRIPE_API_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_API_URL = 'https://api.stripe.com/v1'
const VALIDATION_AMOUNT = 300; // R$ 3,00 em centavos

serve(async (req) => {
  console.log("--- [create-validation-intent] START ---");
  const requestTimestamp = new Date().toISOString();
  let userId = 'N/A';

  if (req.method === 'OPTIONS') {
    console.log("[create-validation-intent] OPTIONS request received, responding OK.");
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log(`[${requestTimestamp}] [1/7] Criando cliente Supabase para obter usuário...`);
    const supabase = createSupabaseClient(req)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error(`[${requestTimestamp}] ERRO: Falha ao obter usuário.`, authError?.message);
      throw new Error('Usuário não autenticado.')
    }
    userId = user.id; // Guarda o ID para logs de erro
    console.log(`[${requestTimestamp}] [2/7] Usuário autenticado: ${userId}`);

    console.log(`[${requestTimestamp}] [3/7] Buscando perfil do usuário ${userId}...`);
    const { data: profile, error: profileError } = await supabase.from('profiles').select('stripe_customer_id, full_name').eq('id', userId).single()
    if (profileError) {
        console.error(`[${requestTimestamp}] ERRO ao buscar perfil para ${userId}:`, profileError);
        throw profileError;
    }
    console.log(`[${requestTimestamp}] [4/7] Perfil encontrado. Stripe Customer ID atual: ${profile?.stripe_customer_id}`);

    let customerId = profile?.stripe_customer_id;
    // Cria o cliente no Stripe se ele não existir
    if (!customerId) {
      console.log(`[${requestTimestamp}] -> Cliente Stripe não existe para ${userId}. Criando um novo...`);
      const customerParams = new URLSearchParams({ name: profile?.full_name || user.email!, email: user.email!, 'metadata[user_id]': userId });
      const customerRes = await fetch(`${STRIPE_API_URL}/customers`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${STRIPE_API_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: customerParams.toString(),
      });
      const customer = await customerRes.json();
      if (!customerRes.ok || !customer.id) {
          console.error(`[${requestTimestamp}] ERRO ao criar cliente Stripe para ${userId}:`, customer.error || customer);
          throw new Error(customer.error?.message || 'Falha ao criar cliente Stripe.');
      }
      
      customerId = customer.id;
      console.log(`[${requestTimestamp}] -> Novo cliente Stripe criado: ${customerId}`);
      const { error: updateProfileError } = await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
      if (updateProfileError) {
          console.error(`[${requestTimestamp}] ERRO ao atualizar perfil ${userId} com Stripe Customer ID:`, updateProfileError);
          // Não lançamos erro aqui, mas logamos, pois a criação do PI pode prosseguir
      } else {
          console.log(`[${requestTimestamp}] -> Perfil ${userId} atualizado com Stripe Customer ID.`);
      }
    }

    console.log(`[${requestTimestamp}] [5/7] Criando PaymentIntent para cliente ${customerId}...`);
    const paymentIntentParams = new URLSearchParams({
      customer: customerId,
      amount: VALIDATION_AMOUNT.toString(),
      currency: 'brl',
      description: 'Taxa de validação de cartão - Bike da Gente',
      setup_future_usage: 'off_session', // Essencial para salvar o cartão
    });

    const paymentIntentRes = await fetch(`${STRIPE_API_URL}/payment_intents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${STRIPE_API_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: paymentIntentParams.toString(),
    });

    const paymentIntent = await paymentIntentRes.json();
    if (!paymentIntentRes.ok || !paymentIntent.client_secret) {
        console.error(`[${requestTimestamp}] ERRO ao criar PaymentIntent no Stripe para cliente ${customerId}:`, paymentIntent.error || paymentIntent);
        throw new Error(paymentIntent.error?.message || 'Falha ao criar PaymentIntent.');
    }
    console.log(`[${requestTimestamp}] [6/7] PaymentIntent ${paymentIntent.id} criado com sucesso.`);
    
    console.log(`[${requestTimestamp}] [7/7] Retornando client_secret.`);
    console.log("--- [create-validation-intent] END OK ---");
    return new Response(JSON.stringify({ client_secret: paymentIntent.client_secret, id: paymentIntent.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro inesperado.";
    console.error(`--- [create-validation-intent] ERROR (User: ${userId}, Timestamp: ${requestTimestamp}) ---`);
    console.error("Mensagem:", errorMessage);
    console.error("Objeto Erro:", error); // Loga o objeto completo para mais detalhes
    return new Response(JSON.stringify({ error: errorMessage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})