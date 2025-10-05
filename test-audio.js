#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

async function testAudioDownload(audioUrl) {
  try {
    console.log('🧪 Testing audio download from:', audioUrl);
    
    const response = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WhatsApp-Bot/1.0)'
      }
    });
    
    console.log('📊 Audio download results:');
    console.log('  Status:', response.status);
    console.log('  Content-Type:', response.headers['content-type']);
    console.log('  Content-Length:', response.headers['content-length']);
    console.log('  Data Size:', response.data.byteLength, 'bytes');
    
    // Check if it's a valid audio file
    const buffer = Buffer.from(response.data);
    const isValidMpeg = buffer.slice(0, 3).toString('hex') === 'fff' || 
                       buffer.slice(0, 2).toString('hex') === '4949' ||
                       buffer.slice(0, 4).toString('hex') === '52494646'; // RIFF
    
    console.log('  Valid Audio Header:', isValidMpeg);
    console.log('  First 16 bytes (hex):', buffer.slice(0, 16).toString('hex'));
    
    // Save for manual inspection
    const filename = `test-audio-${Date.now()}.mp3`;
    fs.writeFileSync(filename, buffer);
    console.log(`  Saved as: ${filename}`);
    
    return {
      success: true,
      size: response.data.byteLength,
      contentType: response.headers['content-type'],
      isValidAudio: isValidMpeg,
      filename: filename
    };
    
  } catch (error) {
    console.error('❌ Audio download failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testTTSGeneration() {
  try {
    console.log('🧪 Testing TTS generation...');
    
    const response = await axios.get('http://localhost:3000/api/test-audio?text=Hello%20this%20is%20a%20test', {
      timeout: 30000
    });
    
    console.log('📊 TTS Generation results:');
    console.log('  Success:', response.data.success);
    console.log('  Audio URL:', response.data.audioUrl);
    console.log('  Error:', response.data.error);
    
    if (response.data.success && response.data.audioUrl) {
      console.log('\n🧪 Testing audio download...');
      await testAudioDownload(response.data.audioUrl);
    }
    
  } catch (error) {
    console.error('❌ TTS test failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Audio Debug Tests...\n');
  
  await testTTSGeneration();
  
  console.log('\n📋 Test Summary:');
  console.log('1. Check if Voice Bridge is running on port 3000');
  console.log('2. Verify TTS service configuration');
  console.log('3. Check downloaded audio file manually');
  console.log('4. Look for any CORS or authentication issues');
}

runTests().catch(console.error);
