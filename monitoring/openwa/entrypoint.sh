#!/bin/bash
# ─── OpenWA Entrypoint ──────────────────────────────────────
set -e

echo "🟢 Starting OpenWA WhatsApp API Gateway..."
echo "   API Key: ${OPENWA_API_KEY:-nexusaid-wa-2026}"
echo "   Port: ${OPENWA_PORT:-8282}"

# Configure Apache
cat > /etc/apache2/sites-available/000-default.conf << 'EOF'
<VirtualHost *:8282>
    DocumentRoot /app/public
    <Directory /app/public>
        AllowOverride All
        Require all granted
    </Directory>
    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

# Update port
sed -i 's/Listen 80/Listen 8282/' /etc/apache2/ports.conf
a2enmod rewrite

# Start Apache
apache2-foreground
