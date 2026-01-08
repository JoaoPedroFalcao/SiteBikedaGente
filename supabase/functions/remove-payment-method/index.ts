import { serve } from 'https://deno.land/std@0.201.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/supabaseClient.ts'

const STRIPE_API_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_API_URL = 'https://api.stripe.com/v1'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { payment_method_id } = await req.json()
    if (!payment_method_id) throw new Error('ID do método de pagamento é obrigatório.')

    const supabase = createSupabaseClient(req)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuário não autenticado.')

    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
    if (!profile?.stripe_customer_id) throw new Error('Cliente Stripe não encontrado.')
    
    const pmListRes = await fetch(`${STRIPE_API_URL}/payment_methods?customer=${profile.stripe_customer_id}&type=card`, {
        headers: { 'Authorization': `Bearer ${STRIPE_API_KEY}` },
    });
    const paymentMethods = await pmListRes.json();
    if (!pmListRes.ok) throw new Error(paymentMethods.error.message);

    if (paymentMethods.data.length <= 1) {
      throw new Error('Você deve manter pelo menos um cartão cadastrado para remover outro.')
    }

    const detachRes = await fetch(`${STRIPE_API_URL}/payment_methods/${payment_method_id}/detach`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${STRIPE_API_KEY}` },
    });
    const detachResult = await detachRes.json();
    if (!detachRes.ok) throw new Error(detachResult.error.message);
    
    return new Response(JSON.stringify({ success: true, message: 'Cartão removido com sucesso.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})