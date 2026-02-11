import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const asaasApiKey = Deno.env.get('ASAAS_API_KEY')
const asaasApiUrl = Deno.env.get('ASAAS_API_URL') || 'https://www.asaas.com/api/v3'

const supabase = createClient(supabaseUrl, supabaseKey)

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const action = url.searchParams.get('action')

        if (action === 'sync_customers') {
            const { data: companies, error } = await supabase
                .from('companies')
                .select('*')
                .is('asaas_customer_id', null)
                .limit(20)

            if (error) throw error

            const results = []

            for (const company of companies) {
                const customerData = {
                    name: company.name,
                    cpfCnpj: company.cnpj.replace(/\D/g, ''),
                    email: company.email || `financeiro@${company.name.toLowerCase().replace(/\s/g, '')}.com.br`,
                    externalReference: company.id
                }

                const response = await fetch(`${asaasApiUrl}/customers`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'access_token': asaasApiKey
                    },
                    body: JSON.stringify(customerData)
                })

                if (response.ok) {
                    const data = await response.json()
                    await supabase
                        .from('companies')
                        .update({ asaas_customer_id: data.id })
                        .eq('id', company.id)

                    results.push({ company: company.name, status: 'created', asaas_id: data.id })
                } else {
                    const errorText = await response.text()
                    const searchRes = await fetch(`${asaasApiUrl}/customers?cpfCnpj=${customerData.cpfCnpj}`, {
                        method: 'GET',
                        headers: { 'access_token': asaasApiKey }
                    })

                    if (searchRes.ok) {
                        const searchData = await searchRes.json()
                        if (searchData.data && searchData.data.length > 0) {
                            const existingCustomer = searchData.data[0]
                            await supabase
                                .from('companies')
                                .update({ asaas_customer_id: existingCustomer.id })
                                .eq('id', company.id)
                            results.push({ company: company.name, status: 'linked_existing', asaas_id: existingCustomer.id })
                        } else {
                            results.push({ company: company.name, status: 'error', details: errorText })
                        }
                    } else {
                        results.push({ company: company.name, status: 'error', details: errorText })
                    }
                }
            }

            return new Response(JSON.stringify({ message: 'Sync de clientes concluído', results }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (action === 'sync_financials') {
            const { data: companies, error } = await supabase
                .from('companies')
                .select('id, asaas_customer_id, name')
                .not('asaas_customer_id', 'is', null)

            if (error) throw error

            const results = []

            for (const company of companies) {
                console.log(`Buscando pagamentos para: ${company.name} (${company.asaas_customer_id})`)
                const response = await fetch(`${asaasApiUrl}/payments?customer=${company.asaas_customer_id}&limit=50`, {
                    headers: { 'access_token': asaasApiKey }
                })

                if (response.ok) {
                    const data = await response.json()
                    const payments = data.data || []
                    let count = 0

                    for (const payment of payments) {
                        let status = 'open'
                        if (['CONFIRMED', 'RECEIVED'].includes(payment.status)) status = 'paid'
                        if (['OVERDUE'].includes(payment.status)) status = 'overdue'

                        // Simple de-duplication: check by company_id, amount and due_date
                        const { data: existing } = await supabase
                            .from('invoices')
                            .select('id')
                            .eq('company_id', company.id)
                            .eq('amount', payment.value)
                            .eq('due_date', payment.dueDate)
                            .limit(1)

                        if (!existing || existing.length === 0) {
                            const { error: insertError } = await supabase.from('invoices').insert({
                                company_id: company.id,
                                amount: payment.value,
                                status: status,
                                billing_date: payment.paymentDate || payment.clientPaymentDate || new Date().toISOString(),
                                due_date: payment.dueDate,
                                payment_method: payment.billingType === 'PIX' ? 'pix' : payment.billingType === 'BOLETO' ? 'boleto' : 'credit_card',
                                description: payment.description || 'Assinatura Aura (Sincronizada)',
                                plan_name: 'Plano Aura'
                            })

                            if (insertError) {
                                console.error(`Erro ao inserir fatura para ${company.name}:`, insertError)
                            } else {
                                count++
                            }
                        } else {
                            await supabase.from('invoices').update({ status: status }).eq('id', existing[0].id)
                        }
                    }
                    results.push({ company: company.name, synced: count })
                } else {
                    const errorMsg = await response.text()
                    results.push({ company: company.name, error: 'Failed to fetch payments', details: errorMsg })
                }
            }

            return new Response(JSON.stringify({ message: 'Sync financeiro concluído', results }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ error: 'Action not found' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
