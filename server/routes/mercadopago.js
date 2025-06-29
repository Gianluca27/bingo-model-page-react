import express from "express";
import mercadopago from "../config/mercadopagoConfig.js";
import db from "../models/db.js";

const router = express.Router();

router.post("/crear-preferencia", async (req, res) => {
  const { email, monto } = req.body;

  if (!email || !monto) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  try {
    const preference = {
      items: [
        {
          title: `${monto} créditos`,
          quantity: 1,
          unit_price: parseFloat(monto),
        },
      ],
      payer: { email },
      external_reference: email,
      notification_url:
        "https://d9ab-2803-9800-98ca-7aaf-95fd-7a43-b250-6c51.ngrok-free.app/api/mercadopago/webhook", // 🔁 Cambiar
      back_urls: {
        success:
          "https://d9ab-2803-9800-98ca-7aaf-95fd-7a43-b250-6c51.ngrok-free.app/comprar-creditos",
        failure:
          "https://d9ab-2803-9800-98ca-7aaf-95fd-7a43-b250-6c51.ngrok-free.app/comprar-creditos",
      },
      auto_return: "approved",
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.init_point });
  } catch (error) {
    console.error("❌ Error al crear preferencia:", error.message);
    res.status(500).json({ error: "Error al generar pago" });
  }
});

router.post("/webhook", express.json(), async (req, res) => {
  const { type, data } = req.body;

  if (type === "payment" && data?.id) {
    try {
      const payment = await mercadopago.payment.findById(data.id);
      const info = payment.response;

      if (info.status === "approved") {
        const email = info.external_reference;
        const monto = Math.floor(info.transaction_amount);

        console.log(`✅ ${email} pagó $${monto} → acreditando créditos...`);

        db.run(
          `UPDATE Usuarios SET creditos = creditos + ? WHERE email = ?`,
          [monto, email],
          function (err) {
            if (err) {
              console.error("❌ Error al acreditar créditos:", err.message);
            }
          }
        );
      }
    } catch (error) {
      console.error("❌ Error al procesar webhook:", error.message);
    }
  }

  res.sendStatus(200);
});

export default router;
