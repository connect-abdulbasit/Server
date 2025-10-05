#!/bin/bash
echo "🧹 Clearing WhatsApp authentication data..."
rm -rf baileys_auth_info/
echo "✅ Authentication data cleared!"
echo "📱 You'll need to scan a new QR code when you restart the server."
