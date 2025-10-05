import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
  } from "@whiskeysockets/baileys";
  import qrcode from "qrcode-terminal";
  
  let sock: WASocket | null = null;
  
  export async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth_info");
  
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // deprecated option, we handle QR manually
    });
  
    sock.ev.on("creds.update", saveCreds);
  
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;
  
      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log("Connection closed. Reconnecting:", shouldReconnect);
        if (shouldReconnect) connectToWhatsApp();
      } else if (connection === "open") {
        console.log("✅ WhatsApp connected!");
      }
  
      if (qr) {
        console.log("📱 Scan this QR code to connect:");
        qrcode.generate(qr, { small: true });
      }
    });
  
    // 🔥 Auto-reply + message processing
    sock.ev.on("messages.upsert", async (m) => {
      const msg = m.messages[0];
      if (!msg.message || msg.key.fromMe) return;
  
      const from = msg.key.remoteJid!;
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        "";
  
      console.log(`📩 Message from ${from}: ${text}`);
  
      // --- Custom Logic ---
      let reply = "";
  
      if (/hi|hello|hey/i.test(text)) {
        reply = "👋 Hello! I'm your WhatsApp bot. How can I assist you?";
      } else if (/help/i.test(text)) {
        reply = "🛠 Available commands:\n1️⃣ hi\n2️⃣ status\n3️⃣ bye";
      } else if (/status/i.test(text)) {
        reply = "📊 System running smoothly 🚀";
      } else if (/bye/i.test(text)) {
        reply = "👋 Goodbye! Have a great day.";
      } else {
        reply = `You said: "${text}"`;
      }
  
      if (sock) {
        await sock.sendMessage(from, { text: reply });
      }
    });
  
    return sock;
  }
  
  export function getSocket() {
    return sock;
  }
  