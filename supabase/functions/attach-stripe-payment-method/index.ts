import { serve } from 'https://deno.land/std@0.201.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_API_URL = 'https://api.stripe.com/v1'

serve(async (req) => {
  console.log("---------- INVOCANDO 'attach-stripe-payment-method' ----------");
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const { payment_method_id } = await req.json()
    console.log(`[ETAPA 1/7] Corpo da requisição recebido. Payment Method ID: ${payment_method_id}`);
    if (!payment_method_id) throw new Error('O ID do método de pagamento é obrigatório.')

    const supabaseUserClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user } } = await supabaseUserClient.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado.')
    console.log(`[ETAPA 2/7] Usuário autenticado com sucesso. User ID: ${user.id}`);

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { data: profile } = await supabaseAdmin.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
    if (!profile?.stripe_customer_id) throw new Error('Cliente Stripe não encontrado para este usuário.')
    console.log(`[ETAPA 3/7] Perfil do usuário encontrado. Stripe Customer ID: ${profile.stripe_customer_id}`);

    await fetch(`${STRIPE_API_URL}/payment_methods/${payment_method_id}/attach`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ customer: profile.stripe_customer_id }).toString(),
    })
    console.log(`[ETAPA 4/7] Método de pagamento anexado no Stripe.`);
    
    await fetch(`${STRIPE_API_URL}/customers/${profile.stripe_customer_id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ 'invoice_settings[default_payment_method]': payment_method_id }).toString(),
    })
    console.log(`[ETAPA 5/7] Método de pagamento definido como padrão no Stripe.`);
    
    console.log(`[ETAPA 6/7] TENTANDO ATUALIZAR A TABELA 'profiles' PARA O USER ID: ${user.id}`);
    const updatePayload = { 
      default_card_id: payment_method_id,
      has_payment_method: true 
    };
    console.log("Payload da atualização:", updatePayload);

    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select();

    if (updateError) {
      console.error("ERRO DETALHADO DA OPERAÇÃO DE UPDATE:", JSON.stringify(updateError, null, 2));
      throw updateError;
    }
    
    console.log("[ETAPA 7/7] RESULTADO DA OPERAÇÃO DE UPDATE (SEM ERRO):", JSON.stringify(updateData, null, 2));
    if (!updateData || updateData.length === 0) {
        console.warn("AVISO: A operação de update foi executada sem erros, mas não retornou nenhum registro. Isso pode indicar que a RLS (Row Level Security) impediu a operação ou que o registro não foi encontrado pela query 'eq'.");
    }

    console.log("Função 'attach-stripe-payment-method' concluída com sucesso.");
    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })

  } catch (error) {
    console.error("--- ERRO CAPTURADO NO BLOCO CATCH FINAL ---");
    console.error(error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 400 
    })
  }
})