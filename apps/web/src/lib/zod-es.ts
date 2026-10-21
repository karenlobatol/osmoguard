import { z } from "zod";

/** Mensajes de validación en español para todos los esquemas usados en la interfaz. */
z.setErrorMap((issue, ctx) => {
  if (issue.code === "invalid_type") return { message: issue.received === "undefined" || issue.received === "nan" ? "Obligatorio" : "Valor no válido" };
  if (issue.code === "too_small" && issue.type === "number") return { message: `Mínimo ${issue.minimum}` };
  if (issue.code === "too_big" && issue.type === "number") return { message: `Máximo ${issue.maximum}` };
  return { message: ctx.defaultError };
});
