// Simple test script to verify voice note functionality
const fs = require('fs');
const path = require('path');

// Test if media directory exists
const mediaDir = path.resolve('./src/media');
const voiceFile = path.resolve('./src/media/voice.ogg');

console.log('🧪 Testing voice note setup...\n');

// Check if media directory exists
if (fs.existsSync(mediaDir)) {
  console.log('✅ Media directory exists:', mediaDir);
} else {
  console.log('❌ Media directory missing:', mediaDir);
}

// Check if voice file exists
if (fs.existsSync(voiceFile)) {
  console.log('✅ Voice file exists:', voiceFile);
  const stats = fs.statSync(voiceFile);
  console.log('📊 File size:', (stats.size / 1024).toFixed(2), 'KB');
} else {
  console.log('❌ Voice file missing:', voiceFile);
  console.log('💡 To add a voice file:');
  console.log('   1. Record a voice note and save as voice.ogg');
  console.log('   2. Or convert an existing audio file:');
  console.log('      ffmpeg -i input.mp3 -c:a libopus -b:a 64k -vn src/media/voice.ogg');
}

console.log('\n🎯 Ready to test! Start your server with:');
console.log('   npm run dev');
console.log('\n📱 Then send "voice" to your WhatsApp bot!');
