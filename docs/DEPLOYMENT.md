# Despliegue y operación

## 1. Stack en Coolify

| Elemento | Valor |
|---|---|
| Panel | https://server.grismaldo.com |
| Proyecto / entorno | `Osmoguard` / `production` |
| Recurso | `osmoguard` (Docker Compose, `/docker-compose.yml`) |
| Repositorio | `git@github.com:grismaldo/osmoguard.git` · rama `main` (deploy key de solo lectura `coolify-osmoguard`) |

Servicios (red Docker aislada, volúmenes propios):

| Servicio | Imagen | Exposición | Función |
|---|---|---|---|
| `web` | nginx-unprivileged 1.27 | Dominio público (Traefik → 8080) | PWA + proxy `/api` + CSP/HSTS |
| `api` | Node 22 slim (usuario `node`, tini) | Solo interna | Fastify; aplica migraciones al arrancar |
| `db` | postgres:17-alpine | Solo interna | Volumen `osmoguard-pgdata` |
| `tunnel` | cloudflare/cloudflared | Saliente | Túnel rápido `https://*.trycloudflare.com` → `web` |

Orden de arranque con *healthchecks*: `db` → `api` → `web` → `tunnel`.

## 2. Variables de entorno (Coolify → Environment Variables)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `POSTGRES_PASSWORD` | Sí | Contraseña de PostgreSQL |
| `JWT_SECRET` | Sí | ≥ 32 caracteres aleatorios (`openssl rand -base64 48`) |
| `DATA_ENCRYPTION_KEY` | Sí | 32 bytes en base64 (`openssl rand -base64 32`). **Si se pierde, las entradas cifradas no se pueden recuperar.** Guárdela en un gestor de secretos |
| `AUDIT_HMAC_KEY` | Sí | Clave HMAC para seudonimizar IPs |
| `APP_URL` | Sí | URL pública (enlaces de recuperación) |
| `CORS_ORIGINS` | No | Orígenes adicionales; incluir `https://localhost` para el APK |
| `REFRESH_COOKIE_SAMESITE` | No | `none` (por defecto, necesario para el APK) · `lax` si solo hay web |
| `TRUST_PROXY` | No | Saltos de proxy de confianza (2 = Traefik/cloudflared + nginx) |
| `ENABLE_DOCS` | No | `true` publica `/api/docs` |
| `SMTP_URL`, `MAIL_FROM` | No | Correo de recuperación (`smtps://usuario:clave@host:465`). Sin SMTP en producción no se envían correos |

Los secretos nunca se guardan en el repositorio. La API se niega a arrancar en producción con secretos de ejemplo.

## 3. Despliegue

1. Commit y push a `main`.
2. Coolify → *Redeploy*, o por API: `POST /api/v1/deploy {"uuid":"<uuid del recurso>"}`.
3. La API ejecuta `prisma migrate deploy` antes de arrancar: solo aplica migraciones pendientes y nunca borra datos. Para desactivarlo: `RUN_MIGRATIONS=false`.
4. Verificación: `GET /api/health` → `{"status":"ok"}`.

### Túnel de Cloudflare

El servicio `tunnel` abre un *Quick Tunnel* sin cuenta. La URL actual se consulta en:

```
https://<dominio>/_tunnel        → {"hostname":"xxxx.trycloudflare.com"}
```

o en los logs del contenedor `tunnel`. La URL cambia en cada reinicio del contenedor. Para un dominio estable:

1. Cree un *Named Tunnel* en Cloudflare Zero Trust y copie su token.
2. Cambie el `command` del servicio a `tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}` y añada la variable.
3. Configure en Cloudflare el *public hostname* → `http://web:8080`.

## 4. Copias de seguridad y restauración

- **Programadas**: Coolify → recurso → *Backups* sobre el servicio `db` (recomendado: diario, retención 14 días, destino S3 externo).
- **Manual**:
  ```bash
  docker exec <db> pg_dump -U osmoguard -Fc osmoguard > osmoguard-$(date +%F).dump
  ```
