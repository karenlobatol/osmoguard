import nodemailer, { type Transporter } from "nodemailer";
import type { FastifyBaseLogger } from "fastify";
import type { Env } from "../env";

export interface Mailer {
  sendPasswordReset(to: string, link: string): Promise<void>;
}

export function createMailer(env: Env, log: FastifyBaseLogger): Mailer {
  const transport: Transporter | null = env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null;
  return {
    async sendPasswordReset(to, link) {
      if (!transport) {
        if (env.NODE_ENV === "production") {
          log.warn("SMTP no configurado: no se pudo enviar el correo de recuperación");
          return;
        }
        // Solo en desarrollo: facilita probar el flujo sin servidor de correo.
        log.info(`[dev] Enlace de recuperación para ${to}: ${link}`);
        return;
      }
      await transport.sendMail({
        from: env.MAIL_FROM,
        to,
        subject: "Osmoguard · Restablecer contraseña",
        text: `Se solicitó restablecer su contraseña de Osmoguard.\n\nEnlace (válido 30 minutos, un solo uso):\n${link}\n\nSi no lo solicitó, ignore este mensaje.`,
      });
    },
  };
}
