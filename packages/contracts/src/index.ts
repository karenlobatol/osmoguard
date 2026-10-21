import { z } from "zod";
import { alertConfigSchema, simulationRequestSchema, type AlertConfig, type SimulationOutput, type SimulationRequest } from "@osmoguard/engine";

/** Contratos de la API compartidos por frontend y backend. */

export const emailSchema = z.string().trim().toLowerCase().email("Correo no válido").max(254);
export const passwordSchema = z
  .string()
  .min(10, "Mínimo 10 caracteres")
  .max(128, "Máximo 128 caracteres")
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "Debe contener letras y números");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nombre demasiado corto").max(80),
  email: emailSchema,
  password: passwordSchema,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Debe aceptar el uso educativo" }) }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Obligatorio").max(128),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  profession: z.string().trim().max(80).nullable().optional(),
  alertConfig: alertConfigSchema.optional(),
});

export const simulationTitleSchema = z
  .string()
  .trim()
  .min(1, "Obligatorio")
  .max(80)
  // Evita guardar identificadores evidentes (números de documento/historia largos).
  .refine((v) => !/\d{6,}/.test(v), "No incluya identificadores del paciente");

export const createSimulationSchema = z.object({
  title: simulationTitleSchema,
  notes: z.string().trim().max(1000).optional(),
  request: simulationRequestSchema,
});

export const listSimulationsQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const idParamSchema = z.object({ id: z.string().uuid() });

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateSimulationInput = z.input<typeof createSimulationSchema>;

export interface UserDto {
  id: string;
  email: string;
  name: string;
  profession: string | null;
  role: "USER" | "ADMIN";
  alertConfig: AlertConfig;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: UserDto;
}

export interface SimulationSummaryDto {
  id: string;
  title: string;
  classification: SimulationOutput["patient"]["classification"];
  status: SimulationOutput["status"];
  serumSodium: number;
  scenarioCount: number;
  engineVersion: string;
  createdAt: string;
}

export interface SimulationDetailDto extends SimulationSummaryDto {
  notes: string | null;
  request: SimulationRequest;
  output: SimulationOutput;
  /** true si la versión actual del motor difiere de la usada al guardar. */
  engineOutdated: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardStatsDto {
  total: number;
  last30Days: number;
  byClassification: Record<SimulationOutput["patient"]["classification"], number>;
  withAlerts: number;
  recent: SimulationSummaryDto[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
