import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const asaasApiKey = Deno.env.get('ASAAS_API_KEY') || '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmNmNWMyZmE3LTkzZmQtNGQ0MC1hOWVlLTJjNmM3YTA3ZDM3Mzo6JGFhY2hfYzk5NWY0ZTctZjg2Yi00MzAwLWE1ZjgtYWM5ZTVmNzMyYzlj'
const asaasApiUrl = Deno.env.get('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3'

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
            // 1. Buscar empresas sem ID do Asaas
            const { data: companies, error } = await supabase
                .from('companies')
                .select('*')
                .is('asaas_customer_id', null)
                .limit(10) // Processar em lotes para evitar timeouts

            if (error) throw error

            const results = []

            for (const company of companies) {
                // Criar cliente no Asaas
                const customerData = {
                    name: company.name,
                    cpfCnpj: company.cnpj.replace(/\D/g, ''),
                    email: company.email || 'financeiro@' + company.name.toLowerCase().replace(/\s/g, '') + '.com.br', // Fallback
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
                    // Atualizar base local
                    await supabase
                        .from('companies')
                        .update({ asaas_customer_id: data.id })
                        .eq('id', company.id)

                    results.push({ company: company.name, status: 'created', asaas_id: data.id })
                } else {
                    // Se der erro de duplicidade, tentamos buscar pelo CPF/CNPJ
                    const errorText = await response.text()
                    if (errorText.includes('DELETED_CUSTOMER') || errorText.includes('many customers')) {
                        // Lógica de recuperação ou log de erro
                        results.push({ company: company.name, status: 'error', details: errorText })
                    } else {
                        // Tentar buscar cliente existente
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
            }

            return new Response(JSON.stringify({ message: 'Sync concluído', results }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (action === 'get_payment_info') {
            const { customer_id } = await req.json()

            // Buscar assinatura ou cobranças no Asaas
            const response = await fetch(`${asaasApiUrl}/payments?customer=${customer_id}&status=PENDING,OVERDUE`, {
                headers: { 'access_token': asaasApiKey }
            })

            const data = await response.json()

            return new Response(JSON.stringify(data), {
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
