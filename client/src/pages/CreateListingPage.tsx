import React, { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { LISTING_CATEGORY_OPTIONS, LISTING_CONDITION_OPTIONS, LISTING_SUBCATEGORY_OPTIONS } from '../constants/listingCategories';
import { useAuth } from '../hooks/useAuth';
import { createListing, getMyListing, updateListing } from '../services/listingService';

const EXPIRATION_OPTIONS = [
    { value: 15, label: '15 days' },
    { value: 30, label: '30 days', default: true },
    { value: 60, label: '60 days' },
];

export function CreateListingPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const { listingId } = useParams();
    const isEditing = Boolean(listingId);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [descriptionOpen, setDescriptionOpen] = useState(false);
    const [price, setPrice] = useState('');
    const [condition, setCondition] = useState('good');
	const [expirationDays, setExpirationDays] = useState(30);
    const [listing, setListing] = useState<{ expiresAt?: string } | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [imageScale, setImageScale] = useState(1);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [loadingListing, setLoadingListing] = useState(isEditing);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        async function loadListing() {
            if (!listingId || !user?.isEmailVerified) {
                setLoadingListing(false);
                return;
            }

            setLoadingListing(true);
            setError(null);

            try {
                const response = await getMyListing(listingId);
                setName(response.listing.name);
                setDescription(response.listing.description);
                if (response.listing.description) {
                    setDescriptionOpen(true);
                }
                setPrice(response.listing.price.toString());
                setCondition(response.listing.condition);
                setCategories(response.listing.categories);
				setListing(response.listing);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Unable to load listing.');
            } finally {
                setLoadingListing(false);
            }
        }

        void loadListing();
    }, [listingId, user?.isEmailVerified]);

    useEffect(() => {
        return () => { if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl); };
    }, [imagePreviewUrl]);

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    function handleCategoryToggle(category: string) {
        setCategories((current) => {
            if (current.includes(category)) {
                const subcategoryValues = (LISTING_SUBCATEGORY_OPTIONS[category] ?? []).map((s) => s.value);
                return current.filter((item) => item !== category && !subcategoryValues.includes(item));
            }
            return [...current, category];
        });
    }

    function handleSubcategoryToggle(subcategory: string) {
        setCategories((current) =>
            current.includes(subcategory)
                ? current.filter((item) => item !== subcategory)
                : [...current, subcategory]
        );
    }

    function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null;
        setSelectedImage(file);
        setImagePreviewUrl(file ? URL.createObjectURL(file) : null);
        setImageScale(1);
    }

    function handleRemoveImage() {
        setSelectedImage(null);
        setImagePreviewUrl(null);
        setImageScale(1);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function getProcessedImageFile(): Promise<File | null> {
        if (!selectedImage || !imagePreviewUrl) return null;
        return new Promise((resolve) => {
            const W = 800, H = 600;
            const canvas = document.createElement('canvas');
            canvas.width = W; canvas.height = H;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(null); return; }
            const img = new Image();
            img.onload = () => {
                const coverScale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
                const drawW = img.naturalWidth * coverScale * imageScale;
                const drawH = img.naturalHeight * coverScale * imageScale;
                ctx.drawImage(img, (W - drawW) / 2, (H - drawH) / 2, drawW, drawH);
                canvas.toBlob(
                    (blob) => resolve(blob
                        ? new File([blob], selectedImage.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
                        : null
                    ),
                    'image/jpeg', 0.9
                );
            };
            img.onerror = () => resolve(null);
            img.src = imagePreviewUrl;
        });
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);
        setError(null);

        if (categories.length === 0) {
            setError('Please select at least one category.');
            return;
        }

        setSubmitting(true);

        try {
            const processedImage = selectedImage ? (await getProcessedImageFile() ?? selectedImage) : null;
            const payload = {
                name: name.trim(),
                description: description.trim(),
                price: Number(price),
                categories,
                condition,
				expirationDays,
                image: processedImage,
            };

            if (listingId) {
                await updateListing(listingId, payload);
                navigate('/my-items');
                return;
            }

            await createListing(payload);
            navigate('/profile?section=items');
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : `Unable to ${isEditing ? 'update' : 'create'} listing.`
            );
        } finally {
            setSubmitting(false);
        }
    }

    const isDisabled = loadingListing || submitting;

    return (
        <main className="page page-content">
            <div className="cl-page">
                <div className="cl-header">
                    <h1 className="cl-title">{isEditing ? 'Edit Item' : 'New Item'}</h1>
                    <p className="cl-subtitle">
                        {isEditing ? 'Update your listing details before other Hoos see it.' : 'List something for fellow Hoos to find.'}
                    </p>
                </div>

                <div className="cl-form-card cl-form-card--narrow">
                    {loadingListing ? (
                        <p className="cl-loading loading-spinner">Loading listing…</p>
                    ) : null}

                    <form className="cl-form-vertical" onSubmit={handleSubmit}>
                        {/* Name */}
                        <div className="cl-field">
                            <label className="cl-label" htmlFor="cl-name">Name</label>
                            <input
                                id="cl-name"
                                className="cl-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. IKEA desk lamp"
                                maxLength={120}
                                required
                                disabled={isDisabled}
                            />
                        </div>

                        {/* Description accordion */}
                        <div className="cl-accordion">
                            <button
                                type="button"
                                className="cl-accordion-trigger cl-accordion-trigger--subtle"
                                onClick={() => setDescriptionOpen((o) => !o)}
                                disabled={isDisabled}
                                aria-expanded={descriptionOpen}
                            >
                                Description
                                <span className="cl-optional">(optional)</span>
                                <span className={`cl-chevron${descriptionOpen ? ' cl-chevron--open' : ''}`}>▾</span>
                            </button>
                            <div
                                className={`cl-accordion-body${descriptionOpen ? ' cl-accordion-body--open' : ''}`}
                                aria-hidden={!descriptionOpen}
                            >
                                <div className="cl-accordion-body-inner">
                                    <textarea
                                        className="cl-input"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe the item's condition, dimensions, any quirks…"
                                        rows={4}
                                        maxLength={2000}
                                        disabled={isDisabled}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Price */}
                        <div className="cl-field">
                            <label className="cl-label" htmlFor="cl-price">Price (USD)</label>
                            <input
                                id="cl-price"
                                className="cl-input"
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                required
                                disabled={isDisabled}
                            />
                        </div>

                        {/* Condition */}
                        <div className="cl-field">
                            <label className="cl-label" htmlFor="cl-condition">Condition</label>
                            <select
                                id="cl-condition"
                                className="cl-input"
                                value={condition}
                                onChange={(e) => setCondition(e.target.value)}
                                required
                                disabled={isDisabled}
                            >
                                {LISTING_CONDITION_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

						{/* Expiry date display when editing */}
                        {isEditing && listing?.expiresAt ? (
                            <div className="cl-field">
                                <p className="cl-label">Listing Expiration</p>
                                <p className="cl-expiry-display">
                                    ⏳ This listing expires on{' '}
                                    <strong>
                                        {new Date(listing.expiresAt).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </strong>
                                </p>
                            </div>
                        ) : null}

                        {/* Expiration picker — only shown when creating */}
                        {!isEditing ? (
                            <div className="cl-field">
                                <p className="cl-label">Listing Expiration</p>
                                <p className="cl-field-hint">
                                    Your listing will automatically expire after this period. You'll be notified when it does.
                                </p>
                                <div className="cl-expiry-options">
                                    {EXPIRATION_OPTIONS.map((opt) => (
                                        <label
                                            key={opt.value}
                                            className={`cl-expiry-option${expirationDays === opt.value ? ' cl-expiry-option--selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="expirationDays"
                                                value={opt.value}
                                                checked={expirationDays === opt.value}
                                                onChange={() => setExpirationDays(opt.value)}
                                                disabled={isDisabled}
                                                style={{ display: 'none' }}
                                            />
                                            <span className="cl-expiry-days">{opt.value}</span>
                                            <span className="cl-expiry-unit">days</span>
                                            {opt.default ? <span className="cl-expiry-badge">Default</span> : null}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {/* Image upload */}
                        <div className="cl-field">
                            <label className="cl-label">
                                Item image <span className="cl-optional">(optional)</span>
                            </label>
                            <input
                                ref={fileInputRef}
                                id="cl-image"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                disabled={isDisabled}
                                style={{ display: 'none' }}
                            />
                            <div
                                className="cl-upload-zone"
                                role="button"
                                tabIndex={isDisabled ? -1 : 0}
                                aria-label="Upload image"
                                onClick={() => { if (!isDisabled) fileInputRef.current?.click(); }}
                                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) fileInputRef.current?.click(); }}
                            >
                                {imagePreviewUrl ? (
                                    <img
                                        className="cl-upload-zone-img"
                                        src={imagePreviewUrl}
                                        alt="Preview"
                                        style={{ transform: `scale(${imageScale})`, transformOrigin: 'center center' }}
                                    />
                                ) : (
                                    <div className="cl-upload-placeholder">
                                        <span className="cl-upload-icon">📷</span>
                                        <span>Click to upload a photo</span>
                                    </div>
                                )}
                            </div>
                            {imagePreviewUrl && (
                                <div className="cl-image-controls">
                                    <label className="cl-scale-label" htmlFor="cl-scale">Zoom</label>
                                    <input
                                        id="cl-scale"
                                        type="range"
                                        className="cl-scale-slider"
                                        min="1"
                                        max="3"
                                        step="0.05"
                                        value={imageScale}
                                        onChange={(e) => setImageScale(Number(e.target.value))}
                                        disabled={isDisabled}
                                    />
                                    <button
                                        type="button"
                                        className="cl-upload-remove"
                                        onClick={handleRemoveImage}
                                        disabled={isDisabled}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                            <p className="cl-upload-hint">JPG, PNG, or WebP · max 5 MB · click zone to change</p>
                        </div>

                        {/* Categories */}
                        <div className="cl-field">
                            <p className="cl-label">Categories</p>
                            <div className="cl-cat-list">
                                {LISTING_CATEGORY_OPTIONS.map((category) => {
                                    const isSelected = categories.includes(category.value);
                                    const subcats = LISTING_SUBCATEGORY_OPTIONS[category.value];
                                    return (
                                        <div
                                            key={category.value}
                                            className={`cl-cat-item${isSelected ? ' cl-cat-item--selected' : ''}`}
                                        >
                                            <label className={`cl-cat-trigger${isSelected ? ' cl-cat-trigger--selected' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleCategoryToggle(category.value)}
                                                    disabled={isDisabled}
                                                    style={{ display: 'none' }}
                                                />
                                                <span className="cl-cat-name">{category.label}</span>
                                                <span className={`cl-cat-check${isSelected ? ' cl-cat-check--visible' : ''}`}>✓</span>
                                            </label>

                                            {subcats && (
                                                <div className={`cl-subcats${isSelected ? ' cl-subcats--open' : ''}`}>
                                                    <div className="cl-subcat-grid">
                                                        {subcats.map((sub) => {
                                                            const subSelected = categories.includes(sub.value);
                                                            return (
                                                                <label
                                                                    key={sub.value}
                                                                    className={`cl-subcat-option${subSelected ? ' cl-subcat-option--selected' : ''}`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={subSelected}
                                                                        onChange={() => handleSubcategoryToggle(sub.value)}
                                                                        disabled={isDisabled}
                                                                        style={{ display: 'none' }}
                                                                    />
                                                                    {sub.label}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <button className="cl-submit-btn" type="submit" disabled={isDisabled}>
                            {submitting
                                ? (isEditing ? 'Saving…' : 'Creating…')
                                : (isEditing ? 'Save Changes' : 'Create Listing')}
                        </button>
                    </form>
                </div>

                {message ? <p className="cl-status status status-success">{message}</p> : null}
                {error ? <p className="cl-status status status-error">{error}</p> : null}
            </div>
        </main>
    );
}
