import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api";
import { connectToWhatsApp } from "./whatsapp";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", apiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // Start WhatsApp connection
  connectToWhatsApp().catch(console.error);
});
