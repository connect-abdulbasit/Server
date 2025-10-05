# Media Directory

This directory contains media files for the WhatsApp bot.

## Voice Notes

To add a voice note:

1. Place your audio file here as `voice.ogg`
2. Recommended format: OGG with Opus codec
3. You can convert any audio file using FFmpeg:
   ```bash
   ffmpeg -i input.mp3 -c:a libopus -b:a 64k -vn voice.ogg
   ```

The bot will automatically send this voice note when users type "voice" or "audio".
