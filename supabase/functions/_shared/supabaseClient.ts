import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

export const createSupabaseClient = (req: Request) => {
  const authHeader = req.headers.get('Authorization')!

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { 
      global: { headers: { Authorization: authHeader } },
      auth: {
        persistSession: false
      }
    }
  )

  return supabase
}