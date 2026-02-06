import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteRequest {
    email: string
    name: string
    inviteLink: string
}

const htmlTemplate = (link: string, name: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F172A; color: #ffffff; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #1E293B; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
    .header { background: linear-gradient(135deg, #2563EB 0%, #4F46E5 100%); padding: 32px; text-align: center; }
    .logo { font-size: 24px; font-weight: 800; color: white; letter-spacing: -0.025em; text-transform: uppercase; font-style: italic; }
    .content { padding: 40px 32px; text-align: center; }
    .title { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #F8FAFC; }
    .text { color: #94A3B8; font-size: 16px; line-height: 24px; margin-bottom: 32px; }
    .button { display: inline-block; background: linear-gradient(to right, #2563EB, #4F46E5); color: white; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; transition: all 0.2s; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3); }
    .footer { padding: 32px; text-align: center; color: #64748B; font-size: 12px; border-top: 1px solid #334155; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">AURA PARTNERS</div>
      </div>
      <div class="content">
        <h1 class="title">Bem-vindo ao Aura Partners!</h1>
        <p class="text">
          Olá, <strong>${name}</strong>!<br><br>
          Sua empresa foi convidada para fazer parte do nosso ecossistema de parceiros exclusivos.
          Para ativar sua conta e acessar seu painel, clique no botão abaixo.
        </p>
        <a href="${link}" class="button">Aceitar Convite</a>
        <p class="text" style="font-size: 14px; margin-top: 32px;">
          Se o botão não funcionar, copie e cole este link no seu navegador:<br>
          <span style="color: #3B82F6;">${link}</span>
        </p>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Aura Almoxarifado Inteligente.<br>
        Todos os direitos reservados.
      </div>
    </div>
  </div>
</body>
</html>
`

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { email, name, inviteLink }: InviteRequest = await req.json()

        if (!email || !inviteLink) {
            throw new Error('Email and inviteLink are required')
        }

        if (!RESEND_API_KEY) {
            console.error('RESEND_API_KEY is not set')
            throw new Error('Server configuration error')
        }

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'Aura Partners <onboarding@resend.dev>', // Update this if user has a custom domain
                to: email,
                subject: 'Convite para Aura Partners',
                html: htmlTemplate(inviteLink, name || 'Parceiro'),
            }),
        })

        const data = await res.json()

        if (!res.ok) {
            console.error('Resend API Error:', data)
            throw new Error(data.message || 'Failed to send email')
        }

        return new Response(
            JSON.stringify({ message: 'Email sent successfully', id: data.id }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
