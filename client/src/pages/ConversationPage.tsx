import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../hooks/useAuth';
import { getConversation, sendMessage } from '../services/conversationService';
import type { Conversation, Message } from '../types/conversation';
import { MeetupAreaPicker } from '../components/MeetupAreaPicker';
import {
    createContactShareMessage,
    parseContactShareMessage,
    parseMeetupMessage,
    type ContactShareData,
    type MeetupData
} from '../utils/conversationContent';

const POLL_INTERVAL_MS = 5000;

const MEETUP_RADIUS_METERS = 100;
const MEETUP_AREA_COLOR = '#5f7494';
const meetupPinIcon = L.icon({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}

function getLatestMeetup(messages: Message[]): MeetupData | null {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const meetup = parseMeetupMessage(messages[index].content);
        if (meetup) {
            return meetup;
        }
    }

    return null;
}

function getLatestContactShare(messages: Message[], senderId: string | null | undefined): ContactShareData | null {
    if (!senderId) return null;

    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message.senderId !== senderId) continue;

        const sharedContact = parseContactShareMessage(message.content);
        if (sharedContact) {
            return sharedContact;
        }
    }

    return null;
}

function formatPossessiveName(name: string): string {
    return name.endsWith('s') ? `${name}'` : `${name}'s`;
}

function getOtherPartyFirstName(messages: Message[], senderId: string | null | undefined): string | null {
    if (!senderId) return null;

    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message.senderId !== senderId) continue;

        const senderName = message.senderName?.trim();
        if (senderName) {
            return senderName.split(/\s+/)[0];
        }

        const emailName = message.senderEmail.split('@')[0]?.trim();
        if (emailName) {
            return emailName.charAt(0).toUpperCase() + emailName.slice(1);
        }
    }

    return null;
}

// Renders a chat bubble — either a regular text bubble or an embedded map bubble.
function MessageBubble({ msg, isOwn }: { msg: Message; isOwn: boolean }) {
    const [isMapOpen, setIsMapOpen] = useState(false);
	const [copied, setCopied] = useState(false);
    const meetup = parseMeetupMessage(msg.content);

	function handleCopyAddress() {
        const address = meetup?.address ?? meetup?.label ?? '';
        void navigator.clipboard.writeText(address).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    if (meetup) {
        const delta = 0.004;
        const bbox = `${meetup.lng - delta},${meetup.lat - delta},${meetup.lng + delta},${meetup.lat + delta}`;
        const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${meetup.lat},${meetup.lng}`;

        return (
            <>
                <div className={`conv-bubble conv-bubble-meetup ${isOwn ? 'conv-bubble-meetup-own' : ''}`}>
					<div className="conv-bubble-meetup-header">
                    <p className="conv-bubble-meetup-label">
                        📍 <strong>Meet-up area suggested</strong>
                    </p>
					<button
                            type="button"
                            className="conv-bubble-meetup-copy-btn"
                            onClick={handleCopyAddress}
                            title="Copy address"
                        >
                            {copied ? '✓ Copied' : 'Copy Address'}
                        </button>
					</div>

                    <button
                        type="button"
                        className="conv-bubble-meetup-map-button"
                        onClick={() => setIsMapOpen(true)}
                        aria-label={`Open larger map for meetup near ${meetup.label}`}
                    >
                        <div className="conv-bubble-meetup-map-wrap">
                            <iframe
                                className="conv-bubble-meetup-map"
                                src={src}
                                title={`Meet-up area near ${meetup.label}`}
                                loading="lazy"
                            />
                            <span className="conv-bubble-meetup-map-overlay">
                                Click map to enlarge
                            </span>
                        </div>
                    </button>

                </div>

                {isMapOpen ? (
                    <div
                        className="conv-meetup-modal-backdrop"
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Large meetup map near ${meetup.label}`}
                    >
                        <div className="conv-meetup-modal">
                            <div className="conv-meetup-modal-header">
                                <div>
                                    <h3 className="conv-meetup-modal-title">Meet-up Area</h3>
                                    <p className="conv-meetup-modal-subtitle">
										{meetup.address ?? meetup.label}
									</p>
                                </div>
								<div className="conv-meetup-modal-actions">
                                    <button
                                        type="button"
                                        className="button button-secondary"
                                        onClick={handleCopyAddress}
                                    >
                                        {copied ? '✓ Copied!' : '📋 Copy Address'}
                                    </button>
                                <button
                                    type="button"
                                    className="button button-secondary"
                                    onClick={() => setIsMapOpen(false)}
                                >
                                    Close
                                </button>
								</div>
                            </div>

                            <div className="conv-meetup-modal-leaflet-wrap">
                                <MapContainer
                                    center={[meetup.lat, meetup.lng]}
                                    zoom={16}
                                    scrollWheelZoom={true}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        attribution="&copy; OpenStreetMap contributors"
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <Circle
                                        center={[meetup.lat, meetup.lng]}
                                        radius={MEETUP_RADIUS_METERS}
                                        pathOptions={{
                                            color: MEETUP_AREA_COLOR,
                                            fillColor: MEETUP_AREA_COLOR,
                                            fillOpacity: 0.14,
                                            weight: 2
                                        }}
                                    />
                                    <Marker
                                        position={[meetup.lat, meetup.lng]}
                                        icon={meetupPinIcon}
                                    />
                                </MapContainer>
                            </div>

                            <p className="conv-meetup-modal-note">
                                Shaded circle = approximate area. Confirm the exact handoff spot in chat.
                            </p>
                        </div>
                    </div>
                ) : null}
            </>
        );
    }

    return <div className="conv-bubble">{msg.content}</div>;
}

