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
    console.log("send-order-whatsapp received payload:", JSON.stringify(body));
    const { 
      type,
      notificationType,
      clientPhone,
      clientName,
      serviceName,
      date,
      time,
      appointmentDate,
      appointmentTime,
      appointmentId,
      notifyAdmin,
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
        JSON.stringify({ success: false, error: "Configuración incompleta de Evolution API env variables" }),
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
      if (cleaned.startsWith("52") && cleaned.length === 13 && cleaned[2] === '1') {
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

    // Si es una cita (or request matches appointment keys or doesn't have orderId)
    const resolvedType = type || notificationType || "";
    const isAppointment = 
      resolvedType.includes('appointment') || 
      resolvedType.includes('notification') || 
      !!appointmentId ||
      !!appointmentDate ||
      !orderId ||
      !!clientMessage || 
      !!adminMessage;

    if (isAppointment) {
      const actualPhone = clientPhone || customerPhone;
      const actualName = clientName || customerName;
      const actualDate = appointmentDate || date || "";
      const actualTime = appointmentTime || time || "";

      if (!actualPhone) {
        return new Response(
          JSON.stringify({ success: false, error: "clientPhone (o teléfono del cliente) es requerido para citas" }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const clientNumber = formatPhoneNumber(actualPhone);
      const adminNumber = formatPhoneNumber(adminWhatsapp);

      let computedClientMsg = clientMessage;
      let computedAdminMsg = adminMessage;

      // Generar mensajes automáticos según especificación si vienen tipados
      if (resolvedType === 'appointment_new' || resolvedType === 'appointment/new') {
        const cName = actualName || "Cliente";
        const sName = serviceName || "Asesoría Cita";
        const aDate = actualDate || "";
        const aTime = actualTime || "";
        const cPhone = actualPhone || "";

        if (!computedClientMsg) {
          computedClientMsg = `Hola ${cName}, recibimos tu solicitud de cita para ${sName} el día ${aDate} a las ${aTime}. En breve confirmaremos tu cita. Nutrición Deportiva Istmo.`;
        }
        if (!computedAdminMsg && notifyAdmin !== false) {
          computedAdminMsg = `Nueva cita agendada: ${cName} - ${cPhone} - ${sName} - ${aDate} ${aTime}.`;
        }
      } else if (resolvedType === 'appointment_confirmed' || resolvedType === 'appointment/confirm' || resolvedType === 'appointment/confirmation') {
        const cName = actualName || "Cliente";
        const sName = serviceName || "Asesoría Cita";
        const aDate = actualDate || "";
        const aTime = actualTime || "";

        if (!computedClientMsg) {
          computedClientMsg = `Hola ${cName}, tu cita para ${sName} ha sido confirmada para el día ${aDate} a las ${aTime}. Te esperamos en Nutrición Deportiva Istmo.`;
        }
        computedAdminMsg = undefined; // No se requiere avisar al administrador para confirmaciones manuales
      } else if (resolvedType === 'appointment_remind') {
        const cName = actualName || "Cliente";
        const sName = serviceName || "Asesoría Cita";
        const aDate = actualDate || "";
        const aTime = actualTime || "";

        if (!computedClientMsg) {
          computedClientMsg = `Recordatorio: Su cita para ${sName} es el día ${aDate} a las ${aTime}.`;
        }
      } else if (resolvedType === 'appointment_cancelled') {
        const cName = actualName || "Cliente";
        const sName = serviceName || "Asesoría Cita";
        const aDate = actualDate || "";
        const aTime = actualTime || "";

        if (!computedClientMsg) {
          computedClientMsg = `Hola ${cName}, le informamos que su cita para ${sName} el día ${aDate} a las ${aTime} ha sido cancelada.`;
        }
      }

      let clientRes = { ok: true, data: "No client msg" };
      let adminRes = { ok: true, data: "No admin msg" };

      if (clientNumber && computedClientMsg) {
        console.log(`Enviando WhatsApp al cliente (${clientNumber}): ${computedClientMsg}`);
        clientRes = await sendWhatsApp(clientNumber, computedClientMsg);
      }
      if (computedAdminMsg) {
        console.log(`Enviando WhatsApp al administrador (${adminNumber}): ${computedAdminMsg}`);
        adminRes = await sendWhatsApp(adminNumber, computedAdminMsg);
      }

      if (clientNumber && computedClientMsg && !clientRes.ok) {
        console.error("Error WhatsApp Cliente:", clientRes.data || clientRes);
      }
      if (computedAdminMsg && !adminRes.ok) {
        console.error("Error WhatsApp Administrador:", adminRes.data || adminRes);
      }

      return new Response(
        JSON.stringify({
          success: clientRes.ok && adminRes.ok,
          clientWhatsappSent: clientNumber && computedClientMsg ? clientRes.ok : false,
          adminWhatsappSent: computedAdminMsg ? adminRes.ok : false,
          clientDetails: clientRes,
          adminDetails: adminRes
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
