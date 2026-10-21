import type { Env } from "../env";
import { AppError } from "./errors";

/**
 * Explicaciones docentes con OpenAI (Responses API).
 * La IA NO calcula: recibe el resultado determinista del motor y lo explica.
 */
export const AI_INSTRUCTIONS = `Eres un tutor de medio interno (agua, electrolitos y ácido-base) para estudiantes de medicina y médicos de habla hispana.
Recibirás, en JSON, el resultado DETERMINISTA de un motor de cálculo basado en reglas publicadas. Explícalo con claridad didáctica.

Reglas estrictas:
1. Usa exactamente los números del JSON. No recalcules, no redondees de otra forma y no inventes valores ni datos del paciente.
2. No indiques tratamientos, fármacos, dosis, volúmenes, velocidades de infusión ni órdenes clínicas. Si fuese pertinente, recuerda que la conducta depende del equipo clínico.
3. Si el motor marca advertencias, bloqueos o baja confianza, menciónalos de forma explícita.
4. El caso es de un paciente anónimo o ficticio: habla del paciente en tercera persona ("el paciente presenta…"). Al lector, si te diriges a él, trátalo de "usted". Español neutro. Sin emojis.
5. Responde en Markdown con exactamente estas secciones:
### En una frase
### Razonamiento paso a paso
(lista numerada breve que siga los pasos del motor)
### Qué confirmar
(datos o pruebas que ayudarían a interpretar mejor; nunca tratamiento)
### Para aprender
(2 o 3 perlas docentes)
### Pregunta de repaso
(una pregunta y, debajo, su respuesta breve en cursiva)
Máximo 320 palabras.`;

const MODULE_NAME: Record<string, string> = {
  sodium: "simulación de sodio y líquidos (escenarios hipotéticos)",
  "acid-base": "gasometría / equilibrio ácido-base",
  osmolality: "osmolalidad y brecha osmolar",
  potassium: "potasio",
  calcium: "calcio",
};

export async function explainWithAi(env: Env, module: string, payload: unknown): Promise<{ text: string; model: string }> {
  if (!env.OPENAI_API_KEY) throw new AppError(503, "AI_DISABLED", "El análisis con IA no está configurado en este servidor");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        instructions: AI_INSTRUCTIONS,
        input: `Módulo: ${MODULE_NAME[module] ?? module}.\nResultado del motor (JSON):\n${JSON.stringify(payload)}`,
        max_output_tokens: 1400,
        reasoning: { effort: "low" },
        store: false,
      }),
    });
    const data = (await res.json()) as {
      error?: { message?: string };
      status?: string;
      model?: string;
      output?: { type: string; content?: { type: string; text?: string }[] }[];
    };
    if (!res.ok || data.error) throw new AppError(502, "AI_UPSTREAM", "El servicio de IA no respondió correctamente. Inténtelo de nuevo.");
    if (data.status !== "completed") throw new AppError(502, "AI_INCOMPLETE", "La explicación quedó incompleta. Inténtelo de nuevo.");
    const text = (data.output ?? [])
      .filter((o) => o.type === "message")
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === "output_text")
      .map((c) => c.text ?? "")
      .join("\n")
      .trim();
    if (!text) throw new AppError(502, "AI_EMPTY", "La IA no devolvió contenido. Inténtelo de nuevo.");
    return { text, model: data.model ?? env.OPENAI_MODEL };
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (controller.signal.aborted) throw new AppError(504, "AI_TIMEOUT", "La IA tardó demasiado en responder. Inténtelo de nuevo.");
    throw new AppError(502, "AI_UPSTREAM", "No se pudo conectar con el servicio de IA. Inténtelo de nuevo.");
  } finally {
    clearTimeout(timeout);
  }
}
