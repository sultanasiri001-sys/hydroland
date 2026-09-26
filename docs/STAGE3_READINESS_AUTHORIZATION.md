# Stage 3 readiness authorization boundary

Detailed integration readiness diagnostics are operational/admin data and require an authenticated ADMIN account.

Admin-only routes:
- `/health/integrations/payment`
- `/health/integrations/settlement`
- `/health/integrations/email`
- `/health/integrations/sms`
- `/health/integrations/whatsapp`
- `/health/integrations/object-storage`
- `/health/integrations/translation`
- `/health/integrations/esign`
- `/health/integrations/distress-ais`
- `/health/integrations/nafath`
- `/health/integrations/regulatory`

Public operational routes intentionally remain public:
- `/health`
- `/health/ready`
- `/integrations/maps/public-config`
- `/integrations/weather/public-config`

The production integration inventory authenticates as its temporary E2E admin before reading detailed readiness diagnostics. Readiness responses expose boolean configuration state only and never return credential values.
