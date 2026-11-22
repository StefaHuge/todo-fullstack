import {useEffect, useState, type SubmitEvent, useMemo, useRef, useCallback} from "react";
import {login, getTasks, createTask, toggleTask, deleteTask, type Task, register, updateTask, logout as apiLogout, isLoggedIn } from "./api";

function Spinner({ className = '' }: { className?: string }) {
    return (
      <span
          className={`inline-block w-4 h-4 border-2 border-current 
          border-t-transparent rounded-full animate-spin ${className}`}
          aria-hidden="true"
      />
    );
}

type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

const PRIORITY_OPTIONS: { value: Priority; label: string; badge: string }[] = [
  { value: 'HIGH',   label: 'Высокий', badge: 'bg-red-100 text-red-700' },
  { value: 'MEDIUM', label: 'Средний', badge: 'bg-amber-100 text-amber-700' },
  { value: 'LOW',    label: 'Низкий',  badge: 'bg-emerald-100 text-emerald-700' },
];

function PrioritySelect({
                            value,
                            onChange,
                            size = 'md',
                            className = '',
                        }: {
  value: Priority;
  onChange: (v: Priority) => void;
  size?: 'md' | 'sm';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const selected = PRIORITY_OPTIONS
      .find((o) => o.value === value)!;
  const pad = size === 'sm'
      ? 'px-2 py-1.5 text-xs' : 'px-3 py-3 text-sm';

  return (
      <div ref={ref} className={`relative ${className}`}>
        <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`flex items-center justify-between gap-2 ${pad} 
            w-full min-w-0 bg-white rounded-lg shadow hover:bg-gray-50 
            focus:outline-none focus:ring-2 focus:ring-blue-200 transition`}
            aria-haspopup="listbox"
            aria-expanded={open}
        >
            <span className="flex items-center gap-2 min-w-0">
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] 
        font-semibold shrink-0 ${selected.badge}`}>
          {selected.value}
        </span>
          <span className="text-gray-600 truncate">{selected.label}</span>
            </span>
          <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-gray-400 transition-transform shrink-0
              ${open ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
            <div
                className="absolute z-30 mt-1 left-0 w-[200px] sm:w-[220px]
                bg-white rounded-lg shadow-lg border border-gray-100
                overflow-hidden"
                role="listbox"
            >
              {PRIORITY_OPTIONS.map((o) => (
                  <button
                      key={o.value}
                      type="button"
                      role="option"
                      aria-selected={o.value === value}
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 
                      text-sm text-left hover:bg-gray-50 ${
                          o.value === value ? 'bg-blue-50' : ''
                      }`}
                  >
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] 
              font-semibold ${o.badge}`}>
                {o.value}
              </span>
                    <span className="text-gray-700 truncate">{o.label}</span>
                    {o.value === value && (
                        <svg
                            width="14" height="14" viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"
                            className="ml-auto text-blue-500"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                  </button>
              ))}
            </div>
        )}
      </div>
  );
}

const PULL_THRESHOLD = 70;

function usePullToRefresh(onRefresh: () => Promise<unknown>) {
    const [distance, setDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const startY = useRef<number | null>(null);
    const distRef = useRef(0);
    const busyRef = useRef(false);
    const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const setDist = (v: number) => {
      distRef.current = v;
      setDistance(v); };

    const onStart = (e: TouchEvent) => {
      if (window.scrollY <= 0 && !busyRef.current)
        startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY <= 0) {
        if (e.cancelable) e.preventDefault();
        setDist(Math.min(dy * 0.5, 110));
      } else {
        startY.current = null;
        setDist(0);
      }
    };
    const onEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      if (distRef.current >= PULL_THRESHOLD && !busyRef.current) {
        busyRef.current = true;
        setRefreshing(true);
        setDist(PULL_THRESHOLD);
        Promise.resolve(refreshRef.current()).finally(() => {
          busyRef.current = false;
          setRefreshing(false);
          setDist(0);
        });
      } else {
        setDist(0);
      }
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
  }, []);

  return { distance, refreshing};
}

function App() {
  const [loggedIn, setLoggedIn] = useState<boolean>(isLoggedIn());
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>
  ('MEDIUM');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>(
      'all');
  const [error, setError] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<'HIGH' | 'MEDIUM' |
  'LOW'>('MEDIUM');
  const [newDeadline, setNewDeadline] = useState<string>('');
  const [editDeadline, setEditDeadline] = useState<string>('');
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const [tasksLoading, setTasksLoading] = useState<boolean>(isLoggedIn());
  const [creating, setCreating] = useState(false);
  const [busyTasks, setBusyTasks] = useState<Set<number>>(new Set());

  const setBusy = (id: number, on: boolean) =>
      setBusyTasks((prev) => {
        const next = new Set(prev);
        if (on) next.add(id); else next.delete(id);
        return next;
      });

  const loadTasks = useCallback(async () => {
    try {
      const data = await getTasks();
      setTasks(data);
      setError('');
    } catch {
      setError('Не удалось загрузить задачи');
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) return;
    const t = setTimeout(() => setSlowHint(true), 6000);
    return () => clearTimeout(t);
  }, [authLoading]);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    getTasks()
        .then((data) => {
          if (cancelled) return;
          setTasks(data);
          setError('');
        })
        .catch(() => {
          if (!cancelled) setError('Не удалось загрузить задачи');
        })
        .finally(() => {
          if (!cancelled) setTasksLoading(false);
        });
    return () => { cancelled = true; };
  }, [loggedIn]);

  useEffect(() => {
    const onForcedLogout = () => {
      setLoggedIn(false);
      setTasks([]);
      setError('Сессия истекла - войдите снова');
    };
    window.addEventListener('auth:logout', onForcedLogout);
    return () => window.removeEventListener('auth:logout', onForcedLogout);
  }, []);

  useEffect(() => {
    if (CSS.supports('field-sizing', 'content')) return;
    const grow = (
        el: HTMLTextAreaElement | null) => {
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    };
    grow(textareaRef.current);
  }, [newTask]);

  useEffect(() => {
    if (CSS.supports('field-sizing', 'content')) return;
    const el = editTextareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [editDescription, editingTask]);

  useEffect(() => {
    if (showAddForm) {
      textareaRef.current?.focus();
    }
  }, [showAddForm]);

  const handleError = (err: unknown) => {
    if (err instanceof Error) {
      setError(err.message);
    } else {
      setError('Произошла неизвестная ошибка');
    }
  };

  const toggleExpanded = (taskId: number) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const handleRegister = async (
      e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    setSlowHint(false);
    setError('');
    try {
      await register(email, password);
      setTasksLoading(true);
      setLoggedIn(true)
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setAuthLoading(false);
      setSlowHint(false);
    }
  };

  const handleLogin = async (
      e: SubmitEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setAuthLoading(true);
    setSlowHint(false);
    setError('');
    try {
      await login(email, password);
      setTasksLoading(true);
      setLoggedIn(true);
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setAuthLoading(false);
      setSlowHint(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === 'active') return !task.isCompleted;
      if (filter === 'completed') return task.isCompleted;
      return true;
    });
  }, [tasks, filter]);

  const handleCreate = async (
      e: SubmitEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (!newTask.trim() || !loggedIn || creating) return;
    setCreating(true);
    try {
      const task = await createTask(
          newTask,
          newPriority,
          newDeadline ? newDeadline : null
      );
      setTasks([...tasks, task]);
      setNewTask('');
      setNewPriority('MEDIUM');
      setNewDeadline('');
      setShowAddForm(false);
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (task: Task) => {
    if (!loggedIn || busyTasks.has(task.id)) return;
    setBusy(task.id, true);
    try {
      const updated = await toggleTask(task);
      setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setBusy(task.id, false);
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!loggedIn || busyTasks.has(taskId)) return;
    setBusy(taskId, true);
    try {
      await deleteTask(taskId);
      setTasksLoading(true);
      await loadTasks();
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setBusy(taskId, false);
    }
  };

  const handleLogout = async () => {
    await apiLogout();
    setLoggedIn(false)
    setTasks([]);
  };

  const handleEditStart = (task: Task) => {
    setEditingTask(task);
    setEditDescription(task.description);
    setEditPriority(task.priority);
    setEditDeadline(
        task.deadline ? task.deadline.slice(0, 16) : ''
    );
  };

  const handleEditCancel = () => {
    setEditingTask(null);
    setEditDescription('');
    setEditDeadline('');
  };

  const handleEditSave = async () => {
    if (!loggedIn || !editingTask || !editDescription.trim()
        || busyTasks.has(editingTask.id)) return;
    setBusy(editingTask.id, true);
    try {
      const updated = await updateTask(
          editingTask.id,
          editDescription,
          editPriority,
          editingTask.isCompleted,
          editDeadline ? editDeadline : null
      );
      setTasks(tasks.map((t) => (t.id === updated.id ?
          updated : t)));
      setEditingTask(null);
      setEditDescription('');
      setEditDeadline('');
    } catch (err: unknown) {
      handleError(err);
    } finally {
      setBusy(editingTask.id, false);
    }
  };

  const ptr = usePullToRefresh(async () => {
    if (!loggedIn) {
        window.location.reload();
        return;
    }
    setTasksLoading(true);
      await loadTasks();
  });

  if (!loggedIn) {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center
        justify-center p-4">
            <div className="w-full max-w-sm flex items-center
            justify-center gap-2
            overflow-hidden text-sm text-[#5F7F4F]"
                 style={{ height: ptr.distance, transition: 'height 0.15s' }}
                 role="status"
                 aria-live="polite"
            >
                {ptr.refreshing ? (
                    <><Spinner className="text-[#5F7F4F]" />
                    Перезагружаем...</>
                ) : ptr.distance >= PULL_THRESHOLD ? (
                    'Отпусти, чтобы перезагрузить'
                ) : ptr.distance > 0 ? (
                    'Тяни ещё...'
                ) : null}
            </div>
          <form onSubmit={isRegisterMode ? handleRegister : handleLogin}
                className="bg-white p-8 rounded-xl
          shadow-md w-full max-w-sm"
                aria-label={isRegisterMode ? 'Регистрация' : 'Вход'}
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center
            justify-center rounded-full bg-[#E7F0DC] text-[#344E41]
            shadow-sm">
              <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold mb-1 text-center text-[#344E41]">
              ToDO App</h1>
            <p className="text-sm text-gray-500 text-center mb-6">
              {isRegisterMode ? 'Создай аккаунт, чтобы начать'
              : 'Войдите, чтобы продолжить'}
            </p>
            {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
            <input
            type="email"
            disabled={authLoading}
            placeholder="Email"
            value={email}
            onChange={(e) =>
                setEmail(e.target.value)}
            className="w-full p-3 mb-3 bg-[#F7FAF3] focus:bg-white rounded-lg shadow border-0
           text-[#344E41] placeholder-gray-400 focus:outline-none
           focus:ring-2 focus:ring-blue-200 transition-shadow
           disabled:opacity-60"
            required
            />
            <input
            type="password"
            disabled={authLoading}
            placeholder="Пароль"
            value={password}
            onChange={(e) =>
                setPassword(e.target.value)}
            className="w-full p-3 mb-4 bg-[#F7FAF3] focus:bg-white rounded-lg shadow border-0
           text-[#344E41] placeholder-gray-400 focus:outline-none
           focus:ring-2 focus:ring-blue-200 transition-shadow
           disabled:opacity-60"
            required
            />
            <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-[#3E6B8A] text-white p-3 rounded-lg
                font-semibold hover:bg-[#355C77] active:bg-[#2D4F67]
                 shadow-sm hover:shadow-md transition-all disabled:opacity-70
                disabled:cursor-not-allowed flex items-center
                justify-center gap-2"
            >
              {authLoading && <Spinner />}
              {authLoading
                  ? (isRegisterMode ? 'Регистрируем...' : 'Входим...')
                  : (isRegisterMode ? 'Зарегистрироваться' : 'Войти')}
            </button>
            {slowHint && (
                <>
                    <p className="text-gray-400 text-xs mt-2 text-center">
                        Сервер просыпается — это может занять некоторое время ☕
                    </p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="w-full mt-1 text-gray-400 text-xs
                        hover:underline"
                    >
                        Зависло? Перезагрузить страницу
                    </button>
                </>
            )}
            <button
            type="button"
            disabled={authLoading}
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="w-full mt-3 text-[#4F6B3F] text-sm hover:text-[#344E41]
           hover:underline transition-colors disabled:opacity-60"
            >
              {isRegisterMode ? 'Уже есть аккаунт? Войти' :
                  'Нет аккаунта? Зарегистрироваться'}
            </button>
          </form>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-2xl mx-auto">
          <div
            className="flex items-center justify-center gap-2 overflow-hidden
            text-sm text-gray-500"
            style={{ height: ptr.distance, transition: 'height 0.15s' }}
          >
            {ptr.refreshing ? (
                <><Spinner className="text-blue-600" /> Обновляем...</>
            ) : ptr.distance >= PULL_THRESHOLD ? (
                'Отпусти, чтобы обновить'
            ) : ptr.distance > 0 ? (
                'Тяни ещё...'
            ) : null}
          </div>
          <div className="flex flex-col sm:flex-row justify-between
          items-start sm:items-center gap-4 mb-6">
            <h1 className="text-2xl font-semibold text-gray-700">Мои задачи</h1>
            <div className="flex flex-wrap gap-2">
              <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium 
              transition-colors ${
                filter === 'all' 
                    ? 'bg-[#3E6B8A] text-white shadow-sm hover:bg-[#355C77]' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              >
                Все ({tasks.length})
              </button>
              <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium 
              transition-colors ${
                filter === 'active' 
                    ? 'bg-[#3E6B8A] text-white shadow-sm hover:bg-[#355C77]' 
                    : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              >
                Активные ({tasks.filter((t) => !t.isCompleted)
                  .length})
              </button>
              <button
                  onClick={() => setFilter('completed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium 
                  transition-colors ${
                    filter === 'completed' 
                        ? 'bg-[#3E6B8A] text-white shadow-sm hover:bg-[#355C77]' 
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
              >
                Выполненные ({tasks.filter((t) => t
                  .isCompleted).length})
              </button>
                <button
                    onClick={() => { setTasksLoading(true); void loadTasks(); }}
                    disabled={tasksLoading}
                    className="px-3 py-2 rounded-lg bg-white text-gray-700
                  hover:bg-gray-100 disabled:opacity-50"
                    title="Обновить"
                >
                <span className={tasksLoading ? 'inline-block animate-spin'
                    : ''}>
                  ⟳
                </span>
                </button>
            </div>
            <button onClick={handleLogout} className="text-red-600
            text-sm hover:underline self-end sm:self-auto">Выйти</button>
          </div>

          {error && <p className="text-red-500 mb-4">{error}</p>}

          {showAddForm && (
              <div className="relative mb-6">
                <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="absolute -top-2 -right-2 z-10 w-7 h-7
                    rounded-full bg-gray-200 hover:bg-gray-300
                    text-gray-600 flex items-center justify-center
                    text-sm shadow-sm transition-colors"
                    aria-label="Закрыть"
                >
                  ✕
                </button>
          <form onSubmit={handleCreate} className="flex flex-col gap-2">
            <textarea
                ref={textareaRef}
                placeholder="Новая задача..."
                value={newTask}
                onChange={
              (e) =>
                  setNewTask(e.target.value)}
                rows={3}
                className="w-full p-3 bg-white rounded-lg shadow
                resize-none overflow-hidden border-0 focus:outline-none
                focus:ring-2 focus:ring-blue-200 transition-shadow
                [field-sizing:content]"
            />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">

                <PrioritySelect value={newPriority}
                                onChange={setNewPriority}
                                className="w-full min-w-0"
                />
                <div className="relative">
            <input
                type="datetime-local"
                value={newDeadline}
                onChange={
              (e) =>
                    setNewDeadline(e.target.value)}
                className="w-full min-w-0 p-3 pr-10 bg-white rounded-lg
                shadow border-0 text-sm text-gray-500 focus:outline-none
                focus:ring-2 focus:ring-blue-200 [color-scheme:light]"
                title="Дедлайн (опционально)"
            />
                  {!newDeadline && (
                      <span className="absolute left-3 top-1/2
                      -translate-y-1/2 text-sm text-gray-400
                      pointer-events-none sm:hidden">
                        Дедлайн
                      </span>
                  )}
                  {newDeadline && (
                      <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setNewDeadline('');
                          }}
                          className="absolute right-2 top-1/2
                          -translate-y-1/2 w-6 h-6 rounded-full
                          bg-gray-200 hover:bg-gray-300 text-gray-600
                          flex items-center justify-center text-xs
                          transition-colors z-10"
                          aria-label="Очистить дату"
                          title="Очистить"
                      >
                        ✕
                      </button>
                  )}
                </div>
            <button
                type="submit"
                disabled={creating}
                className="w-full min-w-0 bg-[#B4D896] text-[#344E41]
            px-6 py-3 rounded-lg font-semibold hover:bg-[#A4C886]
            active:bg-[#94B876] shadow-sm hover:shadow-md transition-all
            disabled:opacity-60 disabled:cursor-not-allowed flex
            items-center justify-center gap-2">
              {creating ? <><Spinner /> Добавляем...</> : 'Добавить'}
            </button>
              </div>
          </form>
              </div>
            )}

          {tasksLoading && tasks.length === 0 ? (
                  <ul className="space-y-2">
                    {[0, 1, 2].map((i) => (
                        <li key={i} className="bg-white p-4 rounded-lg
                        shadow animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4
                          mb-2" />
                          <div className="h-3 bg-gray-100 rounded w-1/4" />
                        </li>
                    ))}
                  </ul>
          ) : (
          <ul className="space-y-2">
            {filteredTasks.map((task) => (
                <li key={task.id}
                    className={`group relative bg-white p-3 sm:p-4 
                    rounded-lg shadow transition-shadow hover:shadow-md 
                ${activeTaskId === task.id ? 'ring-2 ring-blue-400' : ''
                }`}
                >
                  {editingTask?.id === task.id ? (
                      <div className="flex flex-col gap-2" onClick={
                        (e) =>
                            e.stopPropagation()}>
                        <textarea
                            ref={editTextareaRef}
                            value={editDescription}
                            onChange={
                          (e) =>
                                setEditDescription(e.target.value)}
                            rows={3}
                            className="w-full p-3 bg-white rounded-lg
                            shadow resize-none overflow-hidden border-0
                            focus:outline-none focus:ring-2
                            focus:ring-blue-200 transtion-shadow
                            [field-sizing:content]"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2
                        gap-2">

                          <PrioritySelect value={editPriority}
                                          onChange={setEditPriority}
                                          className="w-full min-w-0"
                          />

                          <div className="relative">
                            <input
                                type="datetime-local"
                                value={editDeadline}
                                onChange={(e) =>
                                    setEditDeadline(e.target.value)}
                                className="w-full min-w-0 p-3 pr-10
                                bg-white rounded-lg shadow border-0
                                text-sm text-gray-700
                                focus:outline-none focus:ring-2
                                focus:ring-blue-200 [color-scheme:light]"
                                title="Дедлайн (опционально)"
                            />
                            {!editDeadline && (
                                <span className="absolute left-3 top-1/2
                      -translate-y-1/2 text-sm text-gray-400
                      pointer-events-none sm:hidden">
                        Дедлайн
                      </span>
                            )}
                            {editDeadline && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setEditDeadline('');
                                    }}
                                    className="absolute right-2 top-1/2
                                    -translate-y-1/2 w-6 h-6 rounded-full
                                    bg-gray-200 hover:bg-gray-300
                                    text-gray-600 flex items-center
                                    justify-center text-xs transition-colors
                                    z-10"
                                    aria-label="Очистить дату"
                                    title="Очистить"
                                >
                                  ✕
                                </button>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                        <button
                            onClick={handleEditSave}
                            disabled={busyTasks.has(task.id)}
                            className="flex-1 bg-[#B4D896]
                            text-[#344E41] px-6 py-3 rounded-lg
                            font-semibold hover:bg-[#A4C886]
                            active:bg-[#94B876] shadow-sm hover:shadow-md
                            transition-all disabled:opacity-60 flex
                            items-center justify-center gap-2"
                        >
                          {busyTasks.has(task.id) ? <><Spinner /> Сохраняем...</> : 'Сохранить'}
                        </button>
                        <button
                            onClick={handleEditCancel}
                            className="flex-1 bg-white text-gray-600
                            px-6 py-3 rounded-lg font-medium
                            hover:bg-gray-50 shadow-sm hover:shadow-md
                            transition-all"
                        >
                          Отмена
                        </button>
                          </div>
                        </div>
                      ) : (
                          <>
                          <div className="flex items-start gap-2">
                  <span className="text-gray-400 text-sm shrink-0">
                    #{task.userTaskNumber}
                  </span>

                            <div className="flex-1">
                  <span className={`block break-words whitespace-pre-wrap
                  cursor-pointer ${
                    task.isCompleted ? 'line-through text-gray-400' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(task.id);
                  }}
                        title={expandedTasks.has(task.id) ? 'Свернуть'
                  : 'Показать полностью'}
                  >
                      {expandedTasks.has(task.id)
                          ? task.description
                          : task.description.length > 120
                            ? task.description.slice(0, 120) + '…'
                            : task.description}
                    </span>
                    {task.description.length > 120 && (
                          <span
                              className={`block text-xs text-gray-500
                          mt-1 hover:underline transition-opacity 
                          duration-150 cursor-pointer ${
                                activeTaskId === task.id
                                ? 'opacity-100' 
                                  : 'opacity-0 sm:group-hover:opacity-100' 
                          }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(task.id);
                              }}
                          >
                            {expandedTasks.has(task.id) ? '▲ Свернуть' :
                            '▼ Показать полностью'}
                          </span>
                    )}
                  </div>
                          </div>

                            <div className="flex justify-between items-end
                            mt-1 pr-8 gap-2">
                              <div>
                    {task.deadline && (
                    <div
                      className={`text-xs ${
                        isOverdue(task) ? 'font-semibold text-red-600' :
                            'text-gray-400'
                      } ${task.isCompleted ? 'line-through' : ''}`}
                    >
                      📅{' '}
                      {new Date(task.deadline).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        })}
                      {isOverdue(task) && ' (просрочено)'}
                    </div>
                      )}
                              </div>
                              <span
                                  className={`inline-block text-xs px-2 
                                py-1 rounded shrink-0 ${
                                      task.priority === 'HIGH'
                                          ? 'bg-red-100 text-red-700'
                                          : task.priority === 'LOW'
                                              ? 'bg-emerald-100 text-emerald-700'
                                              : 'bg-amber-100 text-amber-700'
                                  }`}
                              >
                                {task.priority}
                              </span>
                            </div>

                          <div className="group/tab absolute right-1
                            top-1/2 -translate-y-1/2 flex items-center">

                    <div
                    className={`flex flex-col gap-1 mr-1 transition-all 
                    duration-200 ${
                      activeTaskId === task.id 
                        ? 'opacity-100 pointer-events-auto' 
                        : 'opacity-0 pointer-events-none ' +
                          'sm:group-hover/tab:opacity-100 ' +
                          'sm:group-hover/tab:pointer-events-auto'
                    }`}
                    onClick={(e) =>
                    e.stopPropagation()}
                    >
                  <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditStart(task);
                  }}
                  disabled={busyTasks.has(task.id)}
                  className="text-sm px-2 py-1 rounded bg-blue-100
                  text-blue-700 hover:bg-blue-200 shadow-md disabled:opacity-50"
                  title="Редактировать"
                  >
                    ✎
                  </button>
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(task);
                      }}
                      disabled={busyTasks.has(task.id)}
                      className={`text-sm px-2 py-1 rounded shadow-md 
                      disabled:opacity-50 ${
                          task.isCompleted
                              ? 'bg-gray-200 text-gray-600 ' 
                              : 'bg-[#B4D896] text-[#2D4A2D] ' +
                              'hover:bg-[#A4C886]' +
                              'active:bg-[#94B876] '
                      }`}
                      title={task.isCompleted ? 'Вернуть в работу' :
                   'Отметить выполненной'}
                  >
                    {busyTasks.has(task.id) ? <Spinner /> : task.isCompleted ? '↺' : '✓'}
                  </button>
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(task.id);
                      }}
                      disabled={busyTasks.has(task.id)}
                      className="text-sm px-2 py-1 rounded bg-red-100
                      text-red-700 hover:bg-red-200 shadow-md disabled:opacity-50"
                      title="Удалить"
                  >
                    ✕
                  </button>
                  </div>

                            <button
                              onClick={(e) => {
                              e.stopPropagation();
                              setActiveTaskId(activeTaskId === task.id
                              ? null : task.id);
                              }}
                              className="w-4 h-12 bg-transparent
                              hover:bg-gray-100/60 active:bg-gray-200/60
                              rounded-md flex items-center
                              justify-center text-gray-300
                              hover:text-gray-500
                              transition-all duration-150"
                              title="Действия"
                              aria-label="Действия"
                            >
                              <span className="text-xs">
                                {activeTaskId === task.id ? '›' : '‹'}
                              </span>
                            </button>
                          </div>
                  </>
                  )}
                </li>
            ))}
          </ul>
          )}
        </div>
        <button
            onClick={() => setShowAddForm((v) => !v)}
            className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full 
            shadow-lg flex items-center justify-center text-2xl 
            transition-all duration-200 ${
              showAddForm
              ? 'bg-gray-400 hover:bg-gray-500 text-white rotate-45' 
                  : 'bg-[#B4D896] hover:bg-[#A4C886] ' +
                  'active:bg-[#94B876] text-[#344E41] ' +
                  'hover:scale-105' 
            }`}
            aria-label={showAddForm ? 'Закрыть' : 'Добавить задачу'}
                title={showAddForm ? 'Закрыть' : 'Добавить задачу'}
        >
          +
        </button>
      </div>
  );
}

export default App;

function isOverdue(task: Task): boolean {
  return (
      !task.isCompleted &&
      task.deadline !== null &&
      new Date(task.deadline) < new Date()
  );
}
