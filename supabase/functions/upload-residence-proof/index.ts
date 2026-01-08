import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decode } from 'https://deno.land/std@0.203.0/encoding/base64.ts'

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, base64Image, fileExt } = await req.json();
    if (!userId || !base64Image || !fileExt) {
      throw new Error("userId, base64Image e fileExt são obrigatórios.");
    }

    const decodedImage = decode(base64Image);
    const filePath = `${userId}/residence-proof.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('residence-proofs')
      .upload(filePath, decodedImage, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabaseAdmin.storage.from('residence-proofs').getPublicUrl(filePath);

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ residence_proof_url: urlData.publicUrl })
      .eq('id', userId);

    if (updateError) throw updateError;
    
    return new Response(JSON.stringify({ success: true, url: urlData.publicUrl }), {
      headers: { 'Content-Type': 'application/json' }, status: 200
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro na Edge Function 'upload-residence-proof':", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { 'Content-Type': 'application/json' }, status: 500
    });
  }
});