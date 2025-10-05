import dotenv from "dotenv";
dotenv.config();

import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
  } from "@whiskeysockets/baileys";
  import qrcode from "qrcode-terminal";
  import axios from "axios";
  import { transcriptionService } from "./services/transcription";
  
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
        
        // Check if it's a conflict error (multiple sessions)
        const isConflict = lastDisconnect?.error?.message?.includes('conflict') || 
                          (lastDisconnect?.error as any)?.output?.statusCode === 409;
        
        if (isConflict) {
          console.log("⚠️ Multiple WhatsApp sessions detected. Please:");
          console.log("   1. Close WhatsApp Web in your browser");
          console.log("   2. Wait 30 seconds");
          console.log("   3. Restart the server");
          return; // Don't reconnect on conflict
        }
        
        console.log("Connection closed. Reconnecting:", shouldReconnect);
        if (shouldReconnect) {
          // Add delay before reconnecting to avoid rapid reconnection
          setTimeout(() => connectToWhatsApp(), 5000);
        }
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
        
        try {
          // Transcribe the voice message
          const transcribedText = await transcriptionService.transcribeWhatsAppAudio(msg, sock);
          
          console.log(`📝 Transcribed text: "${transcribedText}"`);
          
          // Process the transcribed text through the AI system
          const voiceBridgeUrl = process.env.VOICE_BRIDGE_URL || "http://localhost:3000";
          
          console.log(`🔄 Sending transcribed text to Voice Bridge: ${voiceBridgeUrl}/api/whatsapp`);
          
          const response = await axios.post(`${voiceBridgeUrl}/api/whatsapp`, {
            message: transcribedText,
            from: from,
            originalMessage: "voice_note",
            transcribed: true
          }, {
            timeout: 30000,
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
              console.log(`🎵 Sending AI audio response from: ${audioUrl}`);
              
              try {
                // Download the audio file
                console.log(`📥 Downloading AI audio file...`);
                const audioResponse = await axios.get(audioUrl, {
                  responseType: 'arraybuffer',
                  timeout: 30000,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; WhatsApp-Bot/1.0)'
                  }
                });
                
                const audioData = audioResponse.data as ArrayBuffer;
                
                if (!audioData || audioData.byteLength === 0) {
                  throw new Error('Downloaded audio file is empty');
                }
                
                // Determine correct MIME type
                const actualContentType = audioResponse.headers['content-type'];
                let mimetype = 'audio/mpeg';
                
                if (actualContentType?.includes('audio/ogg')) {
                  mimetype = 'audio/ogg; codecs=opus';
                } else if (actualContentType?.includes('audio/mp4')) {
                  mimetype = 'audio/mp4';
                } else if (actualContentType?.includes('audio/mpeg') || actualContentType?.includes('audio/mp3')) {
                  mimetype = 'audio/mpeg';
                } else if (actualContentType?.includes('audio/wav')) {
                  mimetype = 'audio/wav';
                }
                
                console.log(`🎵 Sending AI audio response (${mimetype})`);
                
                // Send as regular audio file (not voice note)
                await sock!.sendMessage(from, {
                  audio: Buffer.from(audioData),
                  mimetype: mimetype,
                  seconds: Math.ceil(audioData.byteLength / 16000)
                });
                
                console.log(`✅ AI audio response sent successfully`);
                
              } catch (audioError) {
                console.error('❌ AI audio processing error:', audioError);
                // Send error as voice note
                await sock!.sendMessage(from, {
                  audio: Buffer.from('Sorry, I had trouble processing your request. Please try again.'),
                  mimetype: 'audio/ogg; codecs=opus',
                  ptt: true,
                  seconds: 3
                });
              }
            } else {
              // Convert text response to audio and send
              console.log(`📝 Converting text to audio: ${aiResponse}`);
              // For now, send a simple error voice note
              await sock!.sendMessage(from, {
                audio: Buffer.from('I received your message but cannot process it right now. Please try again.'),
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true,
                seconds: 3
              });
            }
          } else {
            throw new Error(responseData.error || 'Voice Bridge API error');
          }
          
        } catch (error) {
          console.error('❌ Voice processing error:', error);
          // Send error as voice note
          await sock!.sendMessage(from, {
            audio: Buffer.from('Sorry, I had trouble understanding your voice message. Please try speaking more clearly.'),
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true,
            seconds: 3
          });
        }
        
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
              
              // Send as regular audio file (consistent format)
              console.log(`📤 Sending audio message...`);
              
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
              
              // Send as regular audio file (not voice note) for consistency
              try {
                console.log(`🎵 Sending as regular audio message (${mimetype})`);
                await sock!.sendMessage(from, {
                  audio: Buffer.from(audioData),
                  mimetype: mimetype,
                  seconds: Math.ceil(audioData.byteLength / 16000)
                });
                console.log(`✅ Audio message sent successfully (${mimetype})`);
              } catch (sendError) {
                console.error('❌ Failed to send audio message:', sendError);
                throw sendError;
              }
              
              console.log(`✅ Voice message sent successfully`);
              
            } catch (audioError) {
              console.error('❌ Audio processing error:', audioError);
              // Send error as voice note
              await sock!.sendMessage(from, {
                audio: Buffer.from('Sorry, I had trouble processing your request. Please try again.'),
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true,
                seconds: 3
              });
            }
          } else {
            // Send error as voice note
            await sock!.sendMessage(from, {
              audio: Buffer.from('I received your message but cannot process it right now. Please try again.'),
              mimetype: 'audio/ogg; codecs=opus',
              ptt: true,
              seconds: 3
            });
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
        
        // Send error as voice note
        console.log(`📝 Sending error voice note`);
        await sock!.sendMessage(from, {
          audio: Buffer.from('Sorry, I am having trouble processing your message right now. Please try again later.'),
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true,
          seconds: 3
        });
      }
    });
  
    return sock;
  }
  
  export function getSocket() {
    return sock;
  }
  