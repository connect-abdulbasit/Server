#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

async function testAudioFormats() {
  console.log('🧪 Testing different audio formats for WhatsApp compatibility...\n');
  
  try {
    // Get a test audio file from TTS
    console.log('1. Generating test audio from TTS...');
    const ttsResponse = await axios.get('http://localhost:3000/api/test-audio?text=Hello%20this%20is%20a%20test%20message', {
      timeout: 30000
    });
    
    if (!ttsResponse.data.success) {
      throw new Error('TTS generation failed: ' + ttsResponse.data.error);
    }
    
    const audioUrl = ttsResponse.data.audioUrl;
    console.log('✅ TTS generated audio URL:', audioUrl);
    
    // Download the audio file
    console.log('\n2. Downloading audio file...');
    const audioResponse = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const audioData = audioResponse.data;
    console.log('✅ Audio downloaded:', {
      size: audioData.byteLength,
      contentType: audioResponse.headers['content-type']
    });
    
    // Save original file
    const originalFile = `original-audio-${Date.now()}.mp3`;
    fs.writeFileSync(originalFile, Buffer.from(audioData));
    console.log(`💾 Saved original: ${originalFile}`);
    
    // Analyze the audio file
    console.log('\n3. Analyzing audio file...');
    const buffer = Buffer.from(audioData);
    
    // Check file headers
    const header = buffer.slice(0, 16);
    console.log('📊 File analysis:');
    console.log('  First 16 bytes (hex):', header.toString('hex'));
    console.log('  First 16 bytes (ascii):', header.toString('ascii').replace(/[^\x20-\x7E]/g, '.'));
    
    // Check for common audio formats
    const isMP3 = header.slice(0, 3).toString('hex') === 'fff' || 
                  header.slice(0, 2).toString('hex') === '4949';
    const isWAV = header.slice(0, 4).toString() === 'RIFF';
    const isOGG = header.slice(0, 4).toString() === 'OggS';
    const isMP4 = header.slice(4, 8).toString() === 'ftyp';
    
    console.log('  Format detection:');
    console.log('    MP3:', isMP3);
    console.log('    WAV:', isWAV);
    console.log('    OGG:', isOGG);
    console.log('    MP4:', isMP4);
    
    // Test different MIME types
    console.log('\n4. Testing WhatsApp compatibility...');
    console.log('Based on analysis, recommended MIME types to try:');
    
    if (isMP3) {
      console.log('  ✅ audio/mpeg (MP3 format detected)');
      console.log('  ✅ audio/mp3');
    } else if (isWAV) {
      console.log('  ✅ audio/wav');
      console.log('  ✅ audio/wave');
    } else if (isOGG) {
      console.log('  ✅ audio/ogg');
      console.log('  ✅ audio/ogg; codecs=opus');
    } else if (isMP4) {
      console.log('  ✅ audio/mp4');
      console.log('  ✅ audio/m4a');
    } else {
      console.log('  ⚠️ Unknown format, try these generic types:');
      console.log('    audio/mpeg');
      console.log('    audio/ogg; codecs=opus');
      console.log('    audio/mp4');
    }
    
    console.log('\n📋 Recommendations:');
    console.log('1. The audio file is being downloaded successfully');
    console.log('2. Check if the format is compatible with WhatsApp');
    console.log('3. Try different MIME types in the WhatsApp message');
    console.log('4. Consider converting the audio to a more compatible format');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
}

async function checkWhatsAppRequirements() {
  console.log('\n📱 WhatsApp Voice Message Requirements:');
  console.log('• Format: OGG Opus, MP4 AAC, or MP3');
  console.log('• Duration: 1-16 seconds for voice notes');
  console.log('• Size: Usually < 1MB');
  console.log('• Sample rate: 8kHz or 16kHz');
  console.log('• Channels: Mono (1 channel)');
  console.log('• Bitrate: 64-128 kbps');
}

async function runDebug() {
  console.log('🔍 WhatsApp Audio Format Debug Tool\n');
  console.log('This tool will help diagnose why WhatsApp voice notes are not playing.\n');
  
  await testAudioFormats();
  await checkWhatsAppRequirements();
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Restart the WhatsApp server to apply the new audio format handling');
  console.log('2. Send a test message and check the debug logs');
  console.log('3. Check the saved audio files to verify format');
  console.log('4. If still failing, we may need to convert the audio format');
}

runDebug().catch(console.error);
