# Osmoguard — Arquitectura técnica

> Simulador clínico **educativo** de líquidos y sodio. No prescribe, no genera órdenes terapéuticas y no es un dispositivo médico.

## 1. Vista general

```
┌──────────────── Cliente ────────────────┐
│ PWA (React 19 + Vite)   APK (Capacitor) │
└───────────────┬─────────────────────────┘
                │ HTTPS  /api/*
┌───────────────▼──────────────┐
│ nginx (web)                  │  PWA estática + proxy inverso + CSP/HSTS
└───────────────┬──────────────┘
┌───────────────▼──────────────┐
│ API Fastify (api)            │  JWT · Zod · rate limit · auditoría
│   └─ @osmoguard/engine       │  motor clínico puro, determinista, versionado
└───────────────┬──────────────┘
┌───────────────▼──────────────┐
│ PostgreSQL 17 (db)           │  usuarios · sesiones · simulaciones · auditoría
└──────────────────────────────┘
```

Principios:

1. **El motor clínico es un paquete TypeScript puro** (`packages/engine`), sin dependencias de UI, red ni base de datos. Solo depende de `zod` para validar entradas.
2. **Un único lugar de cálculo**: el servidor. El frontend nunca calcula resultados clínicos; los obtiene de `POST /api/simulations/preview` o al guardar. Lo que envía el cliente como "resultado" se ignora.
3. **Reproducibilidad**: cada simulación guarda entradas, versión del motor, resultados y fecha.
4. **Minimización de datos**: no hay campos para identificar pacientes; títulos con secuencias numéricas largas se rechazan; entradas y notas se cifran en reposo (AES-256-GCM).

## 2. Monorepositorio

```
osmoguard/
├─ packages/
│  ├─ engine/        Motor clínico (fórmulas, aplicabilidad, simulación, alertas) + 53 pruebas
│  └─ contracts/     Esquemas Zod y DTO compartidos API ↔ web
├─ apps/
│  ├─ api/           Fastify + Prisma (migraciones en prisma/migrations) + 25 pruebas de integración
│  └─ web/           React + Tailwind + Recharts + PWA + Capacitor Android + E2E Playwright
├─ deploy/           nginx, workflows de GitHub Actions listos para activar
├─ docs/             Esta documentación
└─ docker-compose.yml  Stack para Coolify (db, api, web, tunnel)
```

| Capa | Tecnología |
|---|---|
| Frontend | React 19, TypeScript estricto, Vite 7, Tailwind CSS 4, componentes estilo shadcn/ui sobre Radix, Lucide, Motion |
| Gráficos | Recharts (estimaciones puntuales con barras de incertidumbre) |
| Formularios | React Hook Form + Zod |
| Estado/caché | TanStack Query (sin persistencia en disco) |
| Backend | Fastify 5, fastify-type-provider-zod, @fastify/helmet, cors, rate-limit, cookie, swagger |
| Datos | PostgreSQL 17 + Prisma 6 |
| Autenticación | Argon2id, JWT HS256 (15 min) en memoria, refresh token opaco rotativo en cookie HttpOnly |
| PWA | vite-plugin-pwa + Workbox (solo recursos estáticos) |
| Android | Capacitor 7 |
| Pruebas | Vitest, fast-check, Playwright + axe-core |

## 3. Modelo de datos

| Tabla | Propósito | Notas |
|---|---|---|
| `User` | Cuenta | `passwordHash` Argon2id, `alertConfig` (umbrales personalizados), bloqueo tras 5 fallos |
| `Session` | Refresh tokens | Solo `tokenHash` SHA-256; `familyId` para rotación y detección de reutilización |
| `Simulation` | Cabecera | `patientEnc` y `notesEnc` cifrados; `assessment` (evaluación global del motor); `engineVersion` |
| `SimulationScenario` | Escenario hipotético | Solución, velocidad, horizonte, posición |
| `SimulationResult` | Salida del motor por escenario | `engineVersion`, `output` JSON, `computedAt` |
| `AuditLog` | Auditoría | IP seudonimizada con HMAC, nunca contenido clínico |
| `PasswordResetToken` | Recuperación | Hash, un solo uso, 30 min |

Índices: `(userId, createdAt desc)` en simulaciones y auditoría, `familyId`, `expiresAt`, `tokenHash` único.

## 4. Mapa de navegación

```
/login ─ /registro ─ /recuperar ─ /restablecer?token=   (públicas)
/ciencia/publica                                         (pública)
/                       Dashboard
/simulaciones/nueva     Asistente: Paciente → Laboratorio → Balance → Escenarios → Revisar → Resultados
/simulaciones/:id       Detalle (Escenarios · Comparación · Fórmulas y supuestos), duplicar, editar como nueva, eliminar
/historial              Búsqueda y paginación
/ciencia                Información científica y limitaciones
/perfil                 Datos, umbrales de alerta, contraseña, sesiones, eliminar cuenta
```

## 5. Contratos de API (prefijo `/api`)

