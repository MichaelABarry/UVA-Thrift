import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createListing } from '../services/listingService';

const CATEGORY_OPTIONS = ['Furniture', 'School Supplies', 'Clothes', 'Electronics', 'Kitchen', 'Other'];

export function CreateListingPage() {
    const { user, loading } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

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
            await createListing({
                name: name.trim(),
                description: description.trim(),
                price: Number(price),
                categories
            });
            setName('');
            setDescription('');
            setPrice('');
            setCategories([]);
            setMessage('Listing created successfully.');
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to create listing.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="page page-content">
            <section className="card" aria-label="Create listing page">
                <h1 className="card-title">Add Item</h1>
                <p className="card-subtitle">List something for fellow Hoos to find.</p>

                <form className="form-grid" onSubmit={handleSubmit}>
                    <input
                        className="input"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Name"
                        maxLength={120}
                        required
                    />

                    <textarea
                        className="input"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Description"
                        rows={4}
                        maxLength={2000}
                        required
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
                    />

                    <fieldset className="category-fieldset">
                        <legend className="section-heading">Categories</legend>
                        <div className="category-grid">
                            {CATEGORY_OPTIONS.map((category) => (
                                <label key={category} className="category-option">
                                    <input
                                        type="checkbox"
                                        checked={categories.includes(category)}
                                        onChange={() => handleCategoryToggle(category)}
                                    />
                                    <span>{category}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <button className="button button-accent" type="submit" disabled={submitting}>
                        {submitting ? 'Creating...' : 'Create Listing'}
                    </button>
                </form>

                {message ? <p className="status status-success">{message}</p> : null}
                {error ? <p className="status status-error">{error}</p> : null}
            </section>
        </main>
    );
}
