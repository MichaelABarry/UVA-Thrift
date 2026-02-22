const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

type ApiOptions = RequestInit & {
  expectedStatus?: number;
};

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

  return response.json() as Promise<T>;
}

async function safeParseBody(response: Response): Promise<{ message?: string } | null> {
  try {
    return (await response.json()) as { message?: string };
  } catch {
    return null;
  }
}
