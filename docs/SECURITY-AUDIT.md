# Informe de auditoría técnica previa a producción

**Fecha:** 2026-10-21 · **Versión:** API 1.0.0 / motor 1.0.0 · **Guías:** OWASP ASVS 4.0 (nivel 2 como referencia) y OWASP API Security Top 10 (2023).

> Que las pruebas automatizadas pasen no significa que la aplicación sea segura. Este informe resume lo verificado, con evidencia, y lo que queda pendiente.

## 1. Resumen

| Severidad | Hallazgos abiertos |
|---|---|
| Crítica | 0 |
| Alta | 0 |
| Media | 2 (R-1, R-2) |
| Baja | 4 (R-3 a R-6) |

## 2. Verificaciones realizadas

| # | Control | Resultado | Evidencia |
|---|---|---|---|
| 1 | Secretos en el repositorio | ✅ Ninguno | Búsqueda de patrones (claves privadas, tokens de GitHub, AWS, Bearer, claves de cifrado) en archivos versionados; `.env` excluido |
| 2 | Credenciales en el historial Git | ✅ Ninguna | Misma búsqueda sobre `git log -p --all` |
| 3 | Dependencias | ⚠️ 1 aviso alto en herramienta | `npm audit --omit=dev`: `deepmerge-ts` dentro de la CLI de Prisma (ver R-3). Se corrigieron antes vitest, `@fastify/swagger-ui` y nodemailer |
| 4 | Autenticación | ✅ | Argon2id (m = 19 MiB, t = 2), contraseñas ≥ 10 con letras y números, bloqueo tras 5 fallos, mensajes genéricos, tiempos igualados con hash ficticio |
| 5 | Aislamiento entre usuarios (BOLA/IDOR) | ✅ | El propietario se filtra en la propia consulta; pruebas de lectura, borrado y duplicado cruzado → 404 |
| 6 | JWT y refresh tokens | ✅ | HS256 con `iss`/`aud`/`exp`, token en memoria; refresh opaco hasheado, rotativo, con detección de reutilización (familia revocada y auditada) |
| 7 | CSRF | ✅ | Cabecera personalizada + `Origin` en lista o mismo origen. Probado en producción: origen ajeno → 403 |
| 7b | XSS | ✅ | React escapa por defecto, sin `dangerouslySetInnerHTML`, CSP estricta sin `unsafe-eval` ni scripts en línea |
| 7c | Inyección | ✅ | Solo Prisma con consultas parametrizadas; un único `$queryRaw` estático (healthcheck); IDs validados como UUID |
| 8 | Validación de entradas | ✅ | Zod en cuerpo, query y parámetros; límites de plausibilidad clínica; `bodyLimit` de 64 KB |
| 9 | Consultas parametrizadas | ✅ | Ídem 7c |
| 10 | Subida de archivos | N/A | No existe |
| 11 | Rate limiting | ✅ | Global 300/min; login 10/5 min; registro 5/10 min; recuperación 5/h; refresh 60/min. Probado en producción (429). `TRUST_PROXY` por número de saltos para que no se pueda falsear `X-Forwarded-For` |
| 12 | CORS, CSP y cabeceras | ✅ | CORS con lista y credenciales; web: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy y COOP en todas las rutas; API: helmet con `default-src 'none'` |
| 13 | HTTPS | ✅ | Certificado Let's Encrypt válido en `osmoguard.193.122.229.210.sslip.io` y certificado de Cloudflare en el túnel. HSTS activo. El APK solo permite HTTPS (network security config) |
| 14 | Sesiones | ✅ | Acceso 15 min, refresh 14 días con caducidad absoluta por familia, cierre de todas las sesiones, revocación al cambiar o restablecer la contraseña |
| 15 | Minimización de datos | ✅ | Sin campos identificativos, títulos con secuencias numéricas largas rechazados, entradas y notas cifradas (AES-256-GCM), IP con HMAC, borrado de cuenta en cascada |
| 16 | Respaldo y restauración | ⚠️ | Procedimiento documentado (`DEPLOYMENT.md`); falta programar el backup en Coolify y hacer un simulacro (R-1) |
| 17 | Cachés de la PWA | ✅ | Workbox precachea solo recursos estáticos; `/api` excluido del fallback; la API responde `Cache-Control: no-store`; tokens fuera de `localStorage` (verificado en E2E) |
| 18 | Regresión | ✅ | 53 pruebas del motor, 25 de la API y 6 E2E (en local y contra producción) |
| 19 | Accesibilidad | ✅ | axe-core WCAG 2.2 A/AA sin infracciones graves ni críticas en 6 pantallas (escritorio y móvil); Lighthouse Accesibilidad 100 |
| 20 | Riesgos pendientes | — | Sección 4 |

