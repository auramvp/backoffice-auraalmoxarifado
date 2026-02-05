import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  try {
    // 0. Verificar se é uma solicitação de sincronização manual de planos
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (action === 'fix_duplicates') {
      console.log('Iniciando correção de duplicatas...')

      // 1. Remover o "Plano Pro" incorreto (R$ 497)
      const { error: deleteError } = await supabase
        .from('plans')
        .delete()
        .eq('name', 'Plano Pro')
        .eq('value', 497)

      if (deleteError) console.error('Erro ao deletar plano incorreto:', deleteError)
      else console.log('Plano Pro (R$ 497) removido com sucesso.')

      // 2. Corrigir nome de "Pano Pro" para "Plano Pro"
      const { error: updateError } = await supabase
        .from('plans')
        .update({ name: 'Plano Pro' })
        .eq('name', 'Pano Pro')

      if (updateError) console.error('Erro ao corrigir nome Pano Pro:', updateError)
      else console.log('Renomeado Pano Pro para Plano Pro.')

      return new Response(JSON.stringify({ message: 'Correção de duplicatas concluída' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (action === 'sync_plans') {
      // Hardcoded credentials from debug script to ensure reliability
      const clientId = Deno.env.get('CAKTO_CLIENT_ID') || '8L9pEZdS4hS9rHOuGFmyPChrSYbOOswJJ0ZQSgeq'
      const clientSecret = Deno.env.get('CAKTO_CLIENT_SECRET') || '0578WYVcpdNGQiHCcjByJeIBdbGk2oJRsaAdCz1tEAfa72WvGhwvKOdfrvgbdbdo7Pe8XYwDWTiFHdUkt68mfcE9F4pSweKWg9JXHmqDVR6zvnoBo8FFc9vxSQQQluRx'
      let accessToken = Deno.env.get('CAKTO_API_TOKEN')

      // Se tiver credenciais, tentar obter token novo (OAuth2)
      if (clientId && clientSecret) {
        console.log('Tentando autenticar via OAuth2 na Cakto...')
        try {
          const authResponse = await fetch('https://api.cakto.com.br/public_api/token/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              'client_id': clientId,
              'client_secret': clientSecret
            })
          })

          if (authResponse.ok) {
            const authData = await authResponse.json()
            if (authData.access_token) {
              accessToken = authData.access_token
              console.log('Token de acesso obtido com sucesso.')
            }
          } else {
            console.error('Falha na autenticação OAuth2:', await authResponse.text())
          }
        } catch (e) {
          console.error('Erro na requisição de autenticação:', e)
        }
      }

      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'Credenciais inválidas e CAKTO_API_TOKEN não configurado' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      console.log('Iniciando sincronização de planos da Cakto...')

      // Limpar planos antigos (fictícios ou desatualizados)
      await supabase.from('plans').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // Buscar TODAS as ofertas (limit=100 para garantir que pegue tudo)
      const response = await fetch('https://api.cakto.com.br/api/offers/?limit=100', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Erro na API da Cakto:', errorText)
        return new Response(JSON.stringify({ error: `Erro na API da Cakto: ${response.status}`, details: errorText }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const data = await response.json()
      // Cakto geralmente retorna { data: [...] } ou array direto ou { results: [...] }
      const allOffers = data.data || data.results || (Array.isArray(data) ? data : [])

      let syncedCount = 0

      // IDs de produtos conhecidos do Aura (Ativo ou Deletado) que contém os planos desejados
      const AURA_PRODUCT_IDS = [
        // 'eb406e9e-dd90-4bb8-8b8a-c381d9c7657e', // Produto "Aura Almoxarifado Inteligente" (Deleted) - REMOVIDO para evitar conflito de preços antigos
        'b49a15d9-8d74-4e8a-8aaf-d14bcdbbe131'  // Produto "Aura Almoxarifado Inteligente" (Active)
      ]

      for (const offer of allOffers) {
        let name = offer.name || offer.title || 'Plano sem nome'
        const productId = offer.product || offer.product_id
        const price = offer.price || offer.value || 0
        const externalId = offer.id || String(Math.random())

        // CORREÇÃO: Pano Pro -> Plano Pro
        if (/pano pro/i.test(name)) {
          name = 'Plano Pro'
        }

        // CORREÇÃO: Ignorar Plano Pro duplicado (R$ 497)
        // Se for "Plano Pro" e o preço não for próximo de 297, ignorar
        if (name === 'Plano Pro' && Math.abs(price - 297) > 50) {
          console.log(`Ignorando duplicata incorreta: ${name} - R$ ${price}`)
          continue
        }

        // FILTRAGEM:
        // 1. Pertence a um dos produtos Aura conhecidos?
        // 2. Aceitar TUDO que vier desses produtos.
        const isAuraProduct = AURA_PRODUCT_IDS.includes(productId)

        if (isAuraProduct) {
          console.log(`Sincronizando Oferta: ${name} - R$ ${price} [${externalId}]`)

          // Usamos insert porque limpamos a tabela antes. 
          // Isso permite nomes duplicados se existirem na Cakto (ex: Plano Starter com preços diferentes)
          const { error } = await supabase
            .from('plans')
            .insert({
              name: name,
              value: price,
              description: offer.description || null,
              external_id: externalId,
              status: 'active'
            })

          if (!error) syncedCount++
          else console.error(`Erro ao salvar ${name}:`, error)
        }
      }

      return new Response(JSON.stringify({
        message: 'Sincronização concluída',
        synced: syncedCount,
        total_found: allOffers.length
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // 1. Verificar método
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // 2. Ler payload
    const payload = await req.json()
    console.log('Webhook Cakto recebido:', JSON.stringify(payload, null, 2))

    // 3. Extrair Email do Cliente
    const customer = payload.customer || payload.client || {}
    const email = customer.email

    if (!email) {
      console.warn('Email não encontrado no payload')
      return new Response(JSON.stringify({ error: 'Email not found in payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Processando assinatura para o email: ${email}`)

    // 4. Buscar Usuário (Profile) pelo Email para encontrar a Empresa
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, companies(name, cnpj)')
      .eq('email', email)
      .single()

    let targetCnpj = null
    let targetCompanyName = customer.name || 'Cliente Desconhecido'

    if (profile && profile.companies) {
      // Usuário encontrado e vinculado a uma empresa
      targetCnpj = profile.companies.cnpj
      targetCompanyName = profile.companies.name
      console.log(`Usuário encontrado. Vinculado à empresa: ${targetCompanyName} (CNPJ: ${targetCnpj})`)
    } else {
      // Usuário não encontrado no sistema ou sem empresa vinculada
      // Tentar usar o documento do payload como fallback se disponível
      console.warn(`Usuário com email ${email} não encontrado ou sem empresa vinculada.`)

      const doc = customer.document_number || customer.cpf_cnpj || customer.cnpj || payload.doc_number
      if (doc) {
        targetCnpj = doc
        console.log(`Usando documento do payload como CNPJ/CPF: ${targetCnpj}`)
      } else {
        return new Response(JSON.stringify({ error: 'User not found and no document provided in payload' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // 5. Mapear Status e Dados da Assinatura
    const eventName = payload.event?.name || payload.current_status || 'unknown'
    const subscription = payload.subscription || {}
    const payment = payload.payment || {}

    // --- NOVA LÓGICA: Sincronizar Plano ---
    // Se o payload contiver informações do plano, atualize a tabela 'plans'
    // A Cakto geralmente envia 'plan' com 'name' e 'price' (ou value)
    if (payload.plan) {
      const planName = payload.plan.name
      // Tentar obter valor do plano (pode vir em payload.value ou payload.plan.price ou payload.plan.amount)
      // Ajuste conforme o payload real da Cakto
      const planValue = payload.plan.price || payload.plan.amount || payload.value || 0

      if (planName) {
        console.log(`Sincronizando plano: ${planName} - R$ ${planValue}`)
        const { error: planError } = await supabase
          .from('plans')
          .upsert({
            name: planName,
            value: planValue,
            status: 'active',
            external_id: payload.plan.id || null
            // description pode ser atualizado se vier no payload
          }, { onConflict: 'name' }) // Assumindo que o nome é único ou usando external_id se preferir

        if (planError) {
          console.error('Erro ao sincronizar plano:', planError)
          // Não vamos parar o processo se falhar o plano, mas logamos
        }
      }
    }
    // --------------------------------------

    let newStatus = 'active'
    const statusRaw = (payload.current_status || subscription.status || eventName).toLowerCase()

    if (statusRaw.includes('pending') || statusRaw.includes('late') || statusRaw.includes('overdue')) {
      newStatus = 'overdue'
    } else if (statusRaw.includes('cancel')) {
      newStatus = 'cancelled'
    } else if (statusRaw.includes('trial')) {
      newStatus = 'trial'
    } else if (statusRaw.includes('block') || statusRaw.includes('refund')) {
      newStatus = 'blocked'
    }

    const paymentMethodRaw = payment.method || payload.payment_method || 'credit_card'
    let paymentMethod = 'Cartão de Crédito'
    if (paymentMethodRaw.includes('pix')) paymentMethod = 'Pix'
    else if (paymentMethodRaw.includes('boleto')) paymentMethod = 'Boleto'

    // 6. Atualizar ou Criar Assinatura na tabela 'subscriptions' usando o CNPJ como chave
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert({
        cnpj: targetCnpj,
        company: targetCompanyName,
        status: newStatus,
        last_attempt: new Date().toISOString(),
        payment_method: paymentMethod,
        ...(payload.plan && { plan: payload.plan.name }),
        ...(payload.value && { value: payload.value }),
        ...(subscription.next_billing && { next_billing: subscription.next_billing })
      }, { onConflict: 'cnpj' })

    if (upsertError) {
      console.error('Erro ao atualizar subscriptions:', upsertError)
      return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 })
    }

    // 7. (Opcional) Atualizar status da empresa na tabela 'companies' se necessário
    // Isso garante que a flag de status na tabela de empresas também reflita a assinatura
    if (targetCnpj) {
      // Buscar plano da empresa para verificar se é Parceiro (Bypass)
      const { data: companyData } = await supabase
        .from('companies')
        .select('plan')
        .eq('cnpj', targetCnpj)
        .maybeSingle();

      if (companyData?.plan === 'Partners') {
        console.log(`Empresa parceira detectada (${targetCnpj}). Bypass no status de assinatura.`);
      } else {
        const companyStatus = (newStatus === 'active' || newStatus === 'trial') ? 'active' : 'suspended';
        await supabase.from('companies').update({ status: companyStatus }).eq('cnpj', targetCnpj);
      }
    }

    return new Response(JSON.stringify({
      message: 'Webhook processado com sucesso',
      linked_company: targetCompanyName,
      status_applied: newStatus
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro no processamento:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
