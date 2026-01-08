// supabase/functions/set-default-payment-method/index.ts

import { serve } from 'https://deno.land/std@0.201.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/supabaseClient.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_API_URL = 'https://api.stripe.com/v1'

serve(async (req) => {
  console.log("--- [set-default-payment-method] START ---");
  const requestTimestamp = new Date().toISOString();
  let userId = 'N/A';
  let paymentMethodId = 'N/A';

  if (req.method === 'OPTIONS') {
    console.log("[set-default-payment-method] OPTIONS request received, responding OK.");
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    paymentMethodId = body.payment_method_id;
    if (!paymentMethodId) {
      console.error(`[${requestTimestamp}] ERRO: Corpo da requisição não continha payment_method_id.`);
      throw new Error('O ID do método de pagamento é obrigatório.')
    }
    console.log(`[${requestTimestamp}] [1/6] Corpo recebido. Definindo PM padrão como: ${paymentMethodId}`);


    console.log(`[${requestTimestamp}] [2/6] Criando cliente Supabase (user) para obter usuário...`);
    const supabaseUser = createSupabaseClient(req)
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      console.error(`[${requestTimestamp}] ERRO: Falha ao obter usuário.`, authError?.message);
      throw new Error('Usuário não autenticado.')
    }
    userId = user.id;
    console.log(`[${requestTimestamp}] [3/6] Usuário autenticado: ${userId}`);
    
    console.log(`[${requestTimestamp}] [4/6] Criando cliente Supabase (admin) para buscar perfil ${userId}...`);
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
    if (profileError || !profile?.stripe_customer_id) {
      console.error(`[${requestTimestamp}] ERRO ao buscar perfil ou Stripe Customer ID para ${userId}:`, profileError);
      throw new Error('Cliente Stripe não encontrado.')
    }
    const customerId = profile.stripe_customer_id;
    console.log(`[${requestTimestamp}] Perfil encontrado. Stripe Customer ID: ${customerId}`);

    console.log(`[${requestTimestamp}] [5/6] Definindo PM padrão no Stripe para cliente ${customerId}...`);
    const stripeUpdateRes = await fetch(`${STRIPE_API_URL}/customers/${customerId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'invoice_settings[default_payment_method]': paymentMethodId }).toString(),
    })
    const stripeUpdateData = await stripeUpdateRes.json();
    if (!stripeUpdateRes.ok) {
        console.error(`[${requestTimestamp}] ERRO ao definir PM padrão no Stripe para ${customerId}:`, stripeUpdateData.error || stripeUpdateData);
        throw new Error(stripeUpdateData.error?.message || 'Falha ao definir cartão padrão no Stripe.');
    }
    
    console.log(`[${requestTimestamp}] [6/6] Atualizando default_card_id no perfil Supabase ${userId}...`);
    const { error: updateDbError } = await supabaseAdmin
      .from('profiles')
      .update({ default_card_id: paymentMethodId })
      .eq('id', user.id)

    if (updateDbError) {
      console.error(`[${requestTimestamp}] ERRO ao atualizar default_card_id no DB para ${userId}:`, updateDbError);
      throw updateDbError;
    }
    
    console.log(`[${requestTimestamp}] Cartão ${paymentMethodId} definido como padrão com sucesso para ${userId}.`);
    console.log("--- [set-default-payment-method] END OK ---");
    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro inesperado.";
    console.error(`--- [set-default-payment-method] ERROR (User: ${userId}, PM: ${paymentMethodId}, Timestamp: ${requestTimestamp}) ---`);
    console.error("Mensagem:", errorMessage);
    console.error("Objeto Erro:", error);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 400 
    })
  }
})