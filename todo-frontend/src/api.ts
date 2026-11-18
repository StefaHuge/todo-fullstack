const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface Task {
    id: number;
    userTaskNumber: number;
    description: string;
    isCompleted: boolean;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    createdAt: string;
    updatedAt: string;
    deadline: string | null;
}

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export const isLoggedIn = () => !!localStorage.getItem(REFRESH_KEY);

function saveTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
}

function clearTokens() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem('token');
}

type RefreshResult = 'ok' | 'expired' | 'network';
let refreshPromise: Promise<RefreshResult> | null = null;

function tryRefresh(): Promise<RefreshResult> {
    if (!refreshPromise) {
        refreshPromise = (async (): Promise<RefreshResult> => {
            try {
                const refreshToken = localStorage.getItem(REFRESH_KEY);
                if (!refreshToken) return 'expired';
                const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken }),
                });
                if (res.status === 401 || res.status === 403) return 'expired';
                if (!res.ok) return 'network';
                const data = await res.json();
                saveTokens(data.accessToken, data.refreshToken);
                return 'ok';
            } catch {
                return 'network';
            } finally {
                refreshPromise = null;
            }
        })();
    }
    return refreshPromise;
}

async function apiFetch(path: string, options: RequestInit = {
}): Promise<Response> {
    const doFetch = () => {
        const headers = new Headers(options.headers);
        const token = localStorage.getItem(ACCESS_KEY);
        if (token) headers.set('Authorization', `Bearer ${token}`);
        return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    };

    let res = await doFetch();

    if (res.status === 401 && !path.startsWith('/api/auth')) {
        const result = await tryRefresh();
        if (result === 'ok') {
            res = await doFetch();
        } else if (result === 'expired') {
            clearTokens();
            window.dispatchEvent(new Event('auth:logout'));
        }
    }
    return res;
}

interface AuthResponse {
    accessToken: string;
    refreshToken: string;
}

export async function register(email: string, password: string): Promise<
void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({email, password}),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Ошибка регистрации');
    }

    const data: AuthResponse = await response.json();
    saveTokens(data.accessToken, data.refreshToken);
}

export async function login(email: string, password: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Ошибка входа');
    }

    const data: AuthResponse = await response.json();
    saveTokens(data.accessToken, data.refreshToken);
}

export async function logout(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    try {
        if (refreshToken) {
            await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });
        }
    } catch { /* сервер недоступен - всё равно выходим локально */ }
        clearTokens();

}

export async function getTasks(): Promise<Task[]> {
    const response = await apiFetch('/api/tasks?size=100');
    if (!response.ok) throw new Error('Ошибка загрузки задач');
    const data = await response.json();
    return data.content;
}

export async function createTask(
    description: string,
    priority: string,
    deadline: string | null = null
): Promise<Task> {
    const response = await apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, priority, deadline }),
    });
    if (!response.ok) throw new Error('Ошибка создания задачи');
    return response.json();
}

export async function toggleTask(task: Task): Promise<Task> {
    const response = await apiFetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            description: task.description,
            priority: task.priority,
            isCompleted: !task.isCompleted,
            deadline: task.deadline,
        }),
    });
    if (!response.ok) throw new Error('Ошибка обновления задачи');
    return response.json();
}

export async function updateTask(
    taskId: number,
    description: string,
    priority: 'HIGH' | 'MEDIUM' | 'LOW',
    isCompleted: boolean,
    deadline: string | null = null
): Promise<Task> {
    const response = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            description,
            priority,
            isCompleted,
            deadline
        }),
    });
    if (!response.ok) throw new Error('Ошибка обновления задачи');
    return response.json();
}

export async function deleteTask(taskId: number): Promise<void> {
    const response = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Ошибка удаления задачи');
}