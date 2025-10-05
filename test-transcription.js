// Simple test script to verify AssemblyAI transcription service
const { transcriptionService } = require('./dist/services/transcription');

async function testTranscription() {
  try {
    console.log('🧪 Testing AssemblyAI transcription service...');
    
    // Test with a sample audio URL
    const testAudioUrl = 'https://assembly.ai/wildfires.mp3';
    
    console.log(`📥 Testing transcription with URL: ${testAudioUrl}`);
    const result = await transcriptionService.transcribeFromUrl(testAudioUrl);
    
    console.log('✅ Transcription successful!');
    console.log('📝 Result:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testTranscription();
}

module.exports = { testTranscription };
