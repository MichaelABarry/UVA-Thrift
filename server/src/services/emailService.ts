import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Service function to send a verification email to the user. It constructs a verification URL containing the token and sends an email using Postmark.
export async function sendVerificationEmail(toEmail: string, verificationToken: string) {

    // Construct the verification URL that the user will click to verify their email. The token is included as a query parameter.
    const verificationUrl = `${env.APP_URL}/verify-email?token=${encodeURIComponent(verificationToken)}`;

    // In development, if no SMTP credentials are provided, log to console.
    // If credentials ARE provided, we proceed to send the real email.
    if (env.NODE_ENV === 'development' && !env.SMTP_PASS) {
        console.log(`Verification URL for ${toEmail}: ${verificationUrl}`);
        return;
    }

    console.log('------------------------------------------------');
    console.log('📧 Attempting to send email via Brevo/SMTP');
    console.log(`   Host: ${env.SMTP_HOST}`);
    console.log(`   Port: ${env.SMTP_PORT}`);
    console.log(`   User: ${env.SMTP_USER}`);
    console.log(`   Pass: ${env.SMTP_PASS ? '******' : 'Not Set'}`);
    console.log(`   From: ${env.SMTP_FROM}`);
    console.log(`   To:   ${toEmail}`);
    console.log('------------------------------------------------');

    try {
        // Configure the SMTP transporter (Brevo)
        const transporter = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verify connection configuration
        await transporter.verify();
        console.log('✅ SMTP connection verified');

        // Send the email
        const info = await transporter.sendMail({
            from: env.SMTP_FROM,
            to: toEmail,
            subject: 'Verify your UVA Thrift account',
            html: `<p>Welcome to UVA Thrift.</p><p>Click below to verify your email:</p><p><a href="${verificationUrl}">Verify Email</a></p><p>This link expires in 30 minutes.</p>`,
            text: `Welcome to UVA Thrift. Verify your email: ${verificationUrl}`,
        });

        console.log(`✅ Email sent via Brevo/SMTP to ${toEmail}. Message ID: ${info.messageId}`);
        console.log(`ℹ️  SMTP Response: ${info.response}`);

    } catch (error) {
        console.error('❌ FAILED to send email.');
        console.error('   Error Name:', (error as Error).name);
        console.error('   Error Message:', (error as Error).message);
        console.error('   Full Error:', JSON.stringify(error, null, 2));
    }
}
