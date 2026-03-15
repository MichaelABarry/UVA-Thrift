import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';

describe('apiFetch', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllGlobals();
    });

    it('returns parsed JSON for a successful request and includes default headers', async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ listings: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        );

        const result = await apiFetch<{ listings: unknown[] }>('/api/listings');

        expect(result).toEqual({ listings: [] });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]?.[0]).toMatch(/\/api\/listings$/);
        expect(fetchMock.mock.calls[0]?.[1]).toEqual({
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    });

    it('throws the API message when the response status does not match the expected status', async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ message: 'Wrong status.' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        );

        await expect(apiFetch('/api/listings', { expectedStatus: 201 })).rejects.toThrow('Wrong status.');
    });

    it('throws the API message for non-ok responses', async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({ message: 'Request failed on server.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            })
        );

        await expect(apiFetch('/api/listings')).rejects.toThrow('Request failed on server.');
    });

    it('returns undefined for 204 responses', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

        await expect(apiFetch<void>('/api/listings/123', { method: 'DELETE', expectedStatus: 204 })).resolves.toBeUndefined();
    });
});
