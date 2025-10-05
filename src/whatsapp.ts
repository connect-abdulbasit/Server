import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import fs from "fs";
import path from "path";

let sock: WASocket | null = null;

export async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("./baileys_auth_info");

  sock = makeWASocket({
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
  
    if (qr) {
      console.log("📱 Scan this QR code to connect:");
      qrcode.generate(qr, { small: true });
    }
  
    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const reason = (lastDisconnect?.error as any)?.message;
      console.log(`❌ Connection closed (${statusCode || reason}). Reconnecting...`);
      await connectToWhatsApp(); // 🔁 Restart automatically
    } else if (connection === "open") {
      console.log("✅ WhatsApp connected!");
    }
  });
  

  // 📥 Handle incoming messages
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid!;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    console.log(`📩 Message from ${from}: ${text}`);

    // 🔊 When message includes 'voice', send MP3 as voice note
    if (/voice|audio/i.test(text) && sock) {
      const audioPath = path.resolve("./src/media/voice.mp3");
      if (fs.existsSync(audioPath)) {
        const audioBuffer = fs.readFileSync(audioPath);

        await sock.sendMessage(from, {
          audio: audioBuffer,
          mimetype: "audio/mpeg",
          ptt: true, // ✅ make it a voice note (push-to-talk style)
        });

        console.log("🎤 Sent MP3 voice note!");
      } else {
        await sock.sendMessage(from, {
          text: "⚠️ MP3 file not found. Please place voice.mp3 inside /src/media/",
        });
      }
    } else {
      // 💬 Otherwise, send a normal text reply
      const reply = `You said: "${text}". Send 'voice' to get a voice note 🎧`;
      if(sock)
      await sock.sendMessage(from, { text: reply });
    }
  });

  return sock;
}

export function getSocket() {
  return sock;
}
