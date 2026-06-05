const express = require("express");
const cors = require("cors");
const simulacionRouter = require("./routes/simulacion");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api", simulacionRouter);

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.post("/api/integrations/mi-argentina", async (req, res) => {
  const { dispositivos = 0, radioKm = 0 } = req.body;
  await new Promise(resolve => setTimeout(resolve, 800 + Math.floor(Math.random() * 150)));
  res.status(200).json({
    status:                  "OK",
    endpoint:                "Mi Argentina — Push IP",
    dispositivos_alcanzados: Number(dispositivos),
    radioKm:                 Number(radioKm),
    protocolo:               "HTTPS/2 · CiDi Platform v3.1",
    latencia_media_ms:       812,
    timestamp:               new Date().toISOString(),
  });
});

app.post("/api/integrations/smsc-gateway", (req, res) => {
  const { sms_residuales = 0, tps = 1000 } = req.body;
  const tiempo_encolamiento_seg = parseFloat((sms_residuales / tps).toFixed(2));
  res.status(202).json({
    status:                   "Accepted",
    endpoint:                 "SMSC Gateway — Unicast SMS",
    sms_encolados:            Number(sms_residuales),
    tps_configurado:          tps,
    tiempo_encolamiento_seg,
    back_pressure_umbral_seg: 120,
    supera_umbral:            tiempo_encolamiento_seg > 120,
    timestamp:                new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Alerta Sofía API corriendo en http://localhost:${PORT}`);
});
