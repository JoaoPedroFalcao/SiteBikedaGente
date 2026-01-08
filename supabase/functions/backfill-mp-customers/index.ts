import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (_req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const mercadopagoAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!mercadopagoAccessToken) {
      throw new Error("O segredo MERCADOPAGO_ACCESS_TOKEN não foi encontrado.");
    }

    console.log("Buscando perfis sem ID do Mercado Pago...");
    const { data: profiles, error: selectError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .is('mercadopago_customer_id', null);

    if (selectError) {
      console.error("Erro ao buscar perfis:", selectError.message);
      throw selectError;
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum usuário para atualizar." }), {
        headers: { 'Content-Type': 'application/json' }, status: 200
      });
    }
    console.log(`Encontrados ${profiles.length} perfis para atualizar.`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const profile of profiles) {
      try {
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        if (userError) {
          throw new Error(`Não foi possível encontrar o usuário de autenticação para o perfil ${profile.id}: ${userError.message}`);
        }
        
        const userEmail = user.email;
        if (!userEmail) {
          throw new Error(`Usuário ${profile.id} não possui um e-mail cadastrado.`);
        }

        const customerData = {
          email: userEmail,
          description: `Cliente Bike da Gente (migrado) - UID: ${profile.id}`
        };

        const response = await fetch('https://api.mercadopago.com/v1/customers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mercadopagoAccessToken}`
          },
          body: JSON.stringify(customerData)
        });

        const mpData = await response.json();
        if (!response.ok || !mpData.id) {
          throw new Error(`Falha na API do MP para ${userEmail}: ${mpData.message || 'Resposta inválida'}`);
        }
        
        const mercadopagoCustomerId = mpData.id;

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ mercadopago_customer_id: mercadopagoCustomerId })
          .eq('id', profile.id);

        if (updateError) throw updateError;

        console.log(`Sucesso: Cliente criado para o usuário ${profile.id}`);
        successCount++;

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
        console.error(`Erro ao processar o usuário ${profile.id}:`, errorMessage);
        errors.push({ userId: profile.id, error: errorMessage });
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        message: "Processo de backfill concluído.",
        total_profiles_found: profiles.length,
        successful_updates: successCount,
        failed_updates: errorCount,
        errors: errors,
      }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { 'Content-Type': 'application/json' }, status: 500
    });
  }
});