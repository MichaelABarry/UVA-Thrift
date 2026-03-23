import nodemailer from 'nodemailer';
import { env } from '../config/env';

type ListingEmailPayload = {
    toEmail: string;
    listing: {
        id: string;
        name: string;
        description: string;
        price: number;
        categories: string[];
        imageUrl: string | null;
        createdAt: string;
    };
};

function createTransporter() {
    return nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: false,
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
        },
    });
}

// Service function to send a verification email to the user. It constructs a verification URL containing the token and sends an email through Brevo SMTP.
export async function sendVerificationEmail(toEmail: string, verificationToken: string) {

    // Construct the verification URL that the user will click to verify their email. The token is included as a query parameter.
    const verificationUrl = `${env.APP_URL}/verify-email?token=${encodeURIComponent(verificationToken)}`;

    // In development, if no SMTP credentials are provided, log to console.
    // If credentials ARE provided, we proceed to send the real email.
    if (env.NODE_ENV === 'development' && !env.SMTP_PASS) {
        console.log(`Verification URL for ${toEmail}: ${verificationUrl}`);
        return;
    }

    const transporter = createTransporter();

    // Send the email
    await transporter.sendMail({
        from: env.SMTP_FROM,
        to: toEmail,
        subject: 'Verify your UVA Thrift account',
        html: `<p>Welcome to UVA Thrift.</p><p>Click below to verify your email:</p><p><a href="${verificationUrl}">Verify Email</a></p><p>This link expires in 30 minutes.</p>`,
        text: `Welcome to UVA Thrift. Verify your email: ${verificationUrl}`,
    });
}

export async function sendListingNotificationEmail({ toEmail, listing }: ListingEmailPayload) {
    const listingUrl = `${env.APP_URL}/listings/${encodeURIComponent(listing.id)}`;

    if (env.NODE_ENV === 'development' && !env.SMTP_PASS) {
        console.log(`Listing notification for ${toEmail}: ${listingUrl}`);
        return;
    }

    const transporter = createTransporter();

    await transporter.sendMail({
        from: env.SMTP_FROM,
        to: toEmail,
        subject: `New UVA Thrift listing: ${listing.name}`,
        html: `
            <p>A new listing matched one of your saved alerts on UVA Thrift.</p>
            <p><strong>${listing.name}</strong></p>
            <p>${listing.description}</p>
            <p>Price: $${listing.price.toFixed(2)}</p>
            <p>Categories: ${listing.categories.join(', ')}</p>
            <p><a href="${listingUrl}">View listing</a></p>
        `,
        text: `A new listing matched one of your saved alerts on UVA Thrift.

${listing.name}
${listing.description}
Price: $${listing.price.toFixed(2)}
Categories: ${listing.categories.join(', ')}
View listing: ${listingUrl}`
    });
}
