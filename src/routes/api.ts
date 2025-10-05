import { Router } from "express";
import { getSocket, connectToWhatsApp } from "../whatsapp";

const router = Router();

router.get("/init", async (_req, res) => {
  await connectToWhatsApp();
  res.json({ message: "WhatsApp connection initializing..." });
});

router.post("/send", async (req, res) => {
  const { number, message } = req.body;
  const sock = getSocket();

  if (!sock) return res.status(400).json({ error: "Not connected" });

  await sock.sendMessage(`${number}@s.whatsapp.net`, { text: message });
  res.json({ success: true });
});

export default router;
