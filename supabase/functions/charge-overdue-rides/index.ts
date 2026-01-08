// supabase/functions/charge-overdue-rides/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

// Constantes para as regras de negócio
const RIDE_DURATION_LIMIT_MINUTES = 120;
// Alterado para 100 centavos (R$ 1,00)
const FINE_AMOUNT_CENTS_PER_HOUR = 100; 

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${Deno.env.get('SERVICE_ROLE_KEY')}` } } }
    );

    // 1. Encontrar corridas ativas que excederam o tempo limite
    const timeLimit = new Date(Date.now() - RIDE_DURATION_LIMIT_MINUTES * 60 * 1000);
    const { data: overdueRides, error: ridesError } = await supabase
      .from('rides')
      .select(`
        id,
        user_id,
        started_at, // Precisamos do tempo de início para calcular as horas
        profiles ( stripe_customer_id )
      `)
      .eq('status', 'active')
      .lt('started_at', timeLimit.toISOString());

    if (ridesError) throw ridesError;
    if (!overdueRides || overdueRides.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma corrida atrasada encontrada." }), { status: 200 });
    }

    // 2. Processar cada corrida atrasada
    for (const ride of overdueRides) {
      const customerId = ride.profiles?.stripe_customer_id;
      if (!customerId) {
        console.error(`Usuário ${ride.user_id} da corrida ${ride.id} não possui um stripe_customer_id.`);
        continue;
      }

      try {
        // --- LÓGICA DE CÁLCULO DA MULTA ---
        const startTime = new Date(ride.started_at).getTime();
        const now = Date.now();
        const elapsedMilliseconds = now - startTime;
        const hoursOverdue = Math.floor(elapsedMilliseconds / (1000 * 60 * 60));
        const totalFineAmount = hoursOverdue * FINE_AMOUNT_CENTS_PER_HOUR;

        // Só cobra se o valor for maior que zero
        if (totalFineAmount <= 0) {
            continue;
        }

        const customer = await stripe.customers.retrieve(customerId, { expand: ['invoice_settings.default_payment_method'] });
        const paymentMethodId = customer.invoice_settings?.default_payment_method?.id;

        if (!paymentMethodId) {
          throw new Error('Nenhum método de pagamento padrão encontrado para o cliente.');
        }
        
        const paymentIntent = await stripe.paymentIntents.create({
          amount: totalFineAmount,
          currency: 'brl',
          customer: customerId,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
        });

        await supabase.from('transactions').insert({
          user_id: ride.user_id,
          ride_id: ride.id,
          amount: totalFineAmount,
          status: 'succeeded',
          stripe_charge_id: paymentIntent.id,
        });

      } catch (paymentError) {
        console.error(`Falha ao cobrar multa da corrida ${ride.id}:`, paymentError.message);
        await supabase.from('transactions').insert({
          user_id: ride.user_id,
          ride_id: ride.id,
          amount: 0,
          status: 'failed',
          error_message: paymentError.message,
        });
      }
    }

    return new Response(JSON.stringify({ message: `${overdueRides.length} corridas atrasadas processadas.` }), {
      status: 200,
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});