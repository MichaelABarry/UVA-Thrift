import postmark from 'postmark';
import { env } from '../config/env';

// Service function to send a verification email to the user. It constructs a verification URL containing the token and sends an email using Postmark.
export async function sendVerificationEmail(toEmail: string, verificationToken: string) {

    // Construct the verification URL that the user will click to verify their email. The token is included as a query parameter.
    const verificationUrl = `${env.APP_URL}/verify-email?token=${encodeURIComponent(verificationToken)}`;

    // In development, instead of sending an email, we log the verification URL to the console for easier testing.
    if (env.NODE_ENV === 'development') {
        console.log(`Verification URL for ${toEmail}: ${verificationUrl}`);
        return;
    }

    // In production, send the verification email using Postmark. The email includes both HTML and plain text versions of the message, containing the verification link.
    if (env.NODE_ENV === 'production') {

        /*const client = new postmark.ServerClient(env.POSTMARK_SERVER_TOKEN);

        await client.sendEmail({
            From: env.POSTMARK_FROM_EMAIL,
            To: toEmail,
            Subject: 'Verify your UVA Thrift account',
            HtmlBody: `<p>Welcome to UVA Thrift.</p><p>Click below to verify your email:</p><p><a href="${verificationUrl}">Verify Email</a></p><p>This link expires in 30 minutes.</p>`,
            TextBody: `Welcome to UVA Thrift. Verify your email: ${verificationUrl}`
        });*/
    }
}