export function ConversationPage() {
    const { user, loading } = useAuth();
    const { conversationId } = useParams();
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loadingConversation, setLoadingConversation] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [sharePhone, setSharePhone] = useState(false);
    const [shareVenmo, setShareVenmo] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
    const previousMessageCountRef = useRef(0);
    const conversationClosed = Boolean(conversation?.isClosed);
    const otherPartyId = conversation
        ? (user?.id === conversation.buyerId ? conversation.sellerId : conversation.buyerId)
        : null;
    const visibleMessages = useMemo(
        () => messages.filter((message) => !parseContactShareMessage(message.content)),
        [messages]
    );
    const currentMeetup = useMemo(() => getLatestMeetup(messages), [messages]);
    const mySharedContact = useMemo(() => getLatestContactShare(messages, user?.id), [messages, user?.id]);
    const otherSharedContact = useMemo(
        () => getLatestContactShare(messages, otherPartyId),
        [messages, otherPartyId]
    );
    const otherPartyFirstName = useMemo(
        () => getOtherPartyFirstName(messages, otherPartyId),
        [messages, otherPartyId]
    );
    const sharedWithYouTitle = otherPartyFirstName
        ? `${formatPossessiveName(otherPartyFirstName)} Contact Info`
        : 'Shared With You';
    const currentMeetupLocation = useMemo(
        () => currentMeetup
            ? {
                lat: currentMeetup.lat,
                lng: currentMeetup.lng,
                label: currentMeetup.label,
                address: currentMeetup.address ?? currentMeetup.label
            }
            : null,
        [currentMeetup?.address, currentMeetup?.label, currentMeetup?.lat, currentMeetup?.lng]
    );

    useEffect(() => {
        setSharePhone(Boolean(user?.phoneNumber && mySharedContact?.phoneNumber === user.phoneNumber));
        setShareVenmo(Boolean(user?.venmoUsername && mySharedContact?.venmoUsername === user.venmoUsername));
    }, [mySharedContact?.phoneNumber, mySharedContact?.venmoUsername, user?.phoneNumber, user?.venmoUsername]);

    useEffect(() => {
        async function load() {
            if (!conversationId || !user?.isEmailVerified) {
                setLoadingConversation(false);
                return;
            }
            setLoadingConversation(true);
            setError(null);
            try {
                const response = await getConversation(conversationId);
                setConversation(response.conversation);
                setMessages(response.conversation.messages);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to load conversation.');
            } finally {
                setLoadingConversation(false);
            }
        }
        void load();
    }, [conversationId, user?.isEmailVerified]);

    const pollMessages = useCallback(async () => {
        if (!conversationId) return;
        try {
            const response = await getConversation(conversationId);
            setConversation(response.conversation);
            setMessages(response.conversation.messages);
        } catch {
            // Silently ignore poll failures
        }
    }, [conversationId]);

    useEffect(() => {
        if (!conversationId || !user?.isEmailVerified) return;
        pollRef.current = setInterval(() => { void pollMessages(); }, POLL_INTERVAL_MS);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [conversationId, user?.isEmailVerified, pollMessages]);

    useEffect(() => {
        const messageContainer = messagesContainerRef.current;
        const previousCount = previousMessageCountRef.current;
        const hasLoadedMessages = previousCount === 0 && visibleMessages.length > 0;
        const hasNewMessages = visibleMessages.length > previousCount;

        if (messageContainer && (hasLoadedMessages || hasNewMessages)) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }

        previousMessageCountRef.current = visibleMessages.length;
    }, [visibleMessages]);

    async function handleShareContact(nextSharePhone: boolean, nextShareVenmo: boolean) {
        if (!conversationId || conversationClosed) return;
        const content = createContactShareMessage({
            phoneNumber: nextSharePhone && user?.phoneNumber ? user.phoneNumber : undefined,
            venmoUsername: nextShareVenmo && user?.venmoUsername ? user.venmoUsername : undefined
        });
        setSending(true);
        setSendError(null);
        try {
            const response = await sendMessage(conversationId, content);
            setMessages((prev) => [...prev, response.message]);
        } catch (err) {
            setSendError(err instanceof Error ? err.message : 'Unable to send.');
            throw err;
        } finally {
            setSending(false);
        }
    }

    async function handleToggleContact(field: 'phone' | 'venmo') {
        if (sending || conversationClosed) return;

        const canSharePhone = Boolean(user?.phoneNumber);
        const canShareVenmo = Boolean(user?.venmoUsername);

        if (field === 'phone' && !canSharePhone) return;
        if (field === 'venmo' && !canShareVenmo) return;

        const nextSharePhone = field === 'phone' ? !sharePhone : sharePhone;
        const nextShareVenmo = field === 'venmo' ? !shareVenmo : shareVenmo;
        const previousSharePhone = sharePhone;
        const previousShareVenmo = shareVenmo;

        setSharePhone(nextSharePhone);
        setShareVenmo(nextShareVenmo);

        try {
            await handleShareContact(nextSharePhone, nextShareVenmo);
        } catch {
            setSharePhone(previousSharePhone);
            setShareVenmo(previousShareVenmo);
        }
    }

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!conversationId || !messageText.trim() || conversationClosed) return;
        setSending(true);
        setSendError(null);
        try {
            const response = await sendMessage(conversationId, messageText.trim());
            setMessages((prev) => [...prev, response.message]);
            setMessageText('');
        } catch (err) {
            setSendError(err instanceof Error ? err.message : 'Unable to send message.');
        } finally {
            setSending(false);
        }
    }

    // When MeetupAreaPicker confirms a location, send it as a message immediately
    // 1. The MEETUP:encoded map bubble so both users can see the pin visually
    // 2. A plain text message with the full address so it can be copied into Maps/GPS

    async function handleLocationConfirmed(encodedMessage: string) {
        if (!conversationId || conversationClosed) return;
        setSending(true);
        setSendError(null);
        try {

			// Send the map bubble first
            const mapResponse = await sendMessage(conversationId, encodedMessage);
            setMessages((prev) => [...prev, mapResponse.message]);

            // Parse the address out of the encoded payload and send it as plain text
            const payload = encodedMessage.startsWith('MEETUP:')
                ? (JSON.parse(encodedMessage.slice('MEETUP:'.length)) as { address?: string; label?: string })
                : null;
            const address = payload?.address ?? payload?.label;
            if (address) {
                const addrResponse = await sendMessage(
                    conversationId,
                    `📍 Address: ${address}`
                );
                setMessages((prev) => [...prev, addrResponse.message]);
            }
        } catch (err) {
            setSendError(err instanceof Error ? err.message : 'Unable to send location.');
        } finally {
            setSending(false);
        }
    }

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    return (
        <main className="page-content">
            <div className="page-container conv-shell">
                <div className="conv-header">
                    <Link className="button button-secondary" to="/messages">
                        ← Back to Messages
                    </Link>
                    {conversation ? (
                        <h1 className="conv-title">{conversation.listingName}</h1>
                    ) : null}
                </div>

                {loadingConversation ? <p className="loading-spinner">Loading conversation...</p> : null}
                {error ? <p className="status status-error">{error}</p> : null}

                {conversation && !loadingConversation ? (
                    <>
                        <div className="conv-body">
                            <div className="conv-main">
                                <div className="conv-listing-card">
                                    {conversation.listingImageUrl ? (
                                        <img
                                            className="conv-listing-thumb"
                                            src={conversation.listingImageUrl}
                                            alt={conversation.listingName}
                                        />
                                    ) : (
                                        <div className="conv-listing-thumb-placeholder">No image</div>
                                    )}
                                    <div className="conv-listing-info">
                                        <span className="conv-listing-name">{conversation.listingName}</span>
                                        <span className="conv-listing-price">
                                            ${conversation.listingPrice.toFixed(2)}
                                        </span>
                                    </div>
                                    {!conversation.isClosed && conversation.listingId ? (
                                        <Link
                                            className="button button-secondary"
                                            to={`/listings/${conversation.listingId}`}
                                        >
                                            View Listing
                                        </Link>
                                    ) : (
                                        <span className="conv-listing-deleted">Listing removed</span>
                                    )}
                                </div>

                                {conversation.isClosed ? (
                                    <div className="conv-closed-banner" role="status" aria-live="polite">
                                        This item has been removed from the marketplace. The conversation is now closed,
                                        so no new messages can be sent.
                                    </div>
                                ) : null}

                                <div
                                    className="conv-messages"
                                    aria-label="Conversation messages"
                                    aria-live="polite"
                                    ref={messagesContainerRef}
                                >
                                    {visibleMessages.length === 0 ? (
                                        <p className="conv-no-messages">No messages yet. Say hello!</p>
                                    ) : null}
                                    {visibleMessages.map((msg) => {
                                        const isOwn = msg.senderId === user?.id;
                                        return (
                                            <div
                                                key={msg.id}
                                                className={`conv-message ${isOwn ? 'conv-message-own' : 'conv-message-other'}`}
                                            >
                                                {!isOwn ? (
                                                    <div
                                                        className="conv-avatar"
                                                        aria-label={`${msg.senderEmail}'s avatar`}
                                                    >
                                                        {msg.senderInitial}
                                                    </div>
                                                ) : null}
                                                <div className="conv-message-body">
                                                    {!isOwn ? (
                                                        <span className="conv-sender">
                                                            {msg.senderName ?? msg.senderEmail}
                                                        </span>
                                                    ) : null}
                                                    {/* MessageBubble auto-detects MEETUP: messages and renders a map */}
                                                    <MessageBubble msg={msg} isOwn={isOwn} />
                                                    <span className="conv-time">{formatTime(msg.createdAt)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                </div>

                                {sendError ? <p className="status status-error">{sendError}</p> : null}

                                <form className="conv-send-form" onSubmit={handleSend}>
                                    <input
                                        className="input conv-send-input"
                                        type="text"
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        placeholder={conversationClosed ? 'This conversation has ended.' : 'Type a message...'}
                                        disabled={sending || conversationClosed}
                                        maxLength={2000}
                                    />
                                    <button
                                        className="button button-accent"
                                        type="submit"
                                        disabled={sending || conversationClosed || !messageText.trim()}
                                    >
                                        {sending ? 'Sending...' : 'Send'}
                                    </button>
                                </form>
                            </div>

                            <div className="conv-sidebar-stack">
                                <div className="conv-share-panel">
                                    <div className="conv-share-section">
                                        <p className="conv-share-section-title">Share Your Contact Info</p>
                                        <button
                                            type="button"
                                            className={`conv-share-option${sharePhone ? ' conv-share-option-selected' : ''}${!user?.phoneNumber ? ' conv-share-option-disabled' : ''}`}
                                            onClick={() => { void handleToggleContact('phone'); }}
                                            disabled={!user?.phoneNumber || sending || conversationClosed}
                                        >
                                            <span className="conv-share-option-copy">
                                                <span>Phone Number</span>
                                                <span>{user?.phoneNumber ?? 'Add in profile to share'}</span>
                                            </span>
                                            <span className="conv-share-option-status">
                                                {sharePhone ? 'Shared' : 'Hidden'}
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            className={`conv-share-option${shareVenmo ? ' conv-share-option-selected' : ''}${!user?.venmoUsername ? ' conv-share-option-disabled' : ''}`}
                                            onClick={() => { void handleToggleContact('venmo'); }}
                                            disabled={!user?.venmoUsername || sending || conversationClosed}
                                        >
                                            <span className="conv-share-option-copy">
                                                <span>Venmo Username</span>
                                                <span>{user?.venmoUsername ? `@${user.venmoUsername}` : 'Add in profile to share'}</span>
                                            </span>
                                            <span className="conv-share-option-status">
                                                {shareVenmo ? 'Shared' : 'Hidden'}
                                            </span>
                                        </button>
                                    </div>

                                    <div className="conv-share-section">
                                        <p className="conv-share-section-title">{sharedWithYouTitle}</p>
                                        <div className="conv-share-card-grid">
                                            <div className="conv-share-card-item">
                                                <span className="conv-share-card-label">Phone</span>
                                                <span className="conv-share-card-value">
                                                    {otherSharedContact?.phoneNumber ?? 'Not shared'}
                                                </span>
                                            </div>
                                            <div className="conv-share-card-item">
                                                <span className="conv-share-card-label">Venmo</span>
                                                <span className="conv-share-card-value">
                                                    {otherSharedContact?.venmoUsername ? `@${otherSharedContact.venmoUsername}` : 'Not shared'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                 <div className={`conv-meetup-panel${conversationClosed ? ' conv-meetup-panel-disabled' : ''}`}>
                                    {conversationClosed ? (
                                        <p className="conv-meetup-closed-message">
                                            Meetup suggestions are disabled because this listing has been removed.
                                        </p>
                                    ) : (
                                        <MeetupAreaPicker
                                            onLocationConfirmed={handleLocationConfirmed}
                                            currentLocation={currentMeetupLocation}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </main>
    );
}