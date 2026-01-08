import { serve } from 'https://deno.land/std@0.201.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders } from '../_shared/cors.ts'

const STRIPE_API_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_API_URL = 'https://api.stripe.com/v1'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const adminSecret = req.headers.get('X-Admin-Secret')
    if (adminSecret !== Deno.env.get('FUNCTION_ADMIN_SECRET')) {
        return new Response(JSON.stringify({ error: 'Não autorizado.' }), { status: 401 })
    }

    // 1. Buscar todos os perfis que NÃO têm um stripe_customer_id
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .is('stripe_customer_id', null)

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum perfil para migrar." }), { status: 200 });
    }

    let successCount = 0;
    let errorCount = 0;

    // 2. Iterar sobre cada perfil
    for (const profile of profiles) {
      try {
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

        if (userError) {
          throw new Error(`Usuário de autenticação não encontrado para o perfil ${profile.id}: ${userError.message}`);
        }
        
        const userEmail = user.email;
        if (!userEmail) {
            console.warn(`Perfil ${profile.id} não possui um e-mail associado. Pulando.`);
            errorCount++;
            continue;
        }

        const customerParams = new URLSearchParams({
          name: profile.full_name || userEmail,
          email: userEmail,
          'metadata[user_id]': profile.id,
        });

        const customerRes = await fetch(`${STRIPE_API_URL}/customers`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${STRIPE_API_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: customerParams.toString(),
        });

        const customer = await customerRes.json();
        if (!customerRes.ok) throw new Error(customer.error.message);
        
        // 3. Atualizar o perfil no Supabase com o novo ID
        await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: customer.id })
          .eq('id', profile.id);
        
        successCount++;
      } catch (e) {
        console.error(`Falha ao migrar o perfil ${profile.id}:`, e.message);
        errorCount++;
      }
    }

    return new Response(JSON.stringify({ 
        message: "Migração concluída.",
        success: successCount,
        failures: errorCount,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})