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
    const body = await req.json();
    const { 
      type,
      clientPhone,
      clientMessage,
      adminMessage,
      
      orderId, 
      customerName, 
      customerPhone, 
      customerAddress, 
      items, 
      total 
    } = body;

    const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    const adminWhatsapp = Deno.env.get("ADMIN_WHATSAPP");

    if (!evolutionUrl || !evolutionInstance || !evolutionApiKey || !adminWhatsapp) {
      console.error("Faltan variables de entorno de Evolution API");
      return new Response(
        JSON.stringify({ success: false, error: "Configuración incompleta" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const formatPhoneNumber = (phone: string) => {
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.length === 10) {
        return "521" + cleaned;
      }
      if (cleaned.startsWith("52") && cleaned.length === 12) {
        return "521" + cleaned.substring(2);
      }
      if (cleaned.startsWith("52") && cleaned.length === 13 && cleaned[3] === '1') {
        return cleaned; 
      }
      return cleaned;
    };

    const sendWhatsApp = async (number: string, text: string) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": evolutionApiKey,
          },
          body: JSON.stringify({
            number: number,
            text: text,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const textResponse = await res.text();
        let data;
        try {
          data = JSON.parse(textResponse);
        } catch (e) {
          data = { response: textResponse };
        }

        return { ok: res.ok, data };
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error(`Error enviando WhatsApp a ${number}:`, err.message);
        return { ok: false, error: err.message };
      }
    };

    // Si es una cita
    if (type?.startsWith('appointment') || clientMessage || adminMessage) {
      const clientNumber = clientPhone ? formatPhoneNumber(clientPhone) : null;
      const adminNumber = formatPhoneNumber(adminWhatsapp);

      const promises = [];
      let clientRes = { ok: true, data: "No client msg" };
      let adminRes = { ok: true, data: "No admin msg" };

      if (clientNumber && clientMessage) {
        clientRes = await sendWhatsApp(clientNumber, clientMessage);
      }
      if (adminMessage) {
        adminRes = await sendWhatsApp(adminNumber, adminMessage);
      }

      if (clientNumber && clientMessage && !clientRes.ok) {
        console.error("Error WhatsApp Cliente:", clientRes.data);
      }
      if (adminMessage && !adminRes.ok) {
        console.error("Error WhatsApp Administrador:", adminRes.data);
      }

      return new Response(
        JSON.stringify({
          success: true,
          clientWhatsappSent: clientNumber && clientMessage ? clientRes.ok : false,
          adminWhatsappSent: adminMessage ? adminRes.ok : false,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Flujo normal de pedidos de tienda
    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, error: "orderId o type de cita es requerido" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(Number(amount || 0));

    const clientNumber = customerPhone ? formatPhoneNumber(customerPhone) : "";
    const adminNumber = formatPhoneNumber(adminWhatsapp);

    const itemsSummary = (items || [])
      .map((item: any) => `- ${item.quantity}x ${item.name} (${formatCurrency(item.price)})`)
      .join("\n");

    const clientMsg = `Hola ${customerName}, gracias por tu pedido en Nutrición Deportiva Istmo.

Pedido: #${orderId}
Productos:
${itemsSummary}

Total: ${formatCurrency(total)}

Tu pedido fue recibido. En breve te contactaremos para confirmar pago y entrega.`;

    const adminMsg = `🛒 NUEVO PEDIDO EN LÍNEA

Cliente: ${customerName}
Teléfono: ${customerPhone}
Dirección: ${customerAddress}

Productos:
${itemsSummary}

Total: ${formatCurrency(total)}

Dar seguimiento por WhatsApp.`;

    // Send messages in parallel (or sequential, but parallel is better for speed)
    const [clientRes, adminRes] = await Promise.all([
      sendWhatsApp(clientNumber, clientMsg),
      sendWhatsApp(adminNumber, adminMsg),
    ]);

    if (!clientRes.ok) console.error("Error WhatsApp Cliente:", clientRes.error || clientRes.data);
    if (!adminRes.ok) console.error("Error WhatsApp Administrador:", adminRes.error || adminRes.data);

    return new Response(
      JSON.stringify({
        success: true,
        clientWhatsappSent: clientRes.ok,
        adminWhatsappSent: adminRes.ok,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Excepción en Edge Function (send-order-whatsapp):", error);
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
