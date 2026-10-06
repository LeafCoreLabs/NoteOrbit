#!/bin/bash
# NoteOrbit Server Fix - Increase Upload Limit to 500MB
# Run this on your EC2 instance (e.g., via SSH)

echo "🚀 Starting Nginx Upload Limit Fix..."

# 1. Backup existing config
CONFIG_FILE="/etc/nginx/nginx.conf"
if [ -f "$CONFIG_FILE" ]; then
    echo "📦 Backing up $CONFIG_FILE..."
    sudo cp "$CONFIG_FILE" "${CONFIG_FILE}.bak_$(date +%s)"
else
    echo "❌ Error: $CONFIG_FILE not found. Is Nginx installed?"
    exit 1
fi

# 2. Update Limit (500M)
# Check if directive exists to replace, or insert if missing
if grep -q "client_max_body_size" "$CONFIG_FILE"; then
    echo "Updating existing client_max_body_size..."
    sudo sed -i 's/client_max_body_size .*/client_max_body_size 500M;/g' "$CONFIG_FILE"
else
    echo "➕ Adding client_max_body_size 500M to http block..."
    # Insert after 'http {'
    sudo sed -i '/http {/a \    client_max_body_size 500M;' "$CONFIG_FILE"
fi

# 3. Test Configuration
echo "🔍 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuration Valid. Reloading Nginx..."
    sudo systemctl reload nginx
    echo "🎉 Success! Upload limit is now 500MB."
else
    echo "⚠️ Config test failed! Restoring backup..."
    sudo cp "${CONFIG_FILE}.bak_*" "$CONFIG_FILE"
    echo "Restored original config. Please apply manually."
    exit 1
fi
