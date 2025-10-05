# WhatsApp Server with Voice Transcription

A WhatsApp bot server that can transcribe voice messages using AssemblyAI and process them through an AI system.

## Features

- 🎙️ **Voice Message Transcription**: Converts WhatsApp voice messages to text using AssemblyAI
- 🤖 **AI Integration**: Processes transcribed text through your Voice Bridge API
- 🔊 **Voice Responses**: Can send AI responses back as voice messages
- 📱 **WhatsApp Integration**: Built with Baileys for reliable WhatsApp Web API connection
- 🛡️ **Error Handling**: Comprehensive error handling with fallback responses

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your variables:

```bash
cp env.example .env
```

Edit `.env` and add your actual values:

```env
# Required: AssemblyAI API Key for voice transcription
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here

# Required: Voice Bridge URL for AI processing
VOICE_BRIDGE_URL=http://localhost:3001

# Optional: Server port (defaults to 3000)
PORT=3000
```

### 3. Get AssemblyAI API Key

1. Go to [AssemblyAI](https://www.assemblyai.com/)
2. Sign up for a free account
3. Get your API key from the dashboard
4. Add it to your `.env` file

### 4. Build and Start

```bash
# Build the TypeScript code
npm run build

# Start the server
npm start

# Or run in development mode
npm run dev
```

## Usage

1. **Start the server** - The WhatsApp QR code will appear in the terminal
2. **Scan QR code** with your WhatsApp mobile app
3. **Send voice messages** to the bot - it will:
   - Transcribe your voice message
   - Show you the transcribed text
   - Process it through your AI system
   - Send back an AI response (voice or text)

## API Endpoints

- `GET /api/init` - Initialize WhatsApp connection
- `GET /api/status` - Check connection status
- `POST /api/send` - Send a message to a WhatsApp number

## Voice Message Flow

1. User sends voice message → Bot receives it
2. Bot acknowledges → "🎙️ I received your voice message! Let me transcribe it..."
3. AssemblyAI transcribes → Converts speech to text
4. Bot shows transcription → "📝 Here's what you said: [text]"
5. AI processes text → Sends to Voice Bridge API
6. Bot responds → Sends AI response as voice or text

## Troubleshooting

### Common Issues

1. **"ASSEMBLYAI_API_KEY environment variable is required"**
   - Make sure you've created a `.env` file with your AssemblyAI API key

2. **Voice transcription fails**
   - Check your AssemblyAI API key is valid
   - Ensure you have sufficient credits in your AssemblyAI account

3. **WhatsApp connection issues**
   - Clear the `baileys_auth_info` folder and restart
   - Make sure no other WhatsApp Web sessions are active

4. **Voice Bridge API errors**
   - Verify your `VOICE_BRIDGE_URL` is correct and accessible
   - Check that your AI service is running

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Test transcription service
node test-transcription.js
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ASSEMBLYAI_API_KEY` | Yes | Your AssemblyAI API key for voice transcription |
| `VOICE_BRIDGE_URL` | Yes | URL of your AI service (Voice Bridge) |
| `PORT` | No | Server port (default: 3000) |