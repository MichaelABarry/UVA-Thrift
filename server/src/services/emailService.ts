import postmark from 'postmark';
import { env } from '../config/env';

//const client = new postmark.ServerClient(env.POSTMARK_SERVER_TOKEN);

export async function sendVerificationEmail(toEmail: string, verificationToken: string) {
  const verificationUrl = `${env.APP_URL}/verify-email?token=${encodeURIComponent(verificationToken)}`;

  console.log(`Verification URL for ${toEmail}: ${verificationUrl}`);

  /*await client.sendEmail({
    From: env.POSTMARK_FROM_EMAIL,
    To: toEmail,
    Subject: 'Verify your UVA Thrift account',
    HtmlBody: `<p>Welcome to UVA Thrift.</p><p>Click below to verify your email:</p><p><a href="${verificationUrl}">Verify Email</a></p><p>This link expires in 30 minutes.</p>`,
    TextBody: `Welcome to UVA Thrift. Verify your email: ${verificationUrl}`
  });*/
}
