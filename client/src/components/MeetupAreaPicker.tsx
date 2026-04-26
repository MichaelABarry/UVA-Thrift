import { useEffect, useRef, useState } from 'react';
import type { Circle, LeafletMouseEvent, Map as LeafletMap, Marker } from 'leaflet';
import {
    PREDEFINED_MEETUP_LOCATIONS,
    type PredefinedMeetupLocation
} from '../constants/predefinedMeetupLocations';

// Default center: UVA Grounds, Charlottesville VA
const UVA_LAT = 38.0336;
const UVA_LNG = -78.5080;
const RADIUS_METERS = 100;

type Props = {
    onLocationConfirmed: (message: string) => void | Promise<void>;
    currentLocation?: SelectedLocation | null;
};

type SelectedLocation = {
    lat: number;
    lng: number;
    label: string;
    address: string;
};

const PREDEFINED_LOCATION_QUERY_CACHE = new Map<string, { lat: number; lng: number }>();

function encodeMeetupMessage(location: SelectedLocation) {
    return `MEETUP:${JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        label: location.label,
        address: location.address
    })}`;
}

async function geocodePredefinedLocation(location: PredefinedMeetupLocation): Promise<SelectedLocation> {
    const cached = PREDEFINED_LOCATION_QUERY_CACHE.get(location.address);
    if (cached) {
        return {
            lat: cached.lat,
            lng: cached.lng,
            label: location.name,
            address: location.address
        };
    }

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location.address)}`
    );

    if (!response.ok) {
        throw new Error('Unable to geocode location');
    }

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    const firstMatch = results[0];

    if (!firstMatch) {
        throw new Error('Location not found');
    }

    const resolved = {
        lat: Number(firstMatch.lat),
        lng: Number(firstMatch.lon)
    };
    PREDEFINED_LOCATION_QUERY_CACHE.set(location.address, resolved);

    return {
        ...resolved,
        label: location.name,
        address: location.address
    };
}

function findMatchingPreset(location: SelectedLocation | null): PredefinedMeetupLocation | null {
    if (!location) return null;

    return PREDEFINED_MEETUP_LOCATIONS.find((preset) =>
        preset.address === location.address || preset.name === location.label
    ) ?? null;
}

export function MeetupAreaPicker({ onLocationConfirmed, currentLocation = null }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(currentLocation);
    const [draftLocation, setDraftLocation] = useState<SelectedLocation | null>(null);
    const [selectedPreset, setSelectedPreset] = useState<PredefinedMeetupLocation | null>(findMatchingPreset(currentLocation));
    const [isPresetListExpanded, setIsPresetListExpanded] = useState(currentLocation === null);
    const [pendingPreset, setPendingPreset] = useState<string | null>(null);
    const [isConfirmingCustom, setIsConfirmingCustom] = useState(false);
    const [lookupError, setLookupError] = useState<string | null>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const markerRef = useRef<Marker | null>(null);
    const circleRef = useRef<Circle | null>(null);
    const isBusy = pendingPreset !== null || isConfirmingCustom;
    const shouldShowPresetList = isPresetListExpanded;
    const activeMapLocation = draftLocation ?? selectedLocation;

    useEffect(() => {
        setSelectedLocation(currentLocation);
        setDraftLocation(null);
        setSelectedPreset(findMatchingPreset(currentLocation));
        setIsPresetListExpanded(currentLocation === null);
    }, [currentLocation]);

    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(async () => {
            if (!mapContainerRef.current) return;

            const L = await import('leaflet');

            if (!document.getElementById('leaflet-css')) {
                const link = document.createElement('link');
                link.id = 'leaflet-css';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            const defaultIcon = L.icon({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }

            const map = L.map(mapContainerRef.current).setView([UVA_LAT, UVA_LNG], 15);
            mapRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);

            // Re-draw any previously selected location when re-opening
            if (activeMapLocation) {
                markerRef.current = L.marker([activeMapLocation.lat, activeMapLocation.lng], {
                    icon: defaultIcon
                }).addTo(map);
                circleRef.current = L.circle([activeMapLocation.lat, activeMapLocation.lng], {
                    radius: RADIUS_METERS,
                    color: '#5f7494',
                    fillColor: '#5f7494',
                    fillOpacity: 0.14,
                    weight: 2
                }).addTo(map);
                map.setView([activeMapLocation.lat, activeMapLocation.lng], 15);
            }

            map.on('click', async (e: LeafletMouseEvent) => {
                const { lat, lng } = e.latlng;

                if (markerRef.current) markerRef.current.remove();
                if (circleRef.current) circleRef.current.remove();

                markerRef.current = L.marker([lat, lng], { icon: defaultIcon }).addTo(map);
                circleRef.current = L.circle([lat, lng], {
                    radius: RADIUS_METERS,
                    color: '#5f7494',
                    fillColor: '#5f7494',
                    fillOpacity: 0.14,
                    weight: 2
                }).addTo(map);

                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
                    );
                    const data = (await res.json()) as {
						display_name?: string;
                        address?: { road?: string; neighbourhood?: string; suburb?: string; };
                    };
                    const addr = data.address;
                    const shortlabel =
                        addr?.road ?? addr?.neighbourhood ?? addr?.suburb ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;


                    const fullAddress = data.display_name ?? shortlabel;

                    setDraftLocation({ lat, lng, label: shortlabel, address: fullAddress });
                    setLookupError(null);

                } catch {
                    setDraftLocation({ lat, lng, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, address: '' });
                }
            });

            setTimeout(() => { map.invalidateSize(); }, 100);
        }, 80);

        return () => { clearTimeout(timer); };
    }, [activeMapLocation, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isOpen && mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
            markerRef.current = null;
            circleRef.current = null;
        }
    }, [isOpen]);

    async function handleConfirm() {
        if (!draftLocation) return;
        setIsConfirmingCustom(true);
        setLookupError(null);
        try {
            await Promise.resolve(onLocationConfirmed(encodeMeetupMessage(draftLocation)));
            setSelectedLocation(draftLocation);
            setSelectedPreset(null);
            setIsPresetListExpanded(false);
            setDraftLocation(null);
            setIsOpen(false);
        } finally {
            setIsConfirmingCustom(false);
        }
    }

    function handleClose() {
        setDraftLocation(null);
        setIsOpen(false);
    }

    async function handlePredefinedLocationClick(location: PredefinedMeetupLocation) {
        setPendingPreset(location.name);
        setLookupError(null);
        try {
            const resolvedLocation = await geocodePredefinedLocation(location);
            setSelectedLocation(resolvedLocation);
            setSelectedPreset(location);
            setIsPresetListExpanded(false);
            await Promise.resolve(onLocationConfirmed(encodeMeetupMessage(resolvedLocation)));
        } catch {
            setLookupError('Unable to load that location right now. Try again or suggest a custom point on the map.');
        } finally {
            setPendingPreset(null);
        }
    }

    return (
        <>
            <div className="meetup-card">
                <div className="meetup-card-header">
                    <div>
                        <p className="meetup-card-title">Meet-up Location</p>
                        <p className="meetup-card-subtitle">Pick a common UVA meetup point or send a custom pin.</p>
                    </div>
                </div>

                {selectedLocation && shouldShowPresetList === false ? (
                    <div className="meetup-card-selected">
                        <p className="meetup-card-selected-name">{selectedPreset?.name ?? selectedLocation.label}</p>
                        <p className="meetup-card-selected-address">{selectedLocation.address}</p>
                    </div>
                ) : null}

                <div className="meetup-card-section">
                    {shouldShowPresetList ? (
                        <p className="meetup-card-section-title">Choose a predetermined location</p>
                    ) : null}
                    {shouldShowPresetList ? (
                        <div className="meetup-card-location-list">
                            {PREDEFINED_MEETUP_LOCATIONS.map((location) => {
                                const isCurrentPreset = pendingPreset === location.name;
                                return (
                                    <button
                                        key={location.name}
                                        type="button"
                                        className="meetup-card-location-btn"
                                        onClick={() => { void handlePredefinedLocationClick(location); }}
                                        disabled={isBusy}
                                    >
                                        <span className="meetup-card-location-copy">
                                            <span className="meetup-card-location-name">{location.name}</span>
                                            <span className="meetup-card-location-address">{location.address.split(',')[0]}</span>
                                        </span>
                                        <span className="meetup-card-location-action">
                                            {isCurrentPreset ? 'Sending...' : 'Send'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="button button-secondary meetup-card-collapse-btn"
                            onClick={() => setIsPresetListExpanded(true)}
                            disabled={isBusy}
                        >
                            Edit
                        </button>
                    )}
                </div>

                {shouldShowPresetList ? (
                    <div className="meetup-card-divider" aria-hidden="true">
                        <span>Or</span>
                    </div>
                ) : null}

                {shouldShowPresetList ? (
                    <button
                        type="button"
                        className="button button-secondary meetup-card-btn"
                        onClick={() => {
                            setLookupError(null);
                            setDraftLocation(selectedLocation);
                            setIsOpen(true);
                        }}
                        disabled={isBusy}
                        aria-label="Pick a custom meet-up location on the map"
                    >
                        Suggest a custom location
                    </button>
                ) : null}

                {lookupError ? <p className="meetup-card-error">{lookupError}</p> : null}
            </div>

            {isOpen ? (
                <div className="meetup-map-overlay" role="dialog" aria-modal="true" aria-label="Pick a meet-up location">
                    <div className="meetup-map-dialog">
                        <div className="meetup-map-overlay-header">
                            <div>
                                <h2 className="meetup-map-overlay-title">Pick a custom meet-up area</h2>
                                <p className="meetup-map-overlay-hint">
                                    Click anywhere on the map to drop a pin. The shaded circle marks the pickup area.
                                </p>
                            </div>
                            <button
                                type="button"
                                className="button button-secondary meetup-map-close"
                                onClick={handleClose}
                                disabled={isBusy}
                            >
                                Close
                            </button>
                        </div>

                        <div className="meetup-map-canvas-wrap">
                            <div ref={mapContainerRef} className="meetup-map-canvas" />
                        </div>

                        <div className="meetup-map-overlay-footer">
                            {activeMapLocation ? (
                                <p className="meetup-map-pin-label">
                                    <strong>{activeMapLocation.label}</strong>
                                    <span>{activeMapLocation.address || 'Custom meet-up point'}</span>
                                </p>
                            ) : (
                                <p className="meetup-map-pin-label meetup-map-pin-label-empty">
                                    No spot selected yet. Click the map to place a pin.
                                </p>
                            )}
                            <button
                                type="button"
                                className="button button-secondary meetup-map-confirm"
                                disabled={!draftLocation || isBusy}
                                onClick={() => { void handleConfirm(); }}
                            >
                                {isConfirmingCustom ? 'Sending...' : 'Send custom location'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
