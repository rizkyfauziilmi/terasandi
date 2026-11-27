import nodemailer, { type Transporter } from "nodemailer";
import { render } from "react-email";

import { VerificationEmail } from "@/emails/verification-email";

const host = process.env.SMTP_HOST ?? "localhost";
const port = Number(process.env.SMTP_PORT ?? 1025);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM ?? "Terasandi <noreply@localhost>";

let transporter: Transporter | undefined;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      // Port 465 uses implicit TLS; 587/1025 upgrade with STARTTLS when available.
      secure: port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }

  return transporter;
}

export async function sendVerificationEmailMail({
  to,
  url,
}: {
  to: string;
  url: string;
}) {
  try {
    const email = <VerificationEmail url={url} />;
    const [html, text] = await Promise.all([
      render(email),
      render(email, { plainText: true }),
    ]);

    const info = await getTransporter().sendMail({
      from,
      to,
      subject: "Verify your email address — Terasandi",
      text,
      html,
    });

    console.info("[email] verification email sent", info.messageId);
  } catch (error) {
    // Email delivery must never change the timing/outcome of an auth request.
    console.error("[email] failed to send verification email", error);
  }
}
