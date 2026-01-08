// supabase/functions/finalize-card-setup/index.ts

import { serve } from 'https://deno.land/std@0.201.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno' // Import Stripe SDK

const STRIPE_API_KEY = Deno.env.get('STRIPE_SECRET_KEY')!

// Inicializa o cliente Stripe Deno-compatível
const stripe = new Stripe(STRIPE_API_KEY, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  console.log("--- [finalize-card-setup v3 - Profile Update Only] START ---"); // V3
  const requestTimestamp = new Date().toISOString();
  let userId = 'N/A';
  let paymentMethodId = 'N/A'; // Receberemos o PM ID confirmado

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    // AGORA recebemos apenas o paymentMethodId que foi usado na confirmação BEM SUCEDIDA
    paymentMethodId = body.paymentMethodId;
    if (!paymentMethodId) {
      console.error(`[${requestTimestamp}] ERRO: Faltando paymentMethodId confirmado.`);
      throw new Error('ID do método de pagamento confirmado é obrigatório.');
    }
    console.log(`[${requestTimestamp}] [1/5] Corpo recebido. PM Confirmado: ${paymentMethodId}`);

    console.log(`[${requestTimestamp}] [2/5] Autenticando usuário (via token)...`);
    // Usa a chave de administrador para garantir permissão de escrita e buscar o usuário
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
     const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
       { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
     );
     const { data: { user }, error: authError } = await userClient.auth.getUser();
     if (authError || !user) {
        console.error(`[${requestTimestamp}] ERRO: Falha ao obter usuário via token.`, authError?.message);
        throw new Error('Usuário não autenticado.');
     }
     userId = user.id;
     console.log(`[${requestTimestamp}] [3/5] Usuário autenticado: ${userId}`);

    // Não precisamos mais buscar o Customer ID ou anexar/confirmar no Stripe aqui.

    console.log(`[${requestTimestamp}] [4/5] Atualizando perfil ${userId} no Supabase...`);
    // Apenas atualiza o perfil no Supabase
    const updatePayload = {
        has_payment_method: true,
        default_card_id: paymentMethodId, // Salva o PM usado como padrão
    };
    const { error: updateError } = await supabaseAdmin.from('profiles').update(updatePayload).eq('id', userId);
    if (updateError) {
        console.error(`[${requestTimestamp}] ERRO ao atualizar perfil ${userId}:`, updateError);
        // Considerar se este erro deve ser fatal ou apenas logado
        throw new Error('Falha ao atualizar o perfil do usuário após salvar o cartão.');
    }

    // Opcional: Buscar detalhes do cartão para retornar (requer Stripe SDK aqui)
    let cardDetails = { id: paymentMethodId, brand: 'N/A', last4: 'N/A' };
    try {
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        if (paymentMethod?.card) {
            cardDetails = {
              id: paymentMethod.id,
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
            };
        }
         console.log(`[${requestTimestamp}] Detalhes do cartão obtidos.`);
    } catch (retrieveError) {
         console.warn(`[${requestTimestamp}] Aviso: Falha ao buscar detalhes do cartão ${paymentMethodId} após confirmação.`, retrieveError.message);
         // Não lançar erro aqui, a operação principal foi bem-sucedida.
    }


    console.log(`[${requestTimestamp}] [5/5] Processo concluído com sucesso para ${userId}.`);
    console.log("--- [finalize-card-setup v3] END OK ---");
    return new Response(JSON.stringify({ success: true, card: cardDetails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro inesperado.";
    console.error(`--- [finalize-card-setup v3] ERROR (User: ${userId}, PM: ${paymentMethodId}, Timestamp: ${requestTimestamp}) ---`);
    console.error("Mensagem:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
})