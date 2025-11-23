import { Resend } from "resend";
import type { Env } from "../types/env";

export class ResendService {
  private resend: Resend;

  constructor(env: Env) {
    this.resend = new Resend(env.RESEND_KEY);
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
    from: string = "Weddy's Kitchen <team@support.weddyskitchen.com>"
  ) {
    const { data, error } = await this.resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("❌ Email error:", error);
      throw error;
    }

    console.log("✅ Email sent:", data?.id);
    return data;
  }

  // Helper: generate a friendly name from email
  getNameFromEmail(email?: string): string {
    if (!email) return "User";
    const namePart = email.split("@")[0] || "there";
    const displayName = namePart.replace(/[._]/g, " ");
    return displayName
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  // Send OTP email
  async sendOtpEmail(to: string, code: string) {
    const userName = this.getNameFromEmail(to);

    // Since we can't use ejs in Cloudflare Workers, use template literals
    const html = this.renderOtpEmail(userName, code);
    const text = `Hello ${userName}, your login code is ${code}. It will expire in 10 minutes. If you didn't request it, ignore this email.`;

    await this.sendEmail(
      to,
      "Your Weddy's Kitchen account verification code",
      html,
      text
    );
  }

  // Simple HTML template (replaces EJS)
  private renderOtpEmail(userName: string, code: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #FF6B35; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Weddy's Kitchen</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0;">Hello ${userName}!</h2>
              <p style="color: #666666; line-height: 1.6; margin: 0 0 30px 0;">
                Your verification code is:
              </p>
              
              <!-- OTP Code -->
              <div style="background-color: #f8f8f8; border: 2px dashed #FF6B35; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 30px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #FF6B35; letter-spacing: 8px;">${code}</span>
              </div>
              
              <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                This code will expire in <strong>10 minutes</strong>.
              </p>
              
              <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0;">
                If you didn't request this code, please ignore this email or contact our support at 0727942764.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Weddy's Kitchen. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
