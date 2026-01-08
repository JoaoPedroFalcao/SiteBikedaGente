import { serve } from 'https://deno.land/std@0.201.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_API_URL = 'https://api.stripe.com/v1'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { ride_id, amount, reason } = await req.json();
    
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: rideData, error: rideError } = await supabaseAdmin.from('rides').select('user_id').eq('id', ride_id).single();
    if (rideError || !rideData) throw new Error(`Corrida #${ride_id} não encontrada.`);

    const { data: profileData } = await supabaseAdmin.from('profiles').select('stripe_customer_id, default_card_id').eq('id', rideData.user_id).single();
    if (!profileData?.stripe_customer_id) throw new Error(`Usuário da corrida #${ride_id} não possui cadastro no Stripe.`);
    
    const { stripe_customer_id: customerId, default_card_id: defaultCardId } = profileData;

    // 1. Busca todos os cartões do cliente no Stripe
    const pmRes = await fetch(`${STRIPE_API_URL}/payment_methods?customer=${customerId}&type=card`, {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
    });
    const paymentMethods = await pmRes.json();
    if (!pmRes.ok || !paymentMethods.data) throw new Error('Não foi possível buscar os cartões do usuário.');
    if (paymentMethods.data.length === 0) throw new Error('Nenhum cartão encontrado para este usuário.');

    // 2. Lógica de Cascata: Ordena os cartões, com o principal primeiro
    const sortedPaymentMethods = [...paymentMethods.data].sort((a, b) => {
        if (a.id === defaultCardId) return -1;
        if (b.id === defaultCardId) return 1;
        return 0;
    });

    let paymentIntent = null;
    let lastError = null;

    // 3. Tenta cobrar cada cartão em ordem
    for (const pm of sortedPaymentMethods) {
      try {
        const intentRes = await fetch(`${STRIPE_API_URL}/payment_intents`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            amount: (amount * 100).toString(),
            currency: 'brl',
            customer: customerId,
            payment_method: pm.id,
            description: `Taxa Punitiva (${reason}) - Corrida #${ride_id}`,
            off_session: 'true',
            confirm: 'true',
          }).toString(),
        });

        const intent = await intentRes.json();
        if (!intentRes.ok) throw new Error(intent.error.message);

        if (intent.status === 'succeeded') {
          paymentIntent = intent;
          break; // Sucesso! Sai do loop.
        }
      } catch (e) {
        lastError = e;
        console.log(`Falha ao cobrar cartão ${pm.id}: ${e.message}`);
      }
    }

    if (!paymentIntent) {
      throw lastError || new Error("A cobrança falhou em todos os cartões disponíveis.");
    }
    
    // 4. Sucesso! Atualiza o banco de dados com os dados da cobrança bem-sucedida
    await supabaseAdmin.from('rides').update({
        penalty_fee: amount, fee_charged: amount, payment_status: 'succeeded',
        penalty_reason: reason, payment_id: paymentIntent.id,
      }).eq('id', ride_id);

    return new Response(JSON.stringify({ success: true, paymentId: paymentIntent.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    });
  }
});