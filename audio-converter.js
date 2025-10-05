#!/usr/bin/env node

const fs = require('fs');
const { spawn } = require('child_process');

/**
 * Convert MP3 audio to OGG Opus format for WhatsApp voice notes
 * Requires FFmpeg to be installed
 */
async function convertToOGG(inputBuffer, outputPath) {
  return new Promise((resolve, reject) => {
    // Write input buffer to temporary file
    const tempInput = `temp-input-${Date.now()}.mp3`;
    fs.writeFileSync(tempInput, inputBuffer);
    
    // FFmpeg command to convert MP3 to OGG Opus
    const ffmpeg = spawn('ffmpeg', [
      '-i', tempInput,
      '-c:a', 'libopus',
      '-b:a', '64k',
      '-ar', '48000',
      '-ac', '1',
      '-avoid_negative_ts', 'make_zero',
      '-y', // Overwrite output file
      outputPath
    ]);
    
    ffmpeg.on('close', (code) => {
      // Clean up temporary file
      try {
        fs.unlinkSync(tempInput);
      } catch (e) {
        console.warn('Could not delete temp file:', e.message);
      }
      
      if (code === 0) {
        console.log(`✅ Audio converted successfully: ${outputPath}`);
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg conversion failed with code ${code}`));
      }
    });
    
    ffmpeg.on('error', (error) => {
      reject(new Error(`FFmpeg error: ${error.message}`));
    });
    
    // Log FFmpeg output for debugging
    ffmpeg.stderr.on('data', (data) => {
      console.log(`FFmpeg: ${data}`);
    });
  });
}

/**
 * Check if FFmpeg is available
 */
async function checkFFmpeg() {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });
    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Simple audio format detection
 */
function detectAudioFormat(buffer) {
  const header = buffer.slice(0, 16);
  const hex = header.toString('hex');
  
  if (hex.startsWith('fff') || hex.startsWith('4949')) {
    return 'mp3';
  } else if (header.slice(0, 4).toString() === 'RIFF') {
    return 'wav';
  } else if (header.slice(0, 4).toString() === 'OggS') {
    return 'ogg';
  } else if (header.slice(4, 8).toString() === 'ftyp') {
    return 'mp4';
  }
  
  return 'unknown';
}

async function testConversion() {
  console.log('🧪 Testing audio conversion setup...\n');
  
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    console.log('❌ FFmpeg not found! Please install FFmpeg:');
    console.log('   macOS: brew install ffmpeg');
    console.log('   Ubuntu: sudo apt install ffmpeg');
    console.log('   Windows: Download from https://ffmpeg.org/download.html');
    return;
  }
  
  console.log('✅ FFmpeg is available');
  console.log('🎵 Audio conversion is ready for WhatsApp voice notes');
  
  console.log('\n📋 Usage in your WhatsApp bot:');
  console.log('1. Download MP3 from TTS service');
  console.log('2. Convert to OGG Opus using this script');
  console.log('3. Send OGG file to WhatsApp with ptt: true');
}

if (require.main === module) {
  testConversion().catch(console.error);
}

module.exports = { convertToOGG, checkFFmpeg, detectAudioFormat };
