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
                            let selectedCustomer = searchData.data[0]
                            let maxPayments = -1

                            // If multiple found, try to find the one with payments
                            if (searchData.data.length > 1) {
                                console.log(`Múltiplos clientes encontrados para ${customerData.cpfCnpj}. Verificando histórico...`)
                                for (const candidate of searchData.data) {
                                    const payRes = await fetch(`${asaasApiUrl}/payments?customer=${candidate.id}&limit=1`, {
                                        headers: { 'access_token': asaasApiKey }
                                    })
                                    if (payRes.ok) {
                                        const payData = await payRes.json()
                                        if (payData.totalCount > maxPayments) {
                                            maxPayments = payData.totalCount
                                            selectedCustomer = candidate
                                        }
                                    }
                                }
                            }

                            await supabase
                                .from('companies')
                                .update({ asaas_customer_id: selectedCustomer.id })
                                .eq('id', company.id)
                            results.push({ company: company.name, status: 'linked_existing', asaas_id: selectedCustomer.id, payments_found: maxPayments >= 0 ? maxPayments : 'unknown' })
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
            const { companyId } = await req.json().catch(() => ({}))

            let query = supabase.from('companies').select('id, name, cnpj, asaas_customer_id')
            if (companyId) query = query.eq('id', companyId)

            const { data: companies } = await query
            if (!companies) throw new Error('No companies found')

            const results = []

            for (const company of companies) {
                if (!company.cnpj && !company.asaas_customer_id) continue;

                // 1. Find all Asaas customers for this CPF/CNPJ (to handle duplicates/fragmentation)
                let allCustomerIds = []
                const cpfCnpj = (company.cnpj || '').replace(/\D/g, '')

                if (cpfCnpj) {
                    const searchRes = await fetch(`${asaasApiUrl}/customers?cpfCnpj=${cpfCnpj}`, {
                        headers: { 'access_token': asaasApiKey }
                    })
                    if (searchRes.ok) {
                        const searchData = await searchRes.json()
                        allCustomerIds = (searchData.data || []).map((c: any) => c.id)
                    }
                }

                // Add the one already linked if not in list
                if (company.asaas_customer_id && !allCustomerIds.includes(company.asaas_customer_id)) {
                    allCustomerIds.push(company.asaas_customer_id)
                }

                console.log(`Syncing ${allCustomerIds.length} Asaas accounts for company ${company.name}`)
                let companyCount = 0

                for (const customerId of allCustomerIds) {
                    const response = await fetch(`${asaasApiUrl}/payments?customer=${customerId}&limit=100`, {
                        headers: { 'access_token': asaasApiKey }
                    })

                    if (!response.ok) continue
                    const { data: payments } = await response.json()

                    for (const payment of payments) {
                        let status = 'open'
                        if (['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(payment.status)) status = 'paid'
                        if (['OVERDUE'].includes(payment.status)) status = 'overdue'
                        if (['REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'REFUND_IN_PROGRESS'].includes(payment.status)) status = 'refunded'
                        if (['CANCELLED'].includes(payment.status)) status = 'canceled'

                        // Try to find by asaas_id first
                        const { data: existing } = await supabase
                            .from('invoices')
                            .select('id')
                            .eq('asaas_id', payment.id)
                            .limit(1)

                        if (!existing || existing.length === 0) {
                            // Fallback for old ones without asaas_id: check by company, amount and due_date
                            const { data: legacyExisting } = await supabase
                                .from('invoices')
                                .select('id')
                                .eq('company_id', company.id)
                                .eq('amount', payment.value)
                                .eq('due_date', payment.dueDate)
                                .is('asaas_id', null)
                                .limit(1)

                            if (legacyExisting && legacyExisting.length > 0) {
                                await supabase
                                    .from('invoices')
                                    .update({
                                        asaas_id: payment.id,
                                        status: status,
                                        payment_method: payment.billingType === 'PIX' ? 'pix' : payment.billingType === 'BOLETO' ? 'boleto' : 'credit_card'
                                    })
                                    .eq('id', legacyExisting[0].id)
                            } else {
                                const { error: insertError } = await supabase.from('invoices').insert({
                                    company_id: company.id,
                                    asaas_id: payment.id,
                                    amount: payment.value,
                                    status: status,
                                    billing_date: payment.paymentDate || payment.clientPaymentDate || new Date().toISOString(),
                                    due_date: payment.dueDate,
                                    payment_method: payment.billingType === 'PIX' ? 'pix' : payment.billingType === 'BOLETO' ? 'boleto' : 'credit_card',
                                    description: payment.description || 'Assinatura Aura (Sincronizada)',
                                    plan_name: 'Plano Aura'
                                })
                                if (!insertError) companyCount++
                            }
                        } else {
                            await supabase.from('invoices').update({
                                status: status,
                                payment_method: payment.billingType === 'PIX' ? 'pix' : payment.billingType === 'BOLETO' ? 'boleto' : 'credit_card'
                            }).eq('id', existing[0].id)
                        }
                    }
                }
                results.push({ company: company.name, synced: companyCount })
            }

            return new Response(JSON.stringify({ message: 'Sync concluído', results }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (action === 'send_invoice_email') {
            const { invoiceId } = await req.json()
            const { data: invoice } = await supabase.from('invoices').select('asaas_id').eq('id', invoiceId).single()

            if (!invoice?.asaas_id) throw new Error('Invoice not linked to Asaas')

            const response = await fetch(`${asaasApiUrl}/payments/${invoice.asaas_id}/notifications`, {
                method: 'POST',
                headers: { 'access_token': asaasApiKey }
            })

            if (!response.ok) throw new Error(await response.text())

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (action === 'delete_invoice') {
            const { invoiceId } = await req.json()
            const { data: invoice } = await supabase.from('invoices').select('asaas_id').eq('id', invoiceId).single()

            if (invoice?.asaas_id) {
                await fetch(`${asaasApiUrl}/payments/${invoice.asaas_id}`, {
                    method: 'DELETE',
                    headers: { 'access_token': asaasApiKey }
                })
            }

            await supabase.from('invoices').delete().eq('id', invoiceId)

            return new Response(JSON.stringify({ success: true }), {
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
