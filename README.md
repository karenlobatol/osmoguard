# Osmoguard

Plataforma **educativa** de líquidos, electrolitos y equilibrio ácido-base. Incluye simulación de sodio, interpretación de gasometría, osmolalidad, potasio y calcio, con explicaciones opcionales de IA. Es una PWA instalable con API propia, PostgreSQL y app Android.

> Osmoguard muestra simulaciones matemáticas con sus supuestos, incertidumbre y límites. **No prescribe tratamientos ni es un dispositivo médico.**

## Qué incluye

- **Motor clínico determinista y versionado** (`packages/engine`): Adrogué-Madias, balance de masas tipo Edelman con pérdidas urinarias y extrarrenales, agua corporal (fracción y Watson), déficit de agua libre, sodio corregido por glucosa, eGFR CKD-EPI 2021, bloqueos de aplicabilidad y alertas de sobrecorrección configurables.
- **API** Fastify + Prisma + PostgreSQL: JWT de corta duración, refresh token rotativo con detección de reutilización, Argon2id, CSRF, rate limiting, cifrado en reposo, auditoría y OpenAPI.
- **PWA** React 19 + Tailwind: asistente por pasos, gráficos con incertidumbre, comparación de escenarios, historial, perfil, y una sección de ciencia y limitaciones.
- **Android** con Capacitor.
- **Herramientas de interpretación:** gasometría con compensación, anión gap y delta-delta; osmolalidad y tonicidad; potasio; calcio corregido e iónico. Incluyen casos de ejemplo, escalas visuales, razonamiento y referencias. Estos análisis no se guardan en el historial de simulaciones de sodio.
- **Tutor con OpenAI:** explica los resultados recalculados en el servidor. Se configura con `OPENAI_API_KEY` y `OPENAI_MODEL` en `apps/api/.env` o en las variables de Coolify; Docker Compose las pasa únicamente a la API. La clave nunca debe llevar el prefijo `VITE_` ni incorporarse al frontend. Sin clave, se oculta el botón de IA y las herramientas siguen funcionando.
- **Despliegue** en Coolify con Docker Compose y un túnel de Cloudflare.

## Estructura

```
packages/engine      Motor clínico (TypeScript puro)
packages/contracts   Esquemas y DTO compartidos
apps/api             API Fastify + Prisma
apps/web             PWA + proyecto Android
deploy/              nginx y workflows de CI
docs/                Documentación
```

## Inicio rápido

```bash
npm install
node apps/api/scripts/dev-db.mjs &                 # PostgreSQL embebido
cp apps/api/.env.example apps/api/.env             # complete DATA_ENCRYPTION_KEY
(cd apps/api && npx prisma migrate deploy)
npm run dev:api & npm run dev:web                  # http://localhost:5173
npm test                                           # motor + API
```

## Documentación

| Documento | Contenido |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitectura, modelo de datos, navegación, contratos de API, plan de pruebas, riesgos y criterios de aceptación |
| [docs/CLINICAL-ENGINE.md](docs/CLINICAL-ENGINE.md) | Fórmulas, supuestos, incertidumbre, aplicabilidad, alertas y registro de limitaciones clínicas |
| [docs/SECURITY-AUDIT.md](docs/SECURITY-AUDIT.md) | Auditoría OWASP con evidencia y riesgos residuales |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Coolify, variables, túnel, backups, retención, APK y AAB |
| [docs/USER-MANUAL.md](docs/USER-MANUAL.md) | Manual de usuario |
| [docs/DELIVERY-REPORT.md](docs/DELIVERY-REPORT.md) | Estado final y checklist de aceptación |