- **Restauración** (en un entorno de prueba primero):
  ```bash
  docker exec -i <db> pg_restore -U osmoguard -d osmoguard --clean --if-exists < osmoguard-AAAA-MM-DD.dump
  ```
- Además de la base de datos, respalde `DATA_ENCRYPTION_KEY`: sin ella el volcado es ilegible.

## 5. Monitorización básica

- Healthchecks de Docker en `api` (`/api/health`, comprueba la base de datos) y `web` (`/healthz`). Coolify reinicia servicios no sanos.
- Logs estructurados JSON (pino) sin cabeceras `Authorization`, cookies ni cuerpos de petición.
- Auditoría en la tabla `AuditLog` (inicios de sesión, fallos, reutilización de tokens, creación y borrado de simulaciones).
- Recomendado: monitor externo (UptimeRobot o similar) sobre `/api/health`, y alertas de Coolify por correo.

## 6. Retención de datos

| Dato | Retención | Mecanismo |
|---|---|---|
| Simulaciones | Hasta que el usuario las borre o elimine su cuenta | Borrado definitivo (cascada) |
| Sesiones caducadas o revocadas | 30 días | Tarea SQL periódica (abajo) |
| Tokens de recuperación usados o caducados | 7 días | Tarea SQL periódica |
| Auditoría | 12 meses | Tarea SQL periódica |

```sql
DELETE FROM "Session" WHERE "expiresAt" < now() - interval '30 days' OR "revokedAt" < now() - interval '30 days';
DELETE FROM "PasswordResetToken" WHERE "createdAt" < now() - interval '7 days';
DELETE FROM "AuditLog" WHERE "createdAt" < now() - interval '12 months';
```

Se puede programar como *Scheduled Task* de Coolify sobre el contenedor `db` (`psql -U osmoguard -d osmoguard -c "…"`).

## 7. Android (APK y AAB)

Requisitos: JDK 21 y Android SDK 35.

```bash
cd apps/web
VITE_API_URL=https://<dominio>/api npx vite build   # la API siempre por HTTPS
npx cap sync android
cd android && ./gradlew assembleDebug             # APK de prueba: app/build/outputs/apk/debug/
```

**AAB firmado para Google Play:**

```bash
keytool -genkeypair -v -keystore release.jks -alias osmoguard -keyalg RSA -keysize 4096 -validity 10000
export ANDROID_KEYSTORE_PATH=$PWD/release.jks ANDROID_KEYSTORE_PASSWORD=… ANDROID_KEY_ALIAS=osmoguard ANDROID_KEY_PASSWORD=…
export ANDROID_VERSION_CODE=2 ANDROID_VERSION_NAME=1.0.1 CAP_APP_ID=com.su.empresa.osmoguard
./gradlew bundleRelease                            # app/build/outputs/bundle/release/app-release.aab
```

El keystore no se versiona (`*.jks` está en `.gitignore`). Si se pierde, no se pueden publicar actualizaciones de la app.

### CI con GitHub Actions

`deploy/github-workflows/` contiene `ci.yml` (typecheck, pruebas del motor, pruebas de integración contra PostgreSQL, build y auditoría) y `android.yml` (APK de prueba y AAB firmado si existen los secretos `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` y `ANDROID_KEY_PASSWORD`). Para activarlos, muévalos a `.github/workflows/` con una cuenta que tenga permiso `workflow`.

## 8. Desarrollo local

```bash
npm install
node apps/api/scripts/dev-db.mjs &          # PostgreSQL embebido en :54329 (sin Docker)
cp apps/api/.env.example apps/api/.env       # y genere DATA_ENCRYPTION_KEY
cd apps/api && npx prisma migrate deploy && cd ../..
npm run dev:api & npm run dev:web           # http://localhost:5173

npm test                                    # motor + API
npm run test:e2e                            # Playwright (requiere API y web en marcha)
```
