// supabase/functions/create-stripe-customer/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, full_name, email } = await req.json();
    if (!user_id || !full_name || !email) {
      throw new Error('user_id, full_name, e email são obrigatórios.');
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('A variável de ambiente STRIPE_SECRET_KEY não foi definida.');
    }

    // 1. Criar o cliente na API da Stripe
    const stripeParams = new URLSearchParams({
      name: full_name,
      email: email,
      'metadata[user_id]': user_id, // Adiciona o ID do Supabase como metadado
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stripeParams.toString(),
    });

    const stripeCustomer = await stripeResponse.json();

    if (!stripeResponse.ok) {
      throw new Error(stripeCustomer.error?.message || 'Falha ao criar o cliente na Stripe.');
    }

    // 2. Atualizar a tabela 'profiles' no Supabase com o ID do cliente Stripe
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomer.id })
      .eq('id', user_id);

    if (updateError) {
      throw new Error(`Erro ao salvar o ID do cliente Stripe no perfil: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ message: 'Cliente Stripe criado e salvo com sucesso.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na função create-stripe-customer:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});