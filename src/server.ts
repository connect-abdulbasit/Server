import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api";
import { connectToWhatsApp } from "./whatsapp";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", apiRoutes);

const PORT = process.env.PORT || 3001;

// Initialize WhatsApp connection
connectToWhatsApp().catch(console.error);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Voice Bridge URL: ${process.env.VOICE_BRIDGE_URL || "http://localhost:3000"}`);
  console.log(`📱 WhatsApp connection initializing...`);
});
