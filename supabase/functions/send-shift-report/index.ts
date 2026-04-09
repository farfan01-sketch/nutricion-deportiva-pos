import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Headers CORS específicos para el dominio de Vercel y métodos permitidos
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://nutricion-deportiva-pos.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // 1. Manejo de Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    })
  }

  try {
    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Configuración de servidor incompleta');
    }

    if (req.method !== 'POST') {
      throw new Error(`Método ${req.method} no permitido`);
    }

    const { shiftId } = await req.json()
    if (!shiftId) {
      throw new Error('shiftId es requerido');
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: shift, error: shiftError } = await supabaseAdmin
      .from('shifts')
      .select(`
        *,
        user:users(name),
        register:cash_registers(name)
      `)
      .eq('id', shiftId)
      .single()

    if (shiftError || !shift) throw new Error('Turno no encontrado');

    const { data: emails, error: emailsError } = await supabaseAdmin
      .from('notification_emails')
      .select('email')
      .eq('enabled', true)

    if (emailsError) throw new Error('Error al obtener correos');

    if (!emails || emails.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Sin correos configurados' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const recipientEmails = emails.map(e => e.email)
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;">
        <div style="background-color: #0f172a; color: white; padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Corte de Caja</h1>
          <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.7;">Nutrición Deportiva POS v2</p>
        </div>
        <div style="padding: 32px 24px; background-color: white;">
          <div style="margin-bottom: 32px; display: flex; justify-content: space-between;">
            <div style="flex: 1;">
              <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Cajero</p>
              <p style="margin: 4px 0 0; font-size: 16px; font-weight: 600;">${shift.user?.name || 'Sistema'}</p>
            </div>
            <div style="flex: 1; text-align: right;">
              <p style="margin: 0; font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Caja</p>
              <p style="margin: 4px 0 0; font-size: 16px; font-weight: 600;">${shift.register?.name || 'Principal'}</p>
            </div>
          </div>
          <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
              <span style="color: #64748b; font-size: 13px;">Apertura</span>
              <span style="font-weight: 500; font-size: 13px;">${new Date(shift.opened_at).toLocaleString('es-MX')}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b; font-size: 13px;">Cierre</span>
              <span style="font-weight: 500; font-size: 13px;">${new Date(shift.closed_at).toLocaleString('es-MX')}</span>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 14px 0; color: #64748b;">Fondo Inicial</td><td style="padding: 14px 0; text-align: right; font-weight: 600;">${formatCurrency(shift.opening_cash)}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 14px 0; color: #64748b;">Ventas Totales</td><td style="padding: 14px 0; text-align: right; font-weight: 700; color: #2563eb;">${formatCurrency(shift.total_sales)}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 14px 0; color: #64748b;">Utilidad Real</td><td style="padding: 14px 0; text-align: right; font-weight: 700; color: #059669;">${formatCurrency(shift.real_profit)}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 14px 0; color: #64748b;">Gastos</td><td style="padding: 14px 0; text-align: right; font-weight: 600; color: #dc2626;">${formatCurrency(shift.total_expenses)}</td></tr>
            <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 14px 0; color: #64748b;">Efectivo Esperado</td><td style="padding: 14px 0; text-align: right; font-weight: 600;">${formatCurrency(shift.expected_cash)}</td></tr>
            <tr style="border-bottom: 2px solid #0f172a;"><td style="padding: 14px 0; color: #64748b;">Efectivo Real</td><td style="padding: 14px 0; text-align: right; font-weight: 700;">${formatCurrency(shift.closing_cash)}</td></tr>
            <tr><td style="padding: 20px 0 0; font-weight: 800; font-size: 16px;">Diferencia</td><td style="padding: 20px 0 0; text-align: right; font-weight: 800; font-size: 16px; color: ${shift.difference >= 0 ? '#059669' : '#dc2626'}">${shift.difference > 0 ? '+' : ''}${formatCurrency(shift.difference)}</td></tr>
          </table>
          ${shift.notes ? `<div style="padding: 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px;"><p style="margin: 0; font-size: 12px; color: #92400e; font-weight: 700; text-transform: uppercase;">Notas</p><p style="margin: 4px 0 0; font-size: 14px; color: #78350f; line-height: 1.5;">${shift.notes}</p></div>` : ''}
        </div>
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;"><p style="margin: 0; font-size: 12px; color: #94a3b8;">Reporte automático ND POS v2</p></div>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'ND POS <onboarding@resend.dev>',
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
