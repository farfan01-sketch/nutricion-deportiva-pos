import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { shiftId } = await req.json()

    // 1. Inicializar Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Obtener datos del turno
    const { data: shift, error: shiftError } = await supabaseAdmin
      .from('shifts')
      .select(`
        *,
        user:users(name),
        register:cash_registers(name)
      `)
      .eq('id', shiftId)
      .single()

    if (shiftError || !shift) throw new Error('Shift not found')

    // 3. Obtener correos de notificación activos
    const { data: emails, error: emailsError } = await supabaseAdmin
      .from('notification_emails')
      .select('email')
      .eq('enabled', true)

    if (emailsError || !emails || emails.length === 0) {
      return new Response(JSON.stringify({ message: 'No active notification emails found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const recipientEmails = emails.map(e => e.email)

    // 4. Formatear el reporte (HTML)
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0f172a; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">Reporte de Corte de Caja</h1>
          <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.8;">Nutrición Deportiva POS</p>
        </div>
        
        <div style="padding: 24px; background-color: white;">
          <div style="margin-bottom: 24px; display: grid; grid-template-cols: 1fr 1fr; gap: 16px;">
            <div>
              <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Cajero</p>
              <p style="margin: 4px 0 0; font-weight: bold;">${shift.user?.name || 'Sistema'}</p>
            </div>
            <div>
              <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Caja</p>
              <p style="margin: 4px 0 0; font-weight: bold;">${shift.register?.name || 'Principal'}</p>
            </div>
          </div>

          <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b;">Apertura:</span>
              <span>${new Date(shift.opened_at).toLocaleString('es-MX')}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Cierre:</span>
              <span>${new Date(shift.closed_at).toLocaleString('es-MX')}</span>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; color: #64748b;">Fondo Inicial</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold;">${formatCurrency(shift.opening_cash)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; color: #64748b;">Ventas Totales</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #2563eb;">${formatCurrency(shift.total_sales)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; color: #64748b;">Utilidad Real</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #059669;">${formatCurrency(shift.real_profit)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; color: #64748b;">Gastos</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; color: #dc2626;">${formatCurrency(shift.total_expenses)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; color: #64748b;">Efectivo Esperado</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold;">${formatCurrency(shift.expected_cash)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 12px 0; color: #64748b;">Efectivo Real</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold;">${formatCurrency(shift.closing_cash)}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-weight: bold;">Diferencia</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; color: ${shift.difference >= 0 ? '#059669' : '#dc2626'}">
                ${shift.difference > 0 ? '+' : ''}${formatCurrency(shift.difference)}
              </td>
            </tr>
          </table>

          ${shift.notes ? `
            <div style="padding: 12px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 12px; color: #92400e; font-weight: bold; text-transform: uppercase;">Notas:</p>
              <p style="margin: 4px 0 0; font-size: 14px; color: #78350f;">${shift.notes}</p>
            </div>
          ` : ''}
        </div>
        
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #f1f5f9;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">Este es un correo automático generado por ND POS v2.</p>
        </div>
      </div>
    `

    // 5. Enviar vía Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'ND POS <onboarding@resend.dev>', // Cambiar por dominio verificado en producción
        to: recipientEmails,
        subject: `Corte de Caja - ${shift.user?.name || 'Sistema'} - ${new Date().toLocaleDateString('es-MX')}`,
        html: htmlContent,
      }),
    })

    const resData = await res.json()

    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
