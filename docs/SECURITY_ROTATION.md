# MS4 Security Incident: Credential Rotation Required

Date: 2026-04-16

MS4 previously contained committed secrets and key material. Treat all previously exposed values as compromised.

Rotate immediately:

1. OpenWeather API key
2. RabbitMQ username/password
3. Google Earth Engine service-account JSON key

Required actions:

- Revoke old keys in providers.
- Issue fresh credentials with least privilege.
- Update runtime secrets in your deployment platform (not in git).
- Validate daemon/API startup using new credentials.

Repository protections now in place:

- `.env` is ignored.
- `detection-*.json`, `keys/*.json`, `*service-account*.json`, `*.pem`, `*.key` are ignored.
- CI runs `scripts/secret_scan.sh` to fail builds if secret-like files are tracked.
- `Distaster Detection/.env.example` contains placeholders only.
