import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
    }

    try {
        const payload = await req.json()
        console.log('Webhook Asaas recebido:', JSON.stringify(payload, null, 2))

        const event = payload.event
        const payment = payload.payment
        const customerId = payment.customer

        // Buscar empresa pelo asaas_customer_id
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('id, cnpj, name')
            .eq('asaas_customer_id', customerId)
            .single()

        if (!company) {
            console.warn(`Empresa não encontrada para customer_id: ${customerId}`)
            // Tentar buscar pelo CPF/CNPJ se disponível no payload (opcional)
            return new Response(JSON.stringify({ received: true, status: 'company_not_found' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        let newStatus = null
        let subscriptionStatus = null

        switch (event) {
            case 'PAYMENT_CONFIRMED':
            case 'PAYMENT_RECEIVED':
                newStatus = 'active' // Empresa ativa
                subscriptionStatus = 'active'
                break
            case 'PAYMENT_OVERDUE':
                newStatus = 'suspended' // Pode decidir suspender ou apenas marcar overdue
                subscriptionStatus = 'overdue'
                break
            case 'PAYMENT_REFUNDED':
                subscriptionStatus = 'refunded'
                break
            // Adicionar outros eventos conforme necessário
        }

        if (newStatus) {
            // Atualizar status da empresa
            await supabase
                .from('companies')
                .update({ status: newStatus === 'active' ? 'Ativo' : 'Suspenso' })
                .eq('id', company.id)
        }

        if (subscriptionStatus) {
            // Atualizar/Criar assinatura
            await supabase
                .from('subscriptions')
                .upsert({
                    cnpj: company.cnpj,
                    company: company.name,
                    status: subscriptionStatus,
                    last_attempt: new Date().toISOString(),
                    payment_method: payment.billingType === 'PIX' ? 'Pix' : payment.billingType === 'BOLETO' ? 'Boleto' : 'Cartão de Crédito',
                    value: payment.value,
                    asaas_subscription_id: payment.subscription || null,
                    next_billing: payment.dueDate
                }, { onConflict: 'cnpj' })
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('Erro no processamento do webhook:', error)
        return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
})
