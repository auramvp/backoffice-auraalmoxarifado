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

        if (!payment) {
            console.log(`Evento ${event} recebido sem objeto 'payment'. Ignorando processamento detalhado.`)
            return new Response(JSON.stringify({ received: true, status: 'ignored_no_payment' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        const customerId = payment.customer

        // Buscar empresa pelo asaas_customer_id
        let { data: company, error: companyError } = await supabase
            .from('companies')
            .select('id, cnpj, name')
            .eq('asaas_customer_id', customerId)
            .single()

        if (!company) {
            console.log(`Empresa não encontrada pelo asaas_customer_id: ${customerId}. Tentando pelo CNPJ...`)

            // Tentar buscar pelo CPF/CNPJ se disponível no payload
            // O Asaas costuma enviar no objeto payment.customer do payload de webhook APENAS o ID.
            // Para pegar o CNPJ, às vezes precisamos de uma chamada extra ou se vier no description/externalReference.
            // No entanto, vamos ser inteligentes: se não achamos pelo ID, e temos o CNPJ em algum lugar, usamos.

            const cnpjToSearch = payment.externalReference || payment.cpfCnpj; // fallback se o payload tiver

            if (cnpjToSearch) {
                const cleanedCnpj = cnpjToSearch.replace(/\D/g, '')
                const { data: companyByCnpj } = await supabase
                    .from('companies')
                    .select('id, cnpj, name')
                    .eq('cnpj', cleanedCnpj)
                    .single()

                if (companyByCnpj) {
                    company = companyByCnpj
                    console.log(`Empresa encontrada pelo CNPJ (${cleanedCnpj}): ${company.name}. Vinculando asaas_customer_id.`)
                    // Vincular o ID para futuras requisições
                    await supabase
                        .from('companies')
                        .update({ asaas_customer_id: customerId })
                        .eq('id', company.id)
                }
            }
        }

        if (!company) {
            console.warn(`Empresa não encontrada para customer_id: ${customerId} e sem CNPJ disponível para fallback.`)
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
                newStatus = 'active'
                subscriptionStatus = 'active'
                break
            case 'PAYMENT_OVERDUE':
                newStatus = 'suspended'
                subscriptionStatus = 'overdue'
                break
            case 'PAYMENT_REFUNDED':
                subscriptionStatus = 'refunded'
                break
        }

        if (newStatus) {
            await supabase
                .from('companies')
                .update({ status: newStatus === 'active' ? 'Ativo' : 'Suspenso' })
                .eq('id', company.id)
        }

        if (subscriptionStatus) {
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

        if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_CREATED', 'PAYMENT_UPDATED', 'PAYMENT_OVERDUE'].includes(event)) {
            let status = 'open'
            if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event)) status = 'paid'

            const { data: existing } = await supabase
                .from('invoices')
                .select('id')
                .eq('company_id', company.id)
                .eq('due_date', payment.dueDate)
                .eq('amount', payment.value)
                .limit(1)

            if (existing && existing.length > 0) {
                await supabase.from('invoices').update({ status: status }).eq('id', existing[0].id)
                console.log(`Fatura atualizada para ${status}:`, company.name)
            } else {
                const { error: invoiceError } = await supabase
                    .from('invoices')
                    .insert({
                        company_id: company.id,
                        amount: payment.value,
                        status: status,
                        billing_date: payment.paymentDate || new Date().toISOString(),
                        due_date: payment.originalDueDate || payment.dueDate,
                        payment_method: payment.billingType === 'PIX' ? 'pix' : payment.billingType === 'BOLETO' ? 'boleto' : 'credit_card',
                        description: payment.description || 'Assinatura Aura',
                        plan_name: 'Plano Aura'
                    })

                if (invoiceError) {
                    console.error('Erro ao criar fatura:', invoiceError)
                } else {
                    console.log('Fatura criada com sucesso para a empresa:', company.name)
                }
            }
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
})
