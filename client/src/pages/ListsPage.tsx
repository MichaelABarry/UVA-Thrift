import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
    createList,
    deleteList,
    getLists,
    removeItemFromList,
    updateList
} from '../services/listService';
import type { ItemList } from '../types/list';

type ListFormState = {
    name: string;
    description: string;
};

const EMPTY_FORM: ListFormState = {
    name: '',
    description: ''
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ListsPage() {
    const { user, loading } = useAuth();
    const [lists, setLists] = useState<ItemList[]>([]);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [form, setForm] = useState<ListFormState>(EMPTY_FORM);
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [loadingLists, setLoadingLists] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    useEffect(() => {
        async function loadLists() {
            setLoadingLists(true);
            setError(null);

            try {
                const response = await getLists();
                setLists(response.lists);
                setSelectedListId((current) => current ?? response.lists[0]?.id ?? null);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Unable to load your lists.');
            } finally {
                setLoadingLists(false);
            }
        }

        if (user?.isEmailVerified) {
            void loadLists();
        }
    }, [user?.isEmailVerified]);

    const selectedList = useMemo(
        () => lists.find((list) => list.id === selectedListId) ?? null,
        [lists, selectedListId]
    );

    useEffect(() => {
        if (!selectedList) {
            if (mode === 'edit') {
                setMode('create');
                setForm(EMPTY_FORM);
            }

            return;
        }

        if (mode === 'edit') {
            setForm({
                name: selectedList.name,
                description: selectedList.description
            });
        }
    }, [mode, selectedList]);

    if (!loading && !user?.isEmailVerified) {
        return <Navigate to="/" replace />;
    }

    function upsertList(nextList: ItemList) {
        setLists((current) => {
            const exists = current.some((list) => list.id === nextList.id);

            if (!exists) {
                return [nextList, ...current];
            }

            return current.map((list) => (list.id === nextList.id ? nextList : list));
        });
    }

    function beginCreateMode() {
        setMode('create');
        setSelectedListId(null);
        setForm(EMPTY_FORM);
        setStatusMessage(null);
        setError(null);
    }

    function beginEditMode(list: ItemList) {
        setMode('edit');
        setSelectedListId(list.id);
        setForm({
            name: list.name,
            description: list.description
        });
        setStatusMessage(null);
        setError(null);
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setStatusMessage(null);

        try {
            if (mode === 'create') {
                const response = await createList(form);
                upsertList(response.list);
                setSelectedListId(response.list.id);
                setMode('edit');
                setStatusMessage('List created.');
                return;
            }

            if (!selectedListId) {
                throw new Error('Choose a list to edit.');
            }

            const response = await updateList(selectedListId, form);
            upsertList(response.list);
            setStatusMessage('List updated.');
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to save your list.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDeleteList(listId: string) {
        const confirmed = window.confirm('Delete this list? Its saved items will be removed from the list.');

        if (!confirmed) {
            return;
        }

        setPendingDeleteId(listId);
        setError(null);
        setStatusMessage(null);

        try {
            await deleteList(listId);
            setLists((current) => current.filter((list) => list.id !== listId));
            setSelectedListId((current) => (current === listId ? null : current));
            setMode('create');
            setForm(EMPTY_FORM);
            setStatusMessage('List deleted.');
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this list.');
        } finally {
            setPendingDeleteId(null);
        }
    }

    async function handleRemoveItem(listId: string, listingId: string) {
        setPendingRemoveId(listingId);
        setError(null);
        setStatusMessage(null);

        try {
            const response = await removeItemFromList(listId, listingId);
            upsertList(response.list);
            setStatusMessage('Item removed from list.');
        } catch (removeError) {
            setError(removeError instanceof Error ? removeError.message : 'Unable to remove that item from the list.');
        } finally {
            setPendingRemoveId(null);
        }
    }

    return (
        <main className="page-content">
            <div className="page-container">
                <div className="my-items-header">
                    <div>
                        <h1 className="home-heading">Lists</h1>
                        <p className="home-subheading">
                            Build themed collections like Dorm Room, First Apartment, or Lab Essentials.
                        </p>
                    </div>
                    <button className="button button-accent" type="button" onClick={beginCreateMode}>
                        New List
                    </button>
                </div>

                {loadingLists ? <p className="loading-spinner">Loading your lists...</p> : null}
                {error ? <p className="status status-error">{error}</p> : null}
                {statusMessage ? <p className="status status-success">{statusMessage}</p> : null}

                {!loadingLists ? (
                    <div className="lists-layout">
                        <aside className="lists-sidebar" aria-label="Your lists">
                            <div className="lists-sidebar-header">
                                <h2 className="section-heading">Saved Lists</h2>
                                <span className="lists-count">{lists.length}</span>
                            </div>

                            {!lists.length ? (
                                <div className="empty-state lists-sidebar-empty">
                                    <h2 className="empty-state-title">No lists yet</h2>
                                    <p className="empty-state-body">
                                        Create one here, then save items from the marketplace into it.
                                    </p>
                                </div>
                            ) : (
                                <div className="lists-stack">
                                    {lists.map((list) => (
                                        <button
                                            key={list.id}
                                            className={`lists-list-card ${selectedListId === list.id ? 'lists-list-card-active' : ''}`}
                                            type="button"
                                            onClick={() => beginEditMode(list)}
                                        >
                                            <div className="lists-list-card-header">
                                                <h3 className="lists-list-card-title">{list.name}</h3>
                                                <span className="lists-list-card-count">
                                                    {list.items.length} item{list.items.length === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                            <p className="lists-list-card-body">
                                                {list.description || 'No description yet.'}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </aside>

                        <section className="lists-main">
                            <div className="card card-wide lists-editor-card">
                                <div className="lists-editor-header">
                                    <div>
                                        <h2 className="card-title">{mode === 'create' ? 'Create a list' : 'Edit list details'}</h2>
                                        <p className="card-subtitle">
                                            Name the list clearly so you can recognize it when saving items from the marketplace.
                                        </p>
                                    </div>
                                    {mode === 'edit' ? (
                                        <button className="button button-secondary" type="button" onClick={beginCreateMode}>
                                            Start New List
                                        </button>
                                    ) : null}
                                </div>

                                <form className="form-grid" onSubmit={handleSubmit}>
                                    <label>
                                        <span className="sidebar-label">Name</span>
                                        <input
                                            className="input"
                                            type="text"
                                            maxLength={120}
                                            value={form.name}
                                            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                                            placeholder="Dorm Room"
                                            required
                                        />
                                    </label>

                                    <label>
                                        <span className="sidebar-label">Description</span>
                                        <textarea
                                            className="input"
                                            rows={4}
                                            maxLength={1000}
                                            value={form.description}
                                            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                                            placeholder="Desk lamp, bedding, storage bins, and other first-semester essentials."
                                        />
                                    </label>

                                    <div className="lists-editor-actions">
                                        <button className="button button-accent" type="submit" disabled={submitting}>
                                            {submitting ? 'Saving...' : mode === 'create' ? 'Create List' : 'Save Changes'}
                                        </button>
                                        {mode === 'edit' && selectedListId ? (
                                            <button
                                                className="button lists-danger-button"
                                                type="button"
                                                onClick={() => handleDeleteList(selectedListId)}
                                                disabled={pendingDeleteId === selectedListId}
                                            >
                                                {pendingDeleteId === selectedListId ? 'Deleting...' : 'Delete List'}
                                            </button>
                                        ) : null}
                                    </div>
                                </form>
                            </div>

                            <div className="lists-detail-panel">
                                <div className="lists-detail-header">
                                    <div>
                                        <h2 className="section-heading">Selected List</h2>
                                        <p className="card-subtitle">
                                            {selectedList
                                                ? `Updated ${formatDate(selectedList.updatedAt)}`
                                                : 'Choose a list to review the items you have saved.'}
                                        </p>
                                    </div>
                                </div>

                                {!selectedList ? (
                                    <div className="empty-state lists-detail-empty">
                                        <h2 className="empty-state-title">Pick a list to inspect it</h2>
                                        <p className="empty-state-body">
                                            You can create a new list here, then add items from the marketplace on the <Link to="/home">Home</Link> page.
                                        </p>
                                    </div>
                                ) : !selectedList.items.length ? (
                                    <div className="empty-state lists-detail-empty">
                                        <div className="empty-state-icon">📭</div>
                                        <h2 className="empty-state-title">This list is empty</h2>
                                        <p className="empty-state-body">
                                            Browse the <Link to="/home">marketplace</Link> and use the add-to-list control on any item card.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="listing-grid" aria-label={`${selectedList.name} items`}>
                                        {selectedList.items.map((item) => (
                                            <article className="listing-card" key={`${selectedList.id}-${item.id}`}>
                                                {item.imageUrl ? (
                                                    <div className="listing-image-frame">
                                                        <img className="listing-image" src={item.imageUrl} alt={item.name} />
                                                    </div>
                                                ) : (
                                                    <div className="listing-image-placeholder">No image</div>
                                                )}

                                                <div className="listing-header">
                                                    <h3 className="listing-title">{item.name}</h3>
                                                    <p className="listing-price">${item.price.toFixed(2)}</p>
                                                </div>

                                                <p className="listing-description">{item.description}</p>

                                                <div className="listing-footer">
                                                    <div className="listing-categories">
                                                        {item.categories.map((category) => (
                                                            <span className="listing-category-chip" key={`${item.id}-${category}`}>
                                                                {category}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <span className="listing-date">{formatDate(item.createdAt)}</span>
                                                </div>

                                                <div className="listing-actions">
                                                    <button
                                                        className="button listing-action-button lists-danger-button"
                                                        type="button"
                                                        onClick={() => handleRemoveItem(selectedList.id, item.id)}
                                                        disabled={pendingRemoveId === item.id}
                                                    >
                                                        {pendingRemoveId === item.id ? 'Removing...' : 'Remove from List'}
                                                    </button>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                ) : null}
            </div>
        </main>
    );
}