import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
  } from "@whiskeysockets/baileys";
  import qrcode from "qrcode-terminal";
  import axios from "axios";
  
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
      
      // Handle voice messages
      const hasAudio = msg.message?.audioMessage;
      const hasVoiceNote = msg.message?.audioMessage?.ptt; // ptt = push-to-talk (voice note)
      
      if (hasAudio || hasVoiceNote) {
        console.log(`🎙️ Received voice message from ${from}`);
        const audioMessage = msg.message.audioMessage;
        console.log(`📊 Voice message details:`, {
          duration: audioMessage?.seconds,
          ptt: audioMessage?.ptt,
          mimetype: audioMessage?.mimetype,
          hasAudio: !!hasAudio
        });
        
        // For now, respond with text since we can't process voice input yet
        await sock!.sendMessage(from, { 
          text: "I received your voice message! I can hear you, but I'm still learning to process voice input. Please send me a text message for now, and I'll respond with a voice note!" 
        });
        return;
      }

      console.log(`📩 Message from ${from}: ${text}`);

      try {
        // Send message to Voice Bridge for AI processing
        const voiceBridgeUrl = process.env.VOICE_BRIDGE_URL || "http://localhost:3000";
        
        console.log(`🔄 Sending message to Voice Bridge: ${voiceBridgeUrl}/api/whatsapp`);
        
        const response = await axios.post(`${voiceBridgeUrl}/api/whatsapp`, {
          message: text,
          from: from
        }, {
          timeout: 30000, // 30 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const responseData = response.data as {
          success: boolean;
          response: string;
          audioUrl?: string;
          hasAudio: boolean;
          error?: string;
        };

        if (responseData.success) {
          const { response: aiResponse, audioUrl, hasAudio } = responseData;
          
          if (hasAudio && audioUrl) {
            console.log(`🎵 Sending voice message from: ${audioUrl}`);
            
            try {
              // Download the audio file with detailed logging
              console.log(`📥 Downloading audio file...`);
              const audioResponse = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; WhatsApp-Bot/1.0)'
                }
              });
              
              const audioData = audioResponse.data as ArrayBuffer;
              
              console.log(`📊 Audio download stats:`, {
                status: audioResponse.status,
                contentType: audioResponse.headers['content-type'],
                contentLength: audioResponse.headers['content-length'],
                dataSize: audioData.byteLength
              });
              
              // Validate audio data
              if (!audioData || audioData.byteLength === 0) {
                throw new Error('Downloaded audio file is empty');
              }
              
              if (audioData.byteLength < 1000) {
                console.warn(`⚠️ Audio file seems too small: ${audioData.byteLength} bytes`);
              }
              
              // Debug: Save audio file locally for inspection
              const fs = require('fs');
              const filename = `debug-audio-${Date.now()}.mp3`;
              try {
                fs.writeFileSync(filename, Buffer.from(audioData));
                console.log(`💾 Saved audio for debugging: ${filename}`);
              } catch (saveError) {
                console.warn(`⚠️ Could not save debug audio:`, saveError);
              }
              
              // Send as voice message with proper format
              console.log(`📤 Sending voice message...`);
              
              // Determine correct MIME type based on actual content type
              const actualContentType = audioResponse.headers['content-type'];
              let mimetype = 'audio/mpeg'; // Default fallback
              
              if (actualContentType?.includes('audio/ogg')) {
                mimetype = 'audio/ogg; codecs=opus';
              } else if (actualContentType?.includes('audio/mp4')) {
                mimetype = 'audio/mp4';
              } else if (actualContentType?.includes('audio/mpeg') || actualContentType?.includes('audio/mp3')) {
                mimetype = 'audio/mpeg';
              } else if (actualContentType?.includes('audio/wav')) {
                mimetype = 'audio/wav';
              }
              
              console.log(`🎵 Using MIME type: ${mimetype} (detected from: ${actualContentType})`);
              
              // Send as voice note with correct MIME type
              try {
                // For MP3 files, try without ptt flag first (regular audio message)
                if (mimetype.includes('audio/mpeg')) {
                  console.log(`🎵 Sending as regular audio message (MP3 format)`);
                  await sock!.sendMessage(from, {
                    audio: Buffer.from(audioData),
                    mimetype: mimetype,
                    seconds: Math.ceil(audioData.byteLength / 16000)
                  });
                  console.log(`✅ Audio message sent successfully (${mimetype})`);
                } else {
                  // For OGG/Opus, use ptt flag for voice notes
                  console.log(`🎵 Sending as voice note (${mimetype})`);
                  await sock!.sendMessage(from, {
                    audio: Buffer.from(audioData),
                    mimetype: mimetype,
                    ptt: true, // Push-to-talk for voice notes
                    seconds: Math.ceil(audioData.byteLength / 16000)
                  });
                  console.log(`✅ Voice note sent successfully (${mimetype})`);
                }
              } catch (sendError) {
                console.error('❌ Failed to send audio message:', sendError);
                throw sendError;
              }
              
              console.log(`✅ Voice message sent successfully`);
              
            } catch (audioError) {
              console.error('❌ Audio processing error:', audioError);
              console.log(`📝 Falling back to text message: ${aiResponse}`);
              await sock!.sendMessage(from, { text: aiResponse });
            }
          } else {
            // Fallback to text message
            console.log(`📝 Sending text response: ${aiResponse}`);
            await sock!.sendMessage(from, { text: aiResponse });
          }
        } else {
          throw new Error(responseData.error || 'Voice Bridge API error');
        }
        
      } catch (error) {
        console.error('❌ Error processing message:', error);
        
        // Detailed error logging
        if (error && typeof error === 'object') {
          const errorObj = error as any;
          console.error('Error details:', {
            message: errorObj.message,
            code: errorObj.code,
            status: errorObj.response?.status,
            statusText: errorObj.response?.statusText,
            data: errorObj.response?.data
          });
        }
        
        // Fallback response
        let fallbackReply = "Sorry, I'm having trouble processing your message right now. Please try again later.";
        
        if (error && typeof error === 'object' && 'code' in error) {
          const axiosError = error as { code?: string; response?: any };
          if (axiosError.code === 'ECONNREFUSED') {
            fallbackReply = "Voice Bridge service is not available. Please try again later.";
          } else if (axiosError.code === 'ETIMEDOUT') {
            fallbackReply = "Request timed out. Please try again.";
          } else if (axiosError.response?.status === 400) {
            fallbackReply = "There was an issue with your message format. Please try sending a simple text message.";
          } else if (axiosError.response?.status === 500) {
            fallbackReply = "Our AI service is temporarily unavailable. Please try again in a moment.";
          }
        }
        
        console.log(`📝 Sending fallback response: ${fallbackReply}`);
        await sock!.sendMessage(from, { text: fallbackReply });
      }
    });
  
    return sock;
  }
  
  export function getSocket() {
    return sock;
  }
  