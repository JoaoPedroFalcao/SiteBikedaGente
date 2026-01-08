// supabase/functions/verify-identity/index.ts
// VERSÃO DE PRODUÇÃO (MODIFICADA: sem verificação de situação cadastral)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { encodeBase64 } from 'https://deno.land/std@0.224.0/encoding/base64.ts'

/**
 * Converte data do Serpro (DDMMAAAA) para o formato do app (AAAA-MM-DD)
 */
function formatSerproDate(dateStrDDMMYYYY: string): string {
  // O formato do Serpro é "15052001" (8 chars)
  if (!dateStrDDMMYYYY || dateStrDDMMYYYY.length !== 8) return '';
  
  const day = dateStrDDMMYYYY.substring(0, 2);
  const month = dateStrDDMMYYYY.substring(2, 4);
  const year = dateStrDDMMYYYY.substring(4, 8);
  
  // Retorna no formato AAAA-MM-DD
  return `${year}-${month}-${day}`;
}

/**
 * Função para normalizar strings para comparação.
 */
function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// --- FUNÇÃO HELPER PARA OBTER O TOKEN DO SERPRO (Está 100% correta) ---
async function getSerproAccessToken() {
  const consumerKey = Deno.env.get('SERPRO_CONSUMER_KEY')
  const consumerSecret = Deno.env.get('SERPRO_CONSUMER_SECRET')
  if (!consumerKey || !consumerSecret) throw new Error('Credenciais do Serpro (KEY ou SECRET) não configuradas.')
  const credentials = encodeBase64(`${consumerKey}:${consumerSecret}`)
  const SERPRO_AUTH_URL = 'https://gateway.apiserpro.serpro.gov.br/token'
  
  const response = await fetch(SERPRO_AUTH_URL, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Falha ao obter token do Serpro:', errorBody)
    throw new Error('Falha na autenticação com o serviço de validação (Token).')
  }
  const data = await response.json()
  return data.access_token
}

// --- FUNÇÃO PRINCIPAL (VERSÃO DE PRODUÇÃO) ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Pega os dados enviados pelo app
    const {
      full_name, cpf, birth_date, // AAAA-MM-DD
      cep, street, number, complement, neighborhood, city, state,
    } = await req.json()

    // 2. Obtém o usuário
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      req.headers.get('Authorization')!.replace('Bearer ', '')
    )
    if (userError || !user) throw new Error('Usuário não autenticado.')

    // 3. OBTÉM O TOKEN DE ACESSO DO SERPRO
    const accessToken = await getSerproAccessToken()
    if (!accessToken) throw new Error("Não foi possível obter o token de acesso do Serpro.")

    // 4. CHAMA A API DE CONSULTA DE CPF (A URL CORRETA!)
    const cpfLimpo = cpf.replace(/\D/g, '');
    const SERPRO_VALIDATION_URL = `https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df/v2/cpf/${cpfLimpo}`
    
    const validationResponse = await fetch(SERPRO_VALIDATION_URL, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    })
    
    if (!validationResponse.ok) {
       const errorText = await validationResponse.text();
       console.error("Erro na consulta do Serpro:", errorText)
       throw new Error(`Erro do Serpro: ${errorText}`)
    }

    const serproData = await validationResponse.json()
    
    // 5. VALIDAÇÃO DOS DADOS
    
    // 5a. Valida a Situação Cadastral (REMOVIDO CONFORME SOLICITADO)
    /* if (serproData?.situacao?.descricao.toUpperCase() !== 'REGULAR') {
      throw new Error(`Seu CPF não está com a situação "REGULAR". (Situação atual: ${serproData?.situacao?.descricao})`)
    }
    */

    // 5b. Valida o Nome
    if (normalizeString(full_name) !== normalizeString(serproData.nome)) {
      throw new Error(`O nome informado não confere com o registrado no CPF.`)
    }
    
    // 5c. Valida a Data de Nascimento
    const dataNascSerproFormatada = formatSerproDate(serproData.nascimento)
    if (birth_date !== dataNascSerproFormatada) {
      throw new Error(`A data de nascimento não confere com a registrada no CPF.`)
    }

    // 6. SE TUDO ESTIVER CORRETO, ATUALIZA O PERFIL
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name, 
        cpf: cpfLimpo,
        birth_date, 
        cep: cep.replace(/\D/g, ''),
        street, 
        number, 
        complement, 
        neighborhood, 
        city, 
        state,
        status: 'approved', // <<< APROVADO!
        is_identity_verified: true, // <<< VERIFICADO!
      })
      .eq('id', user.id)

    if (updateError) {
      console.error("Erro ao salvar dados no perfil:", updateError)
      throw new Error(`Erro ao salvar seus dados: ${updateError.message}`)
    }

    // 7. Retorna sucesso para o app
    return new Response(JSON.stringify({ success: true, message: "Dados validados com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // Se qualquer etapa falhar (Serpro, Supabase, etc.), retorna o erro para o app
    console.error("Erro na função verify-identity:", error.message)
    // Envia a mensagem de erro específica (ex: "Nome não confere...") para o app
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Erro de validação que o app pode exibir
    })
  }
})