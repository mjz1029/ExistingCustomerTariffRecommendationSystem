import type { TariffPlan, UserRecord, RecommendationResult, AIProviderConfig } from '../types';

const API_BASE = '/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `请求失败 (${res.status})`);
  }
  return res.json();
}

// Plans
export const plansApi = {
  list: (activeOnly?: boolean) =>
    request<TariffPlan[]>(`/plans${activeOnly ? '?active_only=true' : ''}`),

  create: (plan: Omit<TariffPlan, 'id'>) =>
    request<TariffPlan>('/plans', { method: 'POST', body: JSON.stringify(plan) }),

  update: (id: string, plan: Partial<TariffPlan>) =>
    request<TariffPlan>(`/plans/${id}`, { method: 'PUT', body: JSON.stringify(plan) }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/plans/${id}`, { method: 'DELETE' }),

  toggle: (id: string) =>
    request<TariffPlan>(`/plans/${id}/toggle`, { method: 'PATCH' }),

  import: (plans: TariffPlan[]) =>
    request<{ count: number }>('/plans/import', { method: 'POST', body: JSON.stringify(plans) }),
};

// Users
export const usersApi = {
  import: (users: UserRecord[]) =>
    request<{ batch_id: string; count: number }>('/users/import', {
      method: 'POST',
      body: JSON.stringify(users),
    }),
  importExcel: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${API_BASE}/users/import-excel`, { method: 'POST', body: fd })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }) as Promise<{ batch_id: string; count: number; skipped: number; total_rows: number }>;
  },
  updateUser: (userId: number, data: {
    competitorPlanName?: string;
    competitorPlanPrice?: number;
    currentPlanName?: string;
    currentPrice?: number;
    avgData?: number;
    avgVoice?: number;
    hasBroadband?: boolean;
    broadbandSpeed?: number;
    isFTTR?: boolean;
  }) =>
    request<UserRecord>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// Recommendations
export const recommendationsApi = {
  run: (batchId: string) =>
    request<{ count: number }>('/recommendations/run', {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId }),
    }),

  list: (params?: { batch_id?: string; status?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.batch_id) qs.set('batch_id', params.batch_id);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    const suffix = qs.toString() ? `?${qs}` : '';
    return request<RecommendationResult[]>(`/recommendations${suffix}`);
  },

  get: (id: string) =>
    request<RecommendationResult>(`/recommendations/${id}`),

  update: (id: string, data: {
    reviewStatus?: string;
    reviewNote?: string;
    script?: string;
    recommendedPlanId?: string;
    selectionMode?: string;
  }) =>
    request<RecommendationResult>(`/recommendations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  recompute: (id: string, planId: string) =>
    request<RecommendationResult>(`/recommendations/${id}/recompute`, {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    }),

  rerun: (id: string) =>
    request<RecommendationResult>(`/recommendations/${id}/rerun`, {
      method: 'POST',
    }),

  exportUrl: () => `${API_BASE}/recommendations/export/download`,

  clear: () =>
    request<{ ok: boolean }>('/recommendations', { method: 'DELETE' }),
};

// AI
export const aiApi = {
  getConfig: () =>
    request<AIProviderConfig>('/ai/config'),

  updateConfig: (config: Partial<AIProviderConfig>) =>
    request<AIProviderConfig>('/ai/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  test: (config: AIProviderConfig) =>
    request<{ success: boolean; message: string }>('/ai/test', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  generateScript: (resultId: string) =>
    request<{ script: string }>('/ai/generate-script', {
      method: 'POST',
      body: JSON.stringify({ result_id: resultId }),
    }),
};
