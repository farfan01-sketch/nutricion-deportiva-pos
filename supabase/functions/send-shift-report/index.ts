import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Headers CORS universales para máxima compatibilidad
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // 1. Manejo de Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { shiftId } = await req.json()
    if (!shiftId) throw new Error('ID de turno (shiftId) es requerido');

    // Inicializar Supabase Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Obtener datos del turno con todos los campos financieros
    const { data: shift, error: shiftError } = await supabaseAdmin
      .from('shifts')
      .select(`
        *,
        user:users(name),
        register:cash_registers(name)
      `)
      .eq('id', shiftId)
      .single()

    if (shiftError || !shift) throw new Error('Turno no encontrado en la base de datos');

    // 3. Obtener correos de notificación activos
    const { data: emails, error: emailsError } = await supabaseAdmin
      .from('notification_emails')
      .select('email')
      .eq('enabled', true)

    if (emailsError) throw new Error('Error al consultar la lista de correos');

    if (!emails || emails.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No hay correos configurados' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const recipientEmails = emails.map(e => e.email)
    
    // 4. Configuración de envío
    const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'ND POS <onboarding@resend.dev>';
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const BUSINESS_NAME = "Nutrición Deportiva";
    
    const dateStr = new Date(shift.closed_at || new Date()).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const subject = `Corte de Caja | ${BUSINESS_NAME} | ${dateStr} | ${shift.register?.name || 'Caja'}`;

    // Helper para moneda
    const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

    // Calcular devoluciones totales
    const totalReturns = (Number(shift.cash_returns) || 0) + 
                         (Number(shift.card_returns) || 0) + 
                         (Number(shift.transfer_returns) || 0);

    // 5. Generar HTML Profesional
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f1f5f9; }
          .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          .header { background-color: #0f172a; color: #ffffff; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
          .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.8; }
          .content { padding: 32px; }
          .section-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
          .info-item label { display: block; font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
          .info-item span { display: block; font-size: 15px; font-weight: 600; color: #1e293b; }
          .stats-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
          .stats-table tr td { padding: 12px 0; border-bottom: 1px solid #f8fafc; font-size: 14px; }
          .stats-table tr.total td { border-bottom: none; padding-top: 20px; font-weight: 800; font-size: 18px; }
          .stats-table .label { color: #64748b; }
          .stats-table .value { text-align: right; font-weight: 600; color: #0f172a; }
          .stats-table .value.positive { color: #059669; }
          .stats-table .value.negative { color: #dc2626; }
          .stats-table .value.highlight { color: #2563eb; }
          .notes-box { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-top: 24px; }
          .notes-box h4 { margin: 0 0 8px; font-size: 12px; color: #92400e; text-transform: uppercase; }
          .notes-box p { margin: 0; font-size: 14px; color: #78350f; }
          .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; }
          .footer p { margin: 0; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reporte de Corte de Caja</h1>
            <p>${BUSINESS_NAME} POS v2</p>
          </div>
          
          <div class="content">
            <div class="section-title">Información General</div>
            <div style="margin-bottom: 32px;">
              <table style="width: 100%;">
                <tr>
                  <td style="width: 50%;">
                    <div class="info-item">
                      <label>Cajero</label>
                      <span>${shift.user?.name || 'No especificado'}</span>
                    </div>
                  </td>
                  <td style="width: 50%; text-align: right;">
                    <div class="info-item">
                      <label>Caja / Terminal</label>
                      <span>${shift.register?.name || 'Principal'}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 16px;">
                    <div class="info-item">
                      <label>Fecha de Corte</label>
                      <span>${dateStr}</span>
                    </div>
                  </td>
                  <td style="padding-top: 16px; text-align: right;">
                    <div class="info-item">
                      <label>Hora de Cierre</label>
                      <span>${new Date(shift.closed_at).toLocaleTimeString('es-MX')}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </div>

            <div class="section-title">Resumen Financiero</div>
            <table class="stats-table">
              <tr>
                <td class="label">Ventas Totales</td>
                <td class="value highlight">${formatCurrency(shift.total_sales)}</td>
              </tr>
              <tr>
                <td class="label">Utilidad Real del Turno</td>
                <td class="value positive">${formatCurrency(shift.real_profit)}</td>
              </tr>
              <tr>
                <td class="label">Gastos Registrados</td>
                <td class="value negative">${formatCurrency(shift.total_expenses)}</td>
              </tr>
              <tr>
                <td class="label">Devoluciones</td>
                <td class="value negative">${formatCurrency(totalReturns)}</td>
              </tr>
              <tr>
                <td class="label">Efectivo Esperado</td>
                <td class="value">${formatCurrency(shift.expected_cash)}</td>
              </tr>
              <tr>
                <td class="label">Efectivo Real en Caja</td>
                <td class="value">${formatCurrency(shift.closing_cash)}</td>
              </tr>
              <tr class="total">
                <td class="label">Diferencia</td>
                <td class="value ${shift.difference >= 0 ? 'positive' : 'negative'}">
                  ${shift.difference > 0 ? '+' : ''}${formatCurrency(shift.difference)}
                </td>
              </tr>
            </table>

            ${shift.notes ? `
              <div class="notes-box">
                <h4>Observaciones</h4>
                <p>${shift.notes}</p>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>Este es un reporte automático generado por el sistema de punto de venta.</p>
            <p style="margin-top: 4px;">&copy; ${new Date().getFullYear()} ${BUSINESS_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 6. Enviar vía Resend
    let resData;
    let status = 'success';
    let errorMessage = null;
    let resendId = null;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: recipientEmails,
          subject: subject,
          html: htmlContent,
          // Estructura preparada para PDF en el futuro
          // attachments: [] 
        }),
      });

      resData = await res.json();
      
      if (!res.ok) {
        throw new Error(resData.message || 'Error al enviar correo vía Resend');
      }
      
      resendId = resData.id;
    } catch (err: any) {
      status = 'error';
      errorMessage = err.message;
      console.error('Error sending email:', err);
    }

    // 7. Registrar en logs (Historial de envíos)
    try {
      await supabaseAdmin
        .from('shift_email_logs')
        .insert([{
          shift_id: shiftId,
          recipients: recipientEmails,
          subject: subject,
          status: status,
          error_message: errorMessage,
          resend_id: resendId
        }]);
    } catch (logError) {
      console.error('Error logging email delivery:', logError);
      // No lanzamos error aquí para no romper la respuesta principal
    }

    return new Response(JSON.stringify({ 
      success: status === 'success', 
      message: status === 'success' ? 'Correo enviado correctamente' : errorMessage,
      resendData: resData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
