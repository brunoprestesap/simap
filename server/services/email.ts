import nodemailer from "nodemailer";
import { emailLogger } from "@/lib/logger";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? "587"),
  secure: false,
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
  tls: {
    rejectUnauthorized: false,
  },
  // Sem estes timeouts uma queda de SMTP pendura conexões indefinidamente, vazando handles
  // do Node em fluxos fire-and-forget (notificação de movimentação, link de confirmação).
  connectionTimeout: 5_000,
  greetingTimeout: 5_000,
  socketTimeout: 10_000,
});

export async function enviarEmail(
  para: string,
  assunto: string,
  html: string,
): Promise<void> {
  const from = process.env.SMTP_FROM ?? "simap@jfap.jus.br";

  try {
    await transporter.sendMail({
      from: `"SIMAP" <${from}>`,
      to: para,
      subject: assunto,
      html,
    });
    emailLogger.info({ para, assunto }, "enviado");
  } catch (error) {
    emailLogger.error({ para, err: error }, "erro ao enviar");
  }
}
