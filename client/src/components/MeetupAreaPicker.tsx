import { useEffect, useRef, useState } from 'react';
import type { Circle, LeafletMouseEvent, Map as LeafletMap, Marker } from 'leaflet';

// Default center: UVA Grounds, Charlottesville VA
const UVA_LAT = 38.0336;
const UVA_LNG = -78.5080;
const RADIUS_METERS = 100;

type Props = {
    onLocationConfirmed: (message: string) => void;
};

type SelectedLocation = {
    lat: number;
    lng: number;
    label: string;
	address: string;
};

export function MeetupAreaPicker({ onLocationConfirmed }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const markerRef = useRef<Marker | null>(null);
    const circleRef = useRef<Circle | null>(null);

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
            if (selectedLocation) {
                markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
                    icon: defaultIcon
                }).addTo(map);
                circleRef.current = L.circle([selectedLocation.lat, selectedLocation.lng], {
                    radius: RADIUS_METERS,
                    color: '#E57200',
                    fillColor: '#E57200',
                    fillOpacity: 0.18,
                    weight: 2
                }).addTo(map);
                map.setView([selectedLocation.lat, selectedLocation.lng], 15);
            }

            map.on('click', async (e: LeafletMouseEvent) => {
                const { lat, lng } = e.latlng;

                if (markerRef.current) markerRef.current.remove();
                if (circleRef.current) circleRef.current.remove();

                markerRef.current = L.marker([lat, lng], { icon: defaultIcon }).addTo(map);
                circleRef.current = L.circle([lat, lng], {
                    radius: RADIUS_METERS,
                    color: '#E57200',
                    fillColor: '#E57200',
                    fillOpacity: 0.18,
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
					
					setSelectedLocation({ lat, lng, label: shortlabel, address: fullAddress });

                } catch {
                    setSelectedLocation({ lat, lng, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, address: '' });
                }
            });

            setTimeout(() => { map.invalidateSize(); }, 100);
        }, 80);

        return () => { clearTimeout(timer); };
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!isOpen && mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
            markerRef.current = null;
            circleRef.current = null;
        }
    }, [isOpen]);

    function handleConfirm() {
        if (!selectedLocation) return;
        // Encode the full location data into the message so the recipient can render a map.
        // Format: MEETUP:{"lat":...,"lng":...,"label":"..."}
        const payload = JSON.stringify({
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            label: selectedLocation.label,
			address: selectedLocation.address
        });
        onLocationConfirmed(`MEETUP:${payload}`);
        setIsOpen(false);
    }

    function handleClose() {
        setIsOpen(false);
    }

    return (
        <>
            {/* ── Meetup card ── */}
            <div className="meetup-card">
                <div className="meetup-card-header">
                    <span className="meetup-card-icon">📍</span>
                    <div>
                        <p className="meetup-card-title">Meet-up Location</p>
                        <p className="meetup-card-subtitle">
                            {selectedLocation ? `Set near: ${selectedLocation.label}` : 'Suggest a safe spot to exchange'}
                        </p>
                    </div>
                </div>

                {/* Mini static preview if a location is already selected */}
                {selectedLocation ? (
                    <div className="meetup-card-preview-wrap">
                        <iframe
                            className="meetup-card-preview-map"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedLocation.lng - 0.004},${selectedLocation.lat - 0.003},${selectedLocation.lng + 0.004},${selectedLocation.lat + 0.003}&layer=mapnik&marker=${selectedLocation.lat},${selectedLocation.lng}`}
                            title="Selected meet-up area preview"
                        />
                        <div className="meetup-card-preview-label">
                            <span className="meetup-card-preview-pin">📍</span>
                            <span>{selectedLocation.label}</span>
                        </div>
                    </div>
                ) : (
                    <div className="meetup-card-placeholder">
                        <span className="meetup-card-placeholder-icon">🗺️</span>
                        <span>No location selected yet</span>
                    </div>
                )}

                <button
                    type="button"
                    className="button meetup-card-btn"
                    onClick={() => setIsOpen(true)}
                    aria-label="Pick a meet-up location on the map"
                >
                    {selectedLocation ? '✏️  Change Location' : '+ Pick a Location'}
                </button>
            </div>

            {/* ── Full-screen map overlay ── */}
            {isOpen ? (
                <div className="meetup-map-overlay" role="dialog" aria-modal="true" aria-label="Pick a meet-up location">
                    <div className="meetup-map-overlay-header">
                        <div>
                            <h2 className="meetup-map-overlay-title">Pick a Meet-up Area</h2>
                            <p className="meetup-map-overlay-hint">
                                Click anywhere on the map to drop a pin. The orange circle shows the general area.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="button button-accent meetup-map-close"
                            onClick={handleClose}
                        >
                            ✕ Close
                        </button>
                    </div>

                    <div className="meetup-map-canvas-wrap">
                        <div ref={mapContainerRef} className="meetup-map-canvas" />
                    </div>

                    <div className="meetup-map-overlay-footer">
                        {selectedLocation ? (
                            <p className="meetup-map-pin-label">
                                📍 <strong>Selected area:</strong> {selectedLocation.label}
                            </p>
                        ) : (
                            <p className="meetup-map-pin-label meetup-map-pin-label-empty">
                                No spot selected yet — click the map above
                            </p>
                        )}
                        <button
                            type="button"
                            className="button button-accent"
                            disabled={!selectedLocation}
                            onClick={handleConfirm}
                        >
                            Confirm Location
                        </button>
                    </div>
                </div>
            ) : null}
        </>
    );
}
