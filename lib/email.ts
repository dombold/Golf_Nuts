import nodemailer from "nodemailer";

let transport: nodemailer.Transporter | null = null;

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      requireTLS: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transport;
}

export async function sendWelcomeEmail(to: string, firstName: string) {
  const appUrl = process.env.NEXTAUTH_URL ?? "";
  await getTransport().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Welcome to Golf Nuts 🏌️",
    text: [
      `Hi ${firstName},`,
      "",
      "Welcome to Golf Nuts — Older = Wiser.",
      "",
      `Head to your dashboard to start scoring rounds: ${appUrl}/dashboard`,
      "",
      "── ADD GOLF NUTS TO YOUR HOME SCREEN ──",
      "",
      "Android (Chrome)",
      "Open the app in Chrome → tap the ⋮ menu (top-right) → tap 'Add to Home screen'.",
      "",
      "iPhone / iPad (Safari)",
      "Open the app in Safari → tap the Share button ⬆ at the bottom → tap 'Add to Home Screen'.",
      "",
      "Once installed it runs full-screen, just like a native app.",
      "",
      "See you on the fairway,",
      "The Golf Nuts team",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#ffffff;">

        <!-- Header -->
        <div style="background:#1a4731;padding:32px 24px;text-align:center;border-radius:8px 8px 0 0;">
          <img src="${appUrl}/golf_nuts_badge.jpg" alt="Golf Nuts" width="120" height="120"
               style="display:block;margin:0 auto;border-radius:12px;" />
        </div>

        <!-- Body -->
        <div style="padding:32px 24px;">
          <p style="color:#111827;font-size:16px;margin:0 0 8px;">Hi ${firstName},</p>
          <p style="color:#374151;font-size:15px;margin:0 0 24px;">
            Welcome to Golf Nuts! You're all set to start tracking rounds, recording scores, and keeping your mates honest on the handicap.
          </p>

          <!-- CTA -->
          <div style="text-align:center;margin-bottom:32px;">
            <a href="${appUrl}/dashboard"
               style="display:inline-block;background:#15803d;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;">
              Go to Dashboard
            </a>
          </div>

          <!-- Divider -->
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 28px;" />

          <!-- Home screen section -->
          <p style="color:#111827;font-weight:700;font-size:15px;margin:0 0 4px;">
            📲 Add Golf Nuts to your home screen
          </p>
          <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">
            Install it once and it runs full-screen, just like a native app — no browser bar in the way.
          </p>

          <!-- Android -->
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:12px;">
            <p style="color:#111827;font-weight:600;font-size:14px;margin:0 0 6px;">🤖 Android (Chrome)</p>
            <ol style="color:#374151;font-size:14px;margin:0;padding-left:20px;line-height:1.7;">
              <li>Open the app in <strong>Chrome</strong></li>
              <li>Tap the <strong>⋮ menu</strong> in the top-right corner</li>
              <li>Tap <strong>"Add to Home screen"</strong> and confirm</li>
            </ol>
          </div>

          <!-- iOS -->
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
            <p style="color:#111827;font-weight:600;font-size:14px;margin:0 0 6px;">🍎 iPhone / iPad (Safari)</p>
            <ol style="color:#374151;font-size:14px;margin:0;padding-left:20px;line-height:1.7;">
              <li>Open the app in <strong>Safari</strong></li>
              <li>Tap the <strong>Share button ⬆</strong> at the bottom of the screen</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>Add</strong> to confirm</li>
            </ol>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">Golf Nuts &mdash; See you on the fairway ⛳</p>
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await getTransport().sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: "Golf Nuts — reset your password",
    text: `Click the link below to reset your Golf Nuts password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you didn't request a password reset, you can safely ignore this email.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <h2 style="color:#1a4731;margin-bottom:8px;">Reset your password</h2>
        <p style="color:#374151;margin-bottom:24px;">
          Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#15803d;color:#fff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">
          Reset password
        </a>
        <p style="color:#9ca3af;font-size:13px;margin-top:24px;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:8px;">
          Or copy this link into your browser:<br/>
          <span style="color:#374151;word-break:break-all;">${resetUrl}</span>
        </p>
      </div>
    `,
  });
}
