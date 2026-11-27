import nodemailer, { type Transporter } from "nodemailer";

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
    const info = await getTransporter().sendMail({
      from,
      to,
      subject: "Verify your email address",
      text: [
        "Welcome to Terasandi.",
        "",
        "Open this link to verify your email address:",
        url,
        "",
        "This link expires in 1 hour. If you did not request it, you can ignore this email.",
      ].join("\n"),
      html: `
        <p>Welcome to Terasandi.</p>
        <p>Open this link to verify your email address:</p>
        <p><a href="${url}">Verify email address</a></p>
        <p>This link expires in 1 hour. If you did not request it, you can ignore this email.</p>
      `,
    });

    console.info("[email] verification email sent", info.messageId);
  } catch (error) {
    // Email delivery must never change the timing/outcome of an auth request.
    console.error("[email] failed to send verification email", error);
  }
}
