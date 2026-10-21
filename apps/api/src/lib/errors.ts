export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const unauthorized = (message = "No autenticado") => new AppError(401, "UNAUTHORIZED", message);
export const notFound = (message = "Recurso no encontrado") => new AppError(404, "NOT_FOUND", message);
export const badRequest = (code: string, message: string) => new AppError(400, code, message);
export const forbidden = (message = "Acción no permitida") => new AppError(403, "FORBIDDEN", message);
