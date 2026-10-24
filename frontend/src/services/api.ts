function resolveApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (!raw) return '/api';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

export const API_BASE = resolveApiBase();

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('hcm_token');
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else if (contentType && contentType.includes('text/csv')) {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || response.statusText || 'Request failed';
    const err = new Error(errorMsg) as any;
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

export async function downloadAuthenticatedFile(
  endpoint: string,
  fallbackFilename: string
): Promise<void> {
  const token = localStorage.getItem('hcm_token');
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    let errorMsg = response.statusText || 'Download failed';
    try {
      const errData = await response.json();
      if (errData?.error) errorMsg = errData.error;
    } catch {
      // ignore non-json error body
    }
    throw new Error(errorMsg);
  }

  const disposition = response.headers.get('content-disposition');
  let filename = fallbackFilename;
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/i);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
}

export const api = {
  get: <T = any>(url: string) => apiRequest<T>(url, { method: 'GET' }),
  post: <T = any>(url: string, body?: any) =>
    apiRequest<T>(url, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  put: <T = any>(url: string, body?: any) =>
    apiRequest<T>(url, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  patch: <T = any>(url: string, body?: any) =>
    apiRequest<T>(url, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body)
    }),
  delete: <T = any>(url: string) => apiRequest<T>(url, { method: 'DELETE' }),
  download: (url: string, fallbackFilename: string) =>
    downloadAuthenticatedFile(url, fallbackFilename)
};
