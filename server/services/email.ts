import nodemailer from "nodemailer";

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
    console.log(`[EMAIL] Enviado para ${para}: ${assunto}`);
  } catch (error) {
    console.error(`[EMAIL] Erro ao enviar para ${para}:`, error);
  }
}
