export type ContactShareData = {
    phoneNumber?: string;
    venmoUsername?: string;
};

export type MeetupData = {
    lat: number;
    lng: number;
    label: string;
    address?: string;
};

export function parseMeetupMessage(content: string): MeetupData | null {
    if (!content.startsWith('MEETUP:')) return null;

    try {
        return JSON.parse(content.slice('MEETUP:'.length)) as MeetupData;
    } catch {
        return null;
    }
}

export function createContactShareMessage(data: ContactShareData): string {
    return `CONTACT:${JSON.stringify(data)}`;
}

function parseLegacyContactShareMessage(content: string): ContactShareData | null {
    if (!content.startsWith('Here is my contact/payment info:')) {
        return null;
    }

    const phoneMatch = content.match(/^Phone:\s*(.+)$/m);
    const venmoMatch = content.match(/^Venmo:\s*@?(.+)$/m);
    const parsed = {
        phoneNumber: phoneMatch?.[1]?.trim(),
        venmoUsername: venmoMatch?.[1]?.trim()
    };

    if (!parsed.phoneNumber && !parsed.venmoUsername) {
        return null;
    }

    return parsed;
}

export function parseContactShareMessage(content: string): ContactShareData | null {
    if (content.startsWith('CONTACT:')) {
        try {
            const parsed = JSON.parse(content.slice('CONTACT:'.length)) as ContactShareData;
            return parsed;
        } catch {
            return null;
        }
    }

    return parseLegacyContactShareMessage(content);
}

export function formatConversationPreview(content: string | null): string | null {
    if (!content) return content;
    if (parseMeetupMessage(content)) return 'Meet-up location shared';
    if (parseContactShareMessage(content)) return 'Contact information updated';
    return content;
}