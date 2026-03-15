const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

type ApiOptions = RequestInit & {
  expectedStatus?: number;
};

// Generic function to make API requests. It handles JSON responses, checks for expected status codes, and throws errors with messages from the response body when applicable.
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {})
        }
    });

    if (options.expectedStatus && response.status !== options.expectedStatus) {
        const body = await safeParseBody(response);
        throw new Error(body?.message || 'Unexpected response status.');
    }

    if (!response.ok) {
        const body = await safeParseBody(response);
        throw new Error(body?.message || 'Request failed.');
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

// Helper function to safely parse the response body as JSON. It returns the parsed object or null if parsing fails, allowing for error handling based on the presence of a message in the response.
async function safeParseBody(response: Response): Promise<{ message?: string } | null> {
    try {
        return (await response.json()) as { message?: string };
    } catch {
        return null;
    }
}