### Calidad

| Comprobación | Resultado |
|---|---|
| TypeScript strict (`noUncheckedIndexedAccess`) en los 4 paquetes | ✅ Sin errores |
| Pruebas unitarias del motor | ✅ 53/53 |
| Pruebas de integración de la API (PostgreSQL real) | ✅ 25/25 |
| Playwright (escritorio + Pixel 7) | ✅ 6/6 local · 6/6 producción |
| Lighthouse (producción, `/login`, móvil) | Rendimiento 86* · Accesibilidad 100 · Buenas prácticas 96 · SEO 54** |
| Errores de consola | Corregido el 401 inicial sin sesión |
| Migraciones | ✅ `prisma migrate deploy` aplicado en el primer arranque de producción |
| Restauración desde backup | ⏳ Pendiente de simulacro (R-1) |
| Lint | ⚠️ No hay ESLint configurado; el tipado estricto cubre parte (R-6) |

\* Medido antes de separar Motion y Recharts del primer render; el bundle inicial bajó de 721 KB a 228 KB + 262 KB (React).
\** El túnel rápido de Cloudflare añade `noindex`. Es deseable para una demo educativa.

## 3. Correcciones realizadas durante la auditoría

1. Actualización de dependencias vulnerables (vitest 5, `@fastify/swagger-ui` 6, nodemailer 10).
2. Cabeceras de seguridad de nginx movidas a un *snippet* incluido en cada `location`: `add_header` no se hereda y algunas rutas perdían HSTS y X-Frame-Options.
3. `TRUST_PROXY` por número de saltos en lugar de `true`, para que no se pueda falsear `X-Forwarded-For` y saltarse el rate limiting.
4. CSRF: aceptar el mismo origen, necesario para acceder por el túnel, sin abrir orígenes de terceros.
5. Contenedores sin root (`node`, nginx-unprivileged) con tini y healthchecks.
6. Android: `allowBackup=false`, tráfico en claro deshabilitado, HTTP nativo de Capacitor para que la cookie de refresh funcione sin permitir cookies de terceros.
7. Regiones con scroll accesibles por teclado (WCAG 2.1.1).

## 4. Riesgos residuales

| ID | Severidad | Riesgo | Recomendación |
|---|---|---|---|
| R-1 | Media | Sin backup programado ni simulacro de restauración | Activar el backup diario de Coolify hacia S3 externo y restaurarlo en un entorno de prueba |
| R-2 | Media | Sin dominio propio: sslip.io depende de un servicio DNS de terceros y la URL del túnel rápido cambia en cada redeploy | Dominio propio (p. ej. `osmoguard.<cliente>.com`) con Cloudflare *Named Tunnel* o un registro DNS directo |
| R-3 | Baja | `deepmerge-ts` < 8 en la CLI de Prisma (DoS por objetos recursivos al leer su configuración; no es alcanzable con datos de usuario) | Actualizar a Prisma 7 cuando se migre |
| R-4 | Baja | Sin SMTP: la recuperación de contraseña no envía correos en producción | Configurar `SMTP_URL` (Resend, SES…) |
| R-5 | Baja | El access token sigue siendo válido hasta 15 min tras revocar sesiones | Aceptado por diseño; reducir el TTL o añadir una lista de revocación si se requiere |
| R-6 | Baja | Sin ESLint ni análisis estático de seguridad (SAST) en CI | Añadir ESLint, `eslint-plugin-security` y CodeQL al activar los workflows |

## 5. Riesgo clínico

Ver `CLINICAL-ENGINE.md` §7–8. El motor no está validado clínicamente; cualquier uso asistencial requiere validación, gestión de riesgos y evaluación regulatoria.