Documentación OpenAPI interactiva en `/api/docs` (JSON en `/api/docs/json`).

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/register` | — | Alta; devuelve access token y fija cookie de refresh |
| POST | `/auth/login` | — | Inicio de sesión (mensaje genérico, bloqueo progresivo) |
| POST | `/auth/refresh` | cookie + CSRF | Rotación del refresh token |
| POST | `/auth/logout` | cookie + CSRF | Revoca la familia de sesión |
| POST | `/auth/logout-all` | Bearer | Revoca todas las sesiones |
| POST | `/auth/forgot-password` | — | 202 siempre (sin enumeración) |
| POST | `/auth/reset-password` | — | Token de un solo uso; revoca sesiones |
| GET/PATCH/DELETE | `/users/me` | Bearer | Perfil, umbrales, supresión de cuenta |
| POST | `/users/me/password` | Bearer | Cambio de contraseña |
| GET | `/users/me/sessions` | Bearer | Sesiones activas |
| GET | `/engine/info` | — | Versión, catálogo, fórmulas, supuestos, referencias |
| POST | `/simulations/preview` | Bearer | Ejecuta el motor sin guardar |
| GET | `/simulations?q&page&pageSize` | Bearer | Listado propio |
| GET | `/simulations/stats` | Bearer | Resumen del dashboard |
| POST | `/simulations` | Bearer | Ejecuta y guarda |
| GET | `/simulations/:id` | Bearer | Detalle (solo propietario) |
| POST | `/simulations/:id/duplicate` | Bearer | Copia recalculada con el motor actual |
| DELETE | `/simulations/:id` | Bearer | Borrado definitivo |
| GET | `/health` | — | Estado de API y base de datos |

Errores: `{ "error": { "code", "message", "details?" } }`.

## 6. Autenticación y sesiones

- **Access token**: JWT HS256, 15 min, `iss`/`aud` verificados, guardado **solo en memoria** del navegador.
- **Refresh token**: 256 bits aleatorios, en cookie `og_rt` HttpOnly, Secure, `Path=/api/auth`, SameSite configurable (`none` en producción para permitir el APK). En base de datos solo su hash.
- **Rotación**: cada uso crea un token nuevo en la misma familia. Reutilizar uno ya rotado revoca toda la familia y se audita. Una reutilización dentro de 15 s se trata como carrera benigna entre pestañas (409, sin revocar).
- **CSRF**: los endpoints que usan la cookie exigen la cabecera `X-Osmoguard-Csrf: 1` (obliga a preflight CORS) y un `Origin` permitido o del mismo origen.

## 7. Plan de pruebas

| Nivel | Herramienta | Cobertura |
|---|---|---|
| Motor | Vitest + fast-check | Fórmulas, unidades, bloqueos, alertas, umbrales configurables, propiedades (monotonía, banda, conservación, equivalencia Edelman ↔ Adrogué-Madias) |
| API | Vitest + PostgreSQL real | Registro, login, bloqueo, JWT alterado, rotación y reutilización, CSRF, logout, recuperación de un solo uso, IDOR, cifrado en reposo, validación, OpenAPI, rate limiting, cabeceras |
| E2E | Playwright (escritorio + Pixel 7) + axe | Flujo completo, rutas protegidas, bloqueo de datos fuera de alcance, sin tokens en almacenamiento web, WCAG 2.2 AA (sin infracciones graves/críticas) |

## 8. Matriz de riesgos

| # | Riesgo | Tipo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|---|
| R1 | Usar la simulación como prescripción | Clínico | Media | Alto | Descargo permanente, sin recomendaciones de velocidad, lenguaje "hipotético", página de límites |
| R2 | Extrapolar Adrogué-Madias a 24–48 h | Clínico | Alta | Alto | Balance de masas con pérdidas, confianza baja > 24 h, sin interpolación ni curvas |
| R3 | Sobrecorrección por acuaresis no modelada | Clínico | Media | Alto | Alertas de diuresis alta, supuesto explícito, banda superior vs. límite |
| R4 | Datos fuera de dominio (pediatría, diálisis, Na extremos) | Clínico | Media | Alto | Bloqueo de resultados |
| R5 | Error de unidades | Clínico | Media | Medio | Unidades visibles, conversión automática, pruebas de conversión |
| R6 | Datos identificables de pacientes | Privacidad | Media | Alto | Sin campos identificativos, validación de títulos, cifrado en reposo, borrado de cuenta |
| R7 | Robo de sesión | Seguridad | Baja | Alto | Access token en memoria, refresh HttpOnly rotativo con detección de reutilización |
| R8 | Acceso a datos ajenos (IDOR) | Seguridad | Baja | Alto | Filtro de propietario en cada consulta + pruebas |
| R9 | Fuerza bruta | Seguridad | Media | Medio | Rate limiting, bloqueo de cuenta, Argon2id |
| R10 | Datos clínicos en cachés | Seguridad | Baja | Medio | El SW no cachea `/api`, `Cache-Control: no-store` en la API |
| R11 | Cambios del motor que alteran resultados guardados | Calidad | Media | Medio | Versión del motor guardada y aviso de versión desactualizada |

## 9. Criterios de aceptación

- [x] Registro, inicio de sesión, recuperación de contraseña y perfil funcionando de extremo a extremo.
- [x] Un usuario no puede ver, duplicar ni borrar simulaciones de otro.
- [x] Ningún resultado numérico cuando el modelo no es aplicable.
- [x] Cada resultado muestra supuestos, fórmulas, fuentes, banda de incertidumbre y confianza.
- [x] Sin cálculos clínicos en el frontend.
- [x] Interfaz utilizable desde 360 px; sin infracciones graves de accesibilidad en axe.
- [x] PWA instalable con actualización controlada; la API nunca se cachea.
- [x] Proyecto Android generado con iconos, splash, botón atrás y solo HTTPS.
- [x] Despliegue reproducible con Docker Compose y migraciones automáticas.
