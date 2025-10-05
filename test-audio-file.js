// Test transcription with the debug audio file
const { transcriptionService } = require('./dist/services/transcription');
const fs = require('fs');
const path = require('path');

async function testAudioFileTranscription() {
  try {
    console.log('🧪 Testing transcription with debug audio file...');
    
    const audioFilePath = './debug-audio-1759688786661.mp3';
    
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      console.error('❌ Audio file not found:', audioFilePath);
      return;
    }
    
    console.log(`📁 Found audio file: ${audioFilePath}`);
    
    // Get file stats
    const stats = fs.statSync(audioFilePath);
    console.log(`📊 File size: ${stats.size} bytes`);
    
    // Read the audio file
    const audioBuffer = fs.readFileSync(audioFilePath);
    console.log(`📥 Read audio buffer: ${audioBuffer.length} bytes`);
    
    // Test transcription
    console.log('🎙️ Starting transcription...');
    const result = await transcriptionService.transcribeVoiceMessage(audioBuffer, 'audio/mpeg');
    
    console.log('✅ Transcription successful!');
    console.log('📝 Result:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testAudioFileTranscription();
