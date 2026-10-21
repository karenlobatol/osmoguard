# Reporte final de entrega — Osmoguard 1.0.0

**Fecha:** 2026-10-21

## Accesos

| Recurso | URL |
|---|---|
| PWA (dominio estable, Let's Encrypt) | https://osmoguard.193.122.229.210.sslip.io |
| PWA por túnel de Cloudflare | URL vigente en `https://osmoguard.193.122.229.210.sslip.io/_tunnel` (cambia en cada redeploy) |
| Documentación de la API (OpenAPI) | `/api/docs` |
| Código fuente | https://github.com/grismaldo/osmoguard (privado) |
| APK de demostración | GitHub Release `v1.0.0` → `osmoguard-1.0.0-debug.apk` |
| Coolify | Proyecto **Osmoguard** → recurso `osmoguard` |

## 1. Implementado y probado

| Área | Detalle | Evidencia |
|---|---|---|
| Motor clínico | ACT (fracción y Watson), Adrogué-Madias, balance tipo Edelman con pérdidas, déficit de agua libre, Na corregido, eGFR, EFWC, aplicabilidad, alertas configurables, incertidumbre por sensibilidad, versionado | 53 pruebas (incluye propiedades) |
| Autenticación | Registro, login, bloqueo, refresh rotativo con detección de reutilización, logout, cerrar todas las sesiones, recuperación de contraseña de un solo uso, cambio de contraseña | 25 pruebas de integración + E2E |
| Autorización | Aislamiento por propietario en todas las consultas | Pruebas IDOR |
| Persistencia | PostgreSQL 17, migraciones versionadas, cifrado AES-256-GCM de entradas y notas, auditoría | Pruebas + despliegue |
| Simulador | Asistente de 5 pasos, unidades convertibles, casos ficticios, 1–4 escenarios, ejecución en servidor | E2E |
| Resultados | Estimaciones puntuales con barras de incertidumbre, límite de 24 h, rango normal, tablas de datos, alertas con fuentes, comparación, fórmulas y supuestos, bloqueo sin datos | E2E + revisión visual |
| Historial | Guardar, buscar, paginar, detalle, duplicar (recalcula), editar como nueva, eliminar | E2E |
| Perfil | Datos, umbrales acotados, contraseña, sesiones, eliminación de cuenta | E2E + pruebas de API |
| Ciencia y limitaciones | Qué hace y qué no, fórmulas, catálogo y referencias con DOI | E2E |
| Diseño | Paleta clínica, Inter, desde 360 px, escritorio con barra lateral y móvil con navegación inferior, estados de carga, error, vacío y éxito | Capturas en escritorio y Pixel 7 |
| Accesibilidad | WCAG 2.2 AA (axe) sin infracciones graves; Lighthouse 100 | E2E |
| PWA | Manifest, iconos, maskable, service worker con caché versionada, actualización controlada, indicador sin conexión, API nunca cacheada | Build + cabeceras |
| Despliegue | Coolify con Docker Compose (db, api, web, tunnel), healthchecks, contenedores sin root, HTTPS, cabeceras de seguridad | Producción operativa; E2E contra producción 6/6 |
| Túnel de Cloudflare | Servicio `cloudflared` dentro del stack | URL publicada en `/_tunnel` |
| Android | Proyecto Capacitor: iconos adaptativos, splash, botón atrás, solo HTTPS, servidor configurable, HTTP nativo | APK de debug compilado (com.osmoguard.app 1.0.0, targetSdk 35) |

## 2. Implementado, pendiente de validación

| Elemento | Qué falta |
|---|---|
| Validez clínica del motor | Revisión por nefrología o medicina interna y contraste con casos reales. **Imprescindible antes de cualquier uso asistencial** |
| APK en dispositivo físico | Instalar y probar en un Android real. Se validó el paquete (aapt2) y la web dentro del mismo código, no en un teléfono |
| AAB firmado | La configuración de firma existe; falta crear el keystore del cliente y ejecutar `bundleRelease` |
| Recuperación de contraseña por correo | Flujo probado con un transporte simulado; falta configurar `SMTP_URL` en producción |
| Backups | Procedimiento documentado; falta programarlo en Coolify y hacer un simulacro de restauración |
| Workflows de CI y APK | Listos en `deploy/github-workflows/`; activarlos requiere el permiso `workflow` en GitHub |

## 3. No implementado

- Dominio propio y *Named Tunnel* de Cloudflare: se usan sslip.io y un *Quick Tunnel*.
- Sincronización offline de simulaciones: decisión de seguridad; no se guardan datos clínicos en el dispositivo.
- ESLint y análisis estático de seguridad (SAST).
- Roles de administrador en la interfaz: el rol existe en el modelo, sin pantallas.

## 4. Fuera del alcance contratado

- Prescripción o recomendación de tratamientos, volúmenes o velocidades.
- Integración con historias clínicas (HL7/FHIR) o con sistemas hospitalarios.
- Predicción fisiológica avanzada (ADH, acuaresis, cinética de glucosa) y pacientes pediátricos o en diálisis.
- IA generativa.
- Certificación como dispositivo médico.
- Publicación en Google Play: cuenta de desarrollador, ficha y revisión.

## 5. Checklist de aceptación

- [ ] El cliente accede a la PWA y crea una cuenta.
- [ ] Ejecuta los tres casos ficticios y revisa resultados, comparación y fórmulas.
- [ ] Guarda, duplica y elimina una simulación.
- [ ] Instala la PWA en el móvil desde el navegador.
- [ ] Instala el APK en un Android y completa un flujo.
- [ ] Recibe el código fuente y la documentación (`docs/`).
- [ ] Recibe los secretos de producción por un canal seguro, sobre todo `DATA_ENCRYPTION_KEY`.
- [ ] Acepta el registro de limitaciones clínicas (`CLINICAL-ENGINE.md`).

**Acta de entrega**

| | Nombre | Firma | Fecha |
|---|---|---|---|
| Proveedor | | | |
| Cliente | | | |
