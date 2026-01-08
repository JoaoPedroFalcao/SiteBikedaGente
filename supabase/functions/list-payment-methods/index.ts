import { serve } from 'https://deno.land/std@0.201.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createSupabaseClient } from '../_shared/supabaseClient.ts'

const STRIPE_API_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_API_URL = 'https://api.stripe.com/v1'

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    try {
        const supabase = createSupabaseClient(req)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuário não autenticado.')

        const { data: profile, error: profileError } = await supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).single()
        if (profileError || !profile.stripe_customer_id) {
            return new Response(JSON.stringify([]), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200, })
        }

        const pmRes = await fetch(`${STRIPE_API_URL}/payment_methods?customer=${profile.stripe_customer_id}&type=card`, {
            headers: { 'Authorization': `Bearer ${STRIPE_API_KEY}` },
        });
        const paymentMethods = await pmRes.json();
        if (!pmRes.ok) throw new Error(paymentMethods.error.message);

        const formattedCards = paymentMethods.data.map((pm: any) => ({
            id: pm.id, brand: pm.card?.brand, last4: pm.card?.last4,
            exp_month: pm.card?.exp_month, exp_year: pm.card?.exp_year,
        }));
        return new Response(JSON.stringify(formattedCards), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
    }
})