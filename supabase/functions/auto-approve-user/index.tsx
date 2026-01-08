// supabase/functions/auto-approve-user/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Função 'auto-approve-user' invocada.");

    const payload = await req.json();
    console.log("Payload recebido do webhook:", JSON.stringify(payload, null, 2));

    const newProfile = payload.record;

    if (!newProfile) {
      throw new Error("O objeto 'record' não foi encontrado no payload do webhook.");
    }
    
    // Log para verificar o status recebido
    console.log(`Verificando perfil ID: ${newProfile.id}. Status recebido: '${newProfile.status}'`);

    // Criamos um cliente admin para ter permissão de escrita.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Apenas atualiza se o status for 'pending_approval'.
    if (newProfile.status === 'pending_approval') {
      console.log(`Status é 'pending_approval'. Tentando atualizar para 'approved'...`);
      
      const { data, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ status: 'approved' })
        .eq('id', newProfile.id)
        .select() // Adicionado .select() para confirmar que a linha foi alterada.

      if (updateError) {
        console.error("Erro ao atualizar o perfil:", updateError);
        throw updateError;
      }

      console.log("Sucesso! Perfil atualizado:", JSON.stringify(data, null, 2));
      return new Response(JSON.stringify({ message: `Usuário ${newProfile.id} aprovado automaticamente.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log("Nenhuma ação necessária. O status não era 'pending_approval'.");
    return new Response(JSON.stringify({ message: 'Nenhuma ação necessária.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

  } catch (error) {
    console.error("Erro fatal na função:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})