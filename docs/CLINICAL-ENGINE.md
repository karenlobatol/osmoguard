# Motor clínico de Osmoguard (`@osmoguard/engine` v1.0.0)

> **Registro de limitaciones clínicas.** El motor es una herramienta matemática educativa. Ninguna fórmula se considera clínicamente validada por estar publicada. Antes de cualquier uso asistencial se requiere revisión clínica humana, validación con datos reales, gestión de riesgos (p. ej. ISO 14971) y la evaluación regulatoria que corresponda (software como dispositivo médico).

## 1. Diseño

- TypeScript puro, sin I/O. Entrada validada con Zod (`simulationRequestSchema`).
- **Determinista**: mismas entradas → misma salida (probado).
- **Versionado** (`ENGINE_VERSION`). La versión se guarda con cada resultado. Cambios de fórmulas o umbrales por defecto ⇒ versión MAJOR.
- Punto de entrada: `runSimulation(request) → SimulationOutput`.

## 2. Entradas

| Campo | Unidad | Obligatorio | Uso |
|---|---|---|---|
| Edad | años | Sí | Fracción de ACT, eGFR, bloqueo pediátrico |
| Sexo biológico | — | Sí | Fracción de ACT, Watson, eGFR |
| Peso | kg | Sí | ACT |
| Talla | cm | No | Watson (comparación e incertidumbre) |
| Na sérico | mmol/L | Sí | Todo |
| K sérico | mmol/L | No | Hipopotasemia (riesgo de ODS) |
| Glucosa | mg/dL (UI acepta mmol/L) | No | Na corregido, aplicabilidad |
| Creatinina | mg/dL (UI acepta µmol/L) | No | eGFR CKD-EPI 2021 |
| Terapia de reemplazo renal | sí/no | Sí | Bloqueo |
| Diuresis | mL/h | No* | Balance; *sin ella se bloquea > 6 h |
| Na y K urinarios | mmol/L | No | Composición de pérdidas urinarias, EFWC |
| Ingesta oral de agua | mL/h | No | Balance |
| Otras pérdidas | mL/h + tipo | No | Balance (composición típica con rango) |
| Cronología | aguda/crónica/desconocida | No | Interpretación de límites |
| Factores de riesgo de ODS | — | No | Umbral de alto riesgo |
| Escenarios (1–4) | solución, mL/h hipotéticos, horizonte 1–48 h | Sí | Simulación |

## 3. Cálculos

| Cálculo | Fórmula | Fuente |
|---|---|---|
| ACT por fracción | peso × f (0,6 H; 0,5 M; 0,5 H ≥ 65 a; 0,45 M ≥ 65 a) | Adrogué & Madias, NEJM 2000 |
| ACT Watson | H: 2,447 − 0,09516·edad + 0,1074·talla + 0,3362·peso; M: −2,097 + 0,1069·talla + 0,2466·peso | Watson, AJCN 1980 |
| Δ Na por litro | ((Na+K)inf − Na) / (ACT + 1) | Adrogué & Madias, NEJM 2000 |
| Escenario temporal | Na(t) = (Na₀·ACT₀ + Σ(Na+K)entra − Σ(Na+K)sale) / (ACT₀ + V_entra − V_sale) | Edelman 1958; Barsoum & Levine 2002 |
| Déficit de agua libre | ACT × (Na/140 − 1) | Adrogué & Madias, NEJM 2000 |
| Na corregido | Na + k·(glucosa − 100)/100; k = 1,6 (Katz) y 2,4 (Hillier) | Katz 1973; Hillier 1999 |
| eGFR | CKD-EPI 2021 sin raza | Inker, NEJM 2021 |
| EFWC | V × (1 − (UNa + UK)/PNa) | Fisiología renal estándar |

Con 1 L, sin pérdidas, el balance de masas reproduce **exactamente** Adrogué-Madias (probado con propiedades aleatorias).

## 4. Incertidumbre

Análisis de sensibilidad determinista: se evalúan todas las combinaciones extremas de

- ACT ±10 % (y Watson si hay talla),
- diuresis ±20 %,
- Na+K urinario ±20 % si se midió; 20–250 mmol/L si no,
- K urinario 20–80 mmol/L si solo se conoce el Na urinario,
- volumen de otras pérdidas ±20 % y su composición en el rango típico.

La banda es el mínimo y máximo de esas combinaciones. **No es un intervalo de confianza estadístico.** Las estimaciones son **puntuales** (1, 2, 4, 6, 8, 12, 16, 20, 24, 30, 36, 42, 48 h y el horizonte) y la interfaz no las une con líneas.

Confianza:

- `standard`: datos urinarios completos y ≤ 24 h.
- `low`: > 24 h, composición urinaria desconocida o algún extremo no interpretable.
- `blocked`: sin estimación.

## 5. Aplicabilidad (bloqueos y advertencias)

| Código | Nivel | Condición |
|---|---|---|
| PEDIATRIC | bloqueo | Edad < 18 |
| KRT | bloqueo | Terapia de reemplazo renal |
| NA_OUT_OF_RANGE | bloqueo | Na < 100 o > 185 |
| WEIGHT_OUT_OF_RANGE | bloqueo | Peso < 30 o > 250 kg |
| HYPERGLYCEMIC_CRISIS | bloqueo | Glucosa ≥ 600 mg/dL |
| IMPLAUSIBLE_BALANCE | bloqueo | La ACT estimada cae < 50 % |
| NO_URINE_OUTPUT | advertencia + bloqueo > 6 h | Diuresis no informada |
| HYPERGLYCEMIA | advertencia | Glucosa > 250 |
| TRANSLOCATIONAL | advertencia | Na corregido normal con Na medido bajo |
| LOW_EGFR | advertencia | eGFR < 30 |
| URINE_COMPOSITION_UNKNOWN | advertencia | Diuresis > 0 sin Na/K urinario |
| HIGH_URINE_OUTPUT | advertencia | Hiponatremia con diuresis > 2 mL/kg/h |
| ODS_HIGH_RISK | advertencia | Na ≤ 105, hipopotasemia, alcoholismo, desnutrición, hepatopatía |
| OLIGURIA, NORMONATREMIA, CHRONICITY_UNKNOWN | información | — |

## 6. Alertas por escenario (umbrales configurables)

| Código | Por defecto | Rango permitido |
|---|---|---|
| OVERCORRECTION_24H (hipo, estándar) | > 10 mmol/L en 24 h | 6–12 |
| OVERCORRECTION_24H (hipo, alto riesgo) | > 8 mmol/L en 24 h | 4–10 |
| OVERCORRECTION_48H | > 18 mmol/L en 48 h | 12–20 |
| HYPER_FAST_CORRECTION | descenso > 10 mmol/L en 24 h | 6–12 |

Además: posible sobrecorrección dentro de la banda, sobrepaso a la disnatremia contraria, escenario que empeora, orina más concentrada que la solución (patrón SIADH), solución hipertónica, velocidad > 500 mL/h y balance > +3 L.

Fuentes de los límites: Verbalis et al., Am J Med 2013; Spasovski et al., Eur J Endocrinol 2014; Adrogué & Madias, NEJM 2000.

## 7. Lo que el motor NO hace

- No recomienda soluciones, volúmenes ni velocidades. Las velocidades las introduce el usuario como hipótesis.
- No modela cambios de ADH, acuaresis, desplazamientos de glucosa durante su corrección, redistribución intracelular de potasio ni diálisis.
- No calcula "volumen necesario para alcanzar un objetivo", para evitar que se lea como prescripción.
- No se ha validado con cohortes de pacientes.

## 8. Validación realizada

`npm test -w @osmoguard/engine` (53 pruebas):

- Ejemplos trabajados con las fórmulas publicadas (3 % en hiponatremia, D5W y Ringer en hipernatremia, déficit de agua libre, Katz/Hillier, Watson, CKD-EPI 2021).
- Conversiones de unidades ida y vuelta.
- Bloqueos y advertencias de aplicabilidad.
- Alertas y umbrales configurables.
- Propiedades (fast-check): monotonía según la concentración de la solución, la banda contiene la estimación, sodio constante sin entradas ni salidas, equivalencia con Adrogué-Madias en el primer litro.

**Pendiente antes de cualquier uso asistencial:** revisión independiente por nefrología/medicina interna, contraste con series clínicas reales y validación de los umbrales de alerta con la institución usuaria.
