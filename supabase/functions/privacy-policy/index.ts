import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (_req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseAdmin.storage
      .from('public-assets')
      .download('politica-de-privacidade.html');

    if (error) {
      throw error;
    }

    return new Response(data, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 200,
    });

  } catch (error) {
    return new Response(String(error?.message ?? error), { status: 500 });
  }
})