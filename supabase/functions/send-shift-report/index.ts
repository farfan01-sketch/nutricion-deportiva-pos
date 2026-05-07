import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { shiftId } = await req.json();

    if (!shiftId) {
      return new Response(
        JSON.stringify({ success: false, error: "shiftId es requerido" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: shift, error: shiftError } = await supabaseAdmin
      .from("shifts")
      .select(`
        *,
        user:users(name),
        register:cash_registers(name)
      `)
      .eq("id", shiftId)
      .single();

    if (shiftError || !shift) {
      return new Response(
        JSON.stringify({ success: false, error: "Turno no encontrado", detail: shiftError }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: emails, error: emailsError } = await supabaseAdmin
      .from("notification_emails")
      .select("email")
      .eq("enabled", true);

    if (emailsError) {
      console.error("Error al consultar correos:", emailsError);
    }

    const recipientEmails = (emails || []).map((e) => e.email);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "ND POS <onboarding@resend.dev>";

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(Number(amount || 0));

    const totalReturns =
      Number(shift.cash_returns || 0) +
      Number(shift.card_returns || 0) +
      Number(shift.transfer_returns || 0);

    const subject = `Corte de Caja | ${shift.register?.name || "Caja Principal"} | ${new Date(
      shift.closed_at || new Date(),
    ).toLocaleDateString("es-MX")}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Corte de Caja</h2>
        <p><strong>Cajero:</strong> ${shift.user?.name || "Sistema"}</p>
        <p><strong>Caja:</strong> ${shift.register?.name || "Caja Principal"}</p>
        <p><strong>Fecha:</strong> ${new Date(shift.closed_at || new Date()).toLocaleString("es-MX")}</p>
        <hr />
        <p><strong>Ventas Totales:</strong> ${formatCurrency(shift.total_sales)}</p>
        <p><strong>Utilidad Real:</strong> ${formatCurrency(shift.real_profit)}</p>
        <p><strong>Gastos:</strong> ${formatCurrency(shift.total_expenses)}</p>
        <p><strong>Devoluciones:</strong> ${formatCurrency(totalReturns)}</p>
        <p><strong>Efectivo Esperado:</strong> ${formatCurrency(shift.expected_cash)}</p>
        <p><strong>Efectivo Real:</strong> ${formatCurrency(shift.closing_cash)}</p>
        <p><strong>Diferencia:</strong> ${formatCurrency(shift.difference)}</p>
      </div>
    `;

    let emailResult: any = null;

    if (recipientEmails.length > 0 && RESEND_API_KEY) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: recipientEmails,
            subject,
            html,
          }),
        });

        emailResult = await emailRes.json();
      } catch (err: any) {
        console.error("Error enviando email:", err);
        emailResult = { error: err.message };
      }
    }

    // WhatsApp Evolution API
    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    const adminWhatsapp = Deno.env.get("ADMIN_WHATSAPP");

    let whatsappResult: any = null;

    if (evolutionUrl && evolutionInstance && evolutionApiKey && adminWhatsapp) {
      const mensaje = `📊 CORTE DE CAJA

👤 Usuario: ${shift.user?.name || "N/A"}
🏪 Caja: ${shift.register?.name || "Caja Principal"}

💰 Ventas: ${formatCurrency(shift.total_sales)}
📈 Utilidad: ${formatCurrency(shift.real_profit)}
💸 Gastos: ${formatCurrency(shift.total_expenses)}
🔁 Devoluciones: ${formatCurrency(totalReturns)}

💵 Esperado: ${formatCurrency(shift.expected_cash)}
💵 Real: ${formatCurrency(shift.closing_cash)}
⚖️ Diferencia: ${formatCurrency(shift.difference)}`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const waRes = await fetch(
          `${evolutionUrl}/message/sendText/${evolutionInstance}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": evolutionApiKey,
            },
            body: JSON.stringify({
              number: adminWhatsapp,
              text: mensaje,
            }),
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        const waData = await waRes.json();
        // Agregamos status "sent" si la respuesta es exitosa para que el cliente lo reconozca
        whatsappResult = { ...waData, status: waRes.ok ? "sent" : "error" };
        
        if (!waRes.ok) {
          console.error("Error al enviar WhatsApp vía Evolution API:", waData);
        }
      } catch (waError: any) {
        console.error("Excepción al intentar enviar WhatsApp:", waError);
        whatsappResult = { status: "error", error: waError.message };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailResult,
        whatsappResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Exception in Edge Function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
