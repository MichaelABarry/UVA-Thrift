import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Circle, MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../hooks/useAuth';
import { getConversation, sendMessage } from '../services/conversationService';
import type { Conversation, Message } from '../types/conversation';
import { MeetupAreaPicker } from '../components/MeetupAreaPicker';

const POLL_INTERVAL_MS = 5000;

const MEETUP_RADIUS_METERS = 100;
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

// Parse a MEETUP: encoded message into its data, or return null for normal messages.
type MeetupData = { lat: number; lng: number; label: string; address?: string };

function parseMeetupMessage(content: string): MeetupData | null {
    if (!content.startsWith('MEETUP:')) return null;
    try {
        return JSON.parse(content.slice('MEETUP:'.length)) as MeetupData;
    } catch {
        return null;
    }
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
                                            color: '#E57200',
                                            fillColor: '#E57200',
                                            fillOpacity: 0.18,
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
                                Orange circle = approximate area. Confirm exact spot in chat.
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
    const bottomRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const pollMessages = useCallback(async () => {
        if (!conversationId) return;
        try {
            const response = await getConversation(conversationId);
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

    async function handleShareContact() {
        if (!conversationId) return;
        const lines: string[] = ['Here is my contact/payment info:'];
        if (sharePhone && user?.phoneNumber) lines.push(`Phone: ${user.phoneNumber}`);
        if (shareVenmo && user?.venmoUsername) lines.push(`Venmo: @${user.venmoUsername}`);
        const content = lines.join('\n');
        setSending(true);
        setSendError(null);
        try {
            const response = await sendMessage(conversationId, content);
            setMessages((prev) => [...prev, response.message]);
            setSharePhone(false);
            setShareVenmo(false);
        } catch (err) {
            setSendError(err instanceof Error ? err.message : 'Unable to send.');
        } finally {
            setSending(false);
        }
    }

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!conversationId || !messageText.trim()) return;
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
        if (!conversationId) return;
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
                                    {conversation.listingId ? (
                                        <Link
                                            className="button button-secondary"
                                            to={`/listings/${conversation.listingId}`}
                                        >
                                            View Listing
                                        </Link>
                                    ) : (
                                        <span className="conv-listing-deleted">Listing deleted</span>
                                    )}
                                </div>

                                <div
                                    className="conv-messages"
                                    aria-label="Conversation messages"
                                    aria-live="polite"
                                >
                                    {messages.length === 0 ? (
                                        <p className="conv-no-messages">No messages yet. Say hello!</p>
                                    ) : null}
                                    {messages.map((msg) => {
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
                                                        <span className="conv-sender">{msg.senderEmail}</span>
                                                    ) : null}
                                                    {/* MessageBubble auto-detects MEETUP: messages and renders a map */}
                                                    <MessageBubble msg={msg} isOwn={isOwn} />
                                                    <span className="conv-time">{formatTime(msg.createdAt)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={bottomRef} />
                                </div>

                                {sendError ? <p className="status status-error">{sendError}</p> : null}

                                <form className="conv-send-form" onSubmit={handleSend}>
                                    <input
                                        className="input conv-send-input"
                                        type="text"
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        placeholder="Type a message..."
                                        disabled={sending}
                                        maxLength={2000}
                                    />
                                    <button
                                        className="button button-accent"
                                        type="submit"
                                        disabled={sending || !messageText.trim()}
                                    >
                                        {sending ? 'Sending...' : 'Send'}
                                    </button>
                                </form>
                            </div>

                            <div className="conv-sidebar-stack">
                                <div className="conv-share-panel">
                                    <p className="conv-share-panel-title">Share Info</p>
                                    <label className={`conv-share-option${!user?.phoneNumber ? ' conv-share-option-disabled' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={sharePhone}
                                            onChange={(e) => setSharePhone(e.target.checked)}
                                            disabled={!user?.phoneNumber || sending}
                                        />
                                        Phone Number
                                        {!user?.phoneNumber ? (
                                            <span className="conv-share-hint">Add in profile</span>
                                        ) : null}
                                    </label>
                                    <label className={`conv-share-option${!user?.venmoUsername ? ' conv-share-option-disabled' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={shareVenmo}
                                            onChange={(e) => setShareVenmo(e.target.checked)}
                                            disabled={!user?.venmoUsername || sending}
                                        />
                                        Venmo Username
                                        {!user?.venmoUsername ? (
                                            <span className="conv-share-hint">Add in profile</span>
                                        ) : null}
                                    </label>
                                    <button
                                        className="button button-accent"
                                        type="button"
                                        disabled={(!sharePhone && !shareVenmo) || sending}
                                        onClick={() => { void handleShareContact(); }}
                                    >
                                        Share Contact/Payment Information
                                    </button>
                                </div>

                                 <div className="conv-meetup-panel">
                                    <MeetupAreaPicker onLocationConfirmed={handleLocationConfirmed} />
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </main>
    );
}