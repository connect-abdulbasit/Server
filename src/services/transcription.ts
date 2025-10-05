import dotenv from "dotenv";
dotenv.config();

import { AssemblyAI } from "assemblyai";
import axios from "axios";
import fs from "fs-extra";
import path from "path";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

export class TranscriptionService {
  private client: AssemblyAI;

  constructor() {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      throw new Error("ASSEMBLYAI_API_KEY environment variable is required");
    }
    
    this.client = new AssemblyAI({
      apiKey: apiKey,
    });
  }

  /**
   * Transcribe audio from WhatsApp voice message
   * @param audioBuffer - The audio data as Buffer
   * @param mimetype - The MIME type of the audio
   * @returns Promise<string> - The transcribed text
   */
  async transcribeVoiceMessage(audioBuffer: Buffer, mimetype: string): Promise<string> {
    try {
      console.log(`🎙️ Starting transcription for audio (${mimetype}, ${audioBuffer.length} bytes)`);
      
      // Create a temporary file for the audio
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.ensureDir(tempDir);
      
      // Determine file extension based on mimetype
      let extension = '.ogg';
      if (mimetype.includes('audio/mpeg') || mimetype.includes('audio/mp3')) {
        extension = '.mp3';
      } else if (mimetype.includes('audio/mp4')) {
        extension = '.m4a';
      } else if (mimetype.includes('audio/wav')) {
        extension = '.wav';
      } else if (mimetype.includes('audio/ogg')) {
        extension = '.ogg';
      }
      
      const tempFilePath = path.join(tempDir, `voice-${Date.now()}${extension}`);
      
      // Write audio buffer to temporary file
      await fs.writeFile(tempFilePath, audioBuffer);
      console.log(`💾 Saved audio to temporary file: ${tempFilePath}`);
      
      try {
        // Transcribe using AssemblyAI
        const transcript = await this.client.transcripts.transcribe({
          audio: tempFilePath,
          speech_model: "universal", // Use universal model for better accuracy
        });
        
        console.log(`📝 Transcription completed: "${transcript.text}"`);
        
        return transcript.text || "I couldn't understand the audio message.";
        
      } finally {
        // Clean up temporary file
        try {
          await fs.remove(tempFilePath);
          console.log(`🗑️ Cleaned up temporary file: ${tempFilePath}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to clean up temporary file: ${cleanupError}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Transcribe audio from a remote URL
   * @param audioUrl - The URL of the audio file
   * @returns Promise<string> - The transcribed text
   */
  async transcribeFromUrl(audioUrl: string): Promise<string> {
    try {
      console.log(`🎙️ Starting transcription for URL: ${audioUrl}`);
      
      const transcript = await this.client.transcripts.transcribe({
        audio: audioUrl,
        speech_model: "universal",
      });
      
      console.log(`📝 Transcription completed: "${transcript.text}"`);
      
      return transcript.text || "I couldn't understand the audio message.";
      
    } catch (error) {
      console.error('❌ Transcription error:', error);
      throw new Error(`Failed to transcribe audio from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download audio from WhatsApp and transcribe it
   * @param message - The complete WhatsApp message object
   * @param sock - The WhatsApp socket for downloading media
   * @returns Promise<string> - The transcribed text
   */
  async transcribeWhatsAppAudio(message: any, sock: any): Promise<string> {
    try {
      console.log(`🎙️ Downloading WhatsApp audio message...`);
      
      // Download the audio file from WhatsApp using the correct Baileys method
      const audioBuffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        sock
      );
      
      if (!audioBuffer) {
        throw new Error("Failed to download audio message");
      }
      
      console.log(`📥 Downloaded audio (${audioBuffer.length} bytes)`);
      
      // Get the mimetype from the audio message
      const audioMessage = message.message?.audioMessage;
      const mimetype = audioMessage?.mimetype || 'audio/ogg; codecs=opus';
      
      // Transcribe the audio
      return await this.transcribeVoiceMessage(audioBuffer, mimetype);
      
    } catch (error) {
      console.error('❌ WhatsApp audio transcription error:', error);
      throw new Error(`Failed to transcribe WhatsApp audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const transcriptionService = new TranscriptionService();
