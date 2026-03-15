import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createListing, getMyListing, updateListing } from '../services/listingService';

const CATEGORY_OPTIONS = [
    { label: 'Furniture', value: 'furniture' },
    { label: 'School Supplies', value: 'school supplies' },
    { label: 'Clothes', value: 'clothes' },
    { label: 'Electronics', value: 'electronics' },
    { label: 'Kitchen', value: 'kitchen' },
    { label: 'Other', value: 'other' }
];

export function CreateListingPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const { listingId } = useParams();
    const isEditing = Boolean(listingId);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [loadingListing, setLoadingListing] = useState(isEditing);

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
                setPrice(response.listing.price.toString());
                setCategories(response.listing.categories);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Unable to load listing.');
            } finally {
                setLoadingListing(false);
            }
        }

        void loadListing();
    }, [listingId, user?.isEmailVerified]);

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    function handleCategoryToggle(category: string) {
        setCategories((current) =>
            current.includes(category)
                ? current.filter((item) => item !== category)
                : [...current, category]
        );
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setSubmitting(true);
        setMessage(null);
        setError(null);

        try {
            const payload = {
                name: name.trim(),
                description: description.trim(),
                price: Number(price),
                categories
            };

            if (listingId) {
                await updateListing(listingId, payload);
                navigate('/my-items');
                return;
            }

            await createListing(payload);
            setName('');
            setDescription('');
            setPrice('');
            setCategories([]);
            setMessage('Listing created successfully.');
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

    return (
        <main className="page page-content">
            <section className="card" aria-label="Create listing page">
                <h1 className="card-title">{isEditing ? 'Edit Item' : 'Add Item'}</h1>
                <p className="card-subtitle">
                    {isEditing ? 'Update your listing details before other Hoos see it.' : 'List something for fellow Hoos to find.'}
                </p>

                {loadingListing ? <p className="loading-spinner listing-form-loading">Loading listing...</p> : null}

                <form className="form-grid" onSubmit={handleSubmit}>
                    <input
                        className="input"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Name"
                        maxLength={120}
                        required
                        disabled={loadingListing || submitting}
                    />

                    <textarea
                        className="input"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Description"
                        rows={4}
                        maxLength={2000}
                        required
                        disabled={loadingListing || submitting}
                    />

                    <input
                        className="input"
                        type="number"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        placeholder="Price (USD)"
                        min="0"
                        step="0.01"
                        required
                        disabled={loadingListing || submitting}
                    />

                    <fieldset className="category-fieldset">
                        <legend className="section-heading">Categories</legend>
                        <div className="category-grid">
                            {CATEGORY_OPTIONS.map((category) => (
                                <label key={category.value} className="category-option">
                                    <input
                                        type="checkbox"
                                        checked={categories.includes(category.value)}
                                        onChange={() => handleCategoryToggle(category.value)}
                                        disabled={loadingListing || submitting}
                                    />
                                    <span>{category.label}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <button className="button button-accent" type="submit" disabled={loadingListing || submitting}>
                        {submitting ? (isEditing ? 'Saving...' : 'Creating...') : isEditing ? 'Save Changes' : 'Create Listing'}
                    </button>
                </form>

                {message ? <p className="status status-success">{message}</p> : null}
                {error ? <p className="status status-error">{error}</p> : null}
            </section>
        </main>
    );
}
