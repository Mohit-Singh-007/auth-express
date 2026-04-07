import { env } from '../config/env';

export const verificationEmailTemplate = (name: string, token: string) => ({
  subject: 'Verify your email address',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4F46E5;">Hey ${name}, welcome!</h2>
      <p>Please verify your email address by clicking the button below.</p>
      <p>This link expires in <strong>24 hours</strong>.</p>
      <a href="${env.CLIENT_URL}/verify-email?token=${token}"
         style="display: inline-block; padding: 12px 24px; background: #4F46E5;
                color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Verify Email
      </a>
      <p style="color: #888; font-size: 12px;">
        If you didn't create an account, ignore this email.
      </p>
    </div>
  `,
});

export const passwordResetEmailTemplate = (name: string, token: string) => ({
  subject: 'Reset your password',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #4F46E5;">Password reset request</h2>
      <p>Hey ${name}, we received a request to reset your password.</p>
      <p>This link expires in <strong>15 minutes</strong>.</p>
      <a href="${env.CLIENT_URL}/reset-password?token=${token}"
         style="display: inline-block; padding: 12px 24px; background: #4F46E5;
                color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Reset Password
      </a>
      <p style="color: #888; font-size: 12px;">
        If you didn't request this, ignore this email — your password won't change.
      </p>
    </div>
  `,
});