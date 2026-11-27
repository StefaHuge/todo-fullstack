import {useEffect, useState, type SubmitEvent, useMemo, useRef, useCallback} from "react";
import {login, getTasks, createTask, toggleTask, deleteTask, type Task, register, updateTask, logout as apiLogout, isLoggedIn } from "./api";

const GUEST_KEY = 'guestTasks';

function loadGuestTasks(): Task[] {
    try {
        const raw = localStorage.getItem(GUEST_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((t): t is Task =>
        !!t && typeof t.id === 'number' && typeof t.description === 'string');
    } catch {
        return [];
    }
}

function saveGuestTasks(tasks: Task[]) {
    try {
        localStorage.setItem(GUEST_KEY, JSON.stringify(tasks));
    } catch {
        /* ignore */
    }
}

function clearGuestTasks() {
    try {
        localStorage.removeItem(GUEST_KEY)
    } catch {
        /* ignore */
    }
}

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
  const [tasks, setTasks] = useState<Task[]>(() => (isLoggedIn() ? [] : loadGuestTasks()));
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
  const [authOpen, setAuthOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [guestPromtShown, setGuestPromtShown] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(0);
  const [syncTotal, setSyncTotal] = useState(0);

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

  const applyGuest = (next: Task[]) => {
      setTasks(next);
      saveGuestTasks(next);
  };

  const afterAuth = async () => {
      setLoggedIn(true);
      setTasksLoading(true);
      setBannerHidden(false);
      setGuestPromtShown(false);

      const guest = loadGuestTasks();
      if (guest.length > 0) {
          setSyncing(true);
          setSyncTotal(guest.length);
          setSyncDone(0);
          let remaining = guest;
          try {
              for (const t of guest) {
                  const created = await createTask(t.description,
                      t.priority, t.deadline);
                  if (t.isCompleted) {
                      await updateTask(created.id, created.description,
                          created.priority, true, created.deadline);
                  }
                  remaining = remaining.filter((x) => x.id !== t.id);
                  saveGuestTasks(remaining);
                  setSyncDone((d) => d + 1);
              }
          } catch {
              setSyncing(false);
              await loadTasks();
              throw new Error('Не все задачи перенесены. Остальные сохранены в браузере - войдите ещё раз.');
          }
          setSyncing(false);
      }

      clearGuestTasks();
      setAuthOpen(false);
      setAuthNotice('');
      await loadTasks();
  };

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
      setTasks(loadGuestTasks());
      setTasksLoading(false);
      setBannerHidden(false);
      setAuthNotice('Сессия истекла - войдите снова.');
      setAuthOpen(true);
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
      await afterAuth();
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
      await afterAuth();
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
      if (!newTask.trim() || creating) return;

      if (!loggedIn) {
          const now = new Date().toISOString();
          const task: Task = {
              id: Math.min(0, ...tasks.map((t) => t.id)) - 1,
              userTaskNumber: tasks.reduce((m, t) => Math.max(m,
                  t.userTaskNumber || 0), 0) + 1,
              description: newTask,
              isCompleted: false,
              priority: newPriority,
              createdAt: now,
              updatedAt: now,
              deadline: newDeadline ? newDeadline : null,
          };
          applyGuest([...tasks, task]);
          setNewTask('');
          setNewPriority('MEDIUM');
          setNewDeadline('');
          setShowAddForm(false);
          setBannerHidden(false);
          if (!guestPromtShown) {
              setGuestPromtShown(true);
              setAuthNotice('Задача добавлена, но пока живёт только в этом ' +
                  'браузере. Войдите или создайте аккаунт - и она ' +
                  'сохранится навсегда.');
              setAuthOpen(true);
          }
          return;
      }

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
    if (busyTasks.has(task.id)) return;
    if (!loggedIn) {
        applyGuest(tasks.map((t) => t.id === task.id
            ? {...t, isCompleted: !t.isCompleted, updatedAt: new Date().toISOString()}
            : t));
        return;
    }
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
    if (busyTasks.has(taskId)) return;
    if (!loggedIn) {
        applyGuest(tasks.filter((t) => t.id !== taskId));
        return;
    }
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
    setTasks(loadGuestTasks());
    setTasksLoading(false);
    setBannerHidden(false);
    setGuestPromtShown(false);
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
    if (!editingTask || !editDescription.trim()
        || busyTasks.has(editingTask.id)) return;
    if (!loggedIn) {
        applyGuest(tasks.map((t) => t.id === editingTask.id
            ? {...t, description: editDescription, priority: editPriority,
                deadline: editDeadline ? editDeadline : null, updatedAt:
            new Date().toISOString()}
            : t));
        handleEditCancel();
        return;
    }
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
        setTasksLoading(true);
        await new Promise((r) => setTimeout(r, 320));
        setTasks(loadGuestTasks());
        setTasksLoading(false);
        return;
    }
    setTasksLoading(true);
      await loadTasks();
  });


  return (
      <div className="min-h-screen bg-gray-100 p-4">
          <style>{`
            @keyframes todoFade { from { opacity: 0 } to { opacity: 1} }
            @keyframes todoPop { from { opacity: 0, transform: translateY(10px) scale(.97) } to { opacity: 1; transform: none } }
            html, body { overscroll-behavior-y: contain; }
            html { scrollbar-width: thin; scrollbar-color: #B4D896 #EEF2E9; }
            ::-webkit-scrollbar { width: 10px }
            ::-webkit-scrollbar-track { background: #EEF2E9 }
            ::-webkit-scrollbar-thumb { background: #B4D896; border-radius: 8px; border: 2px solid #EEF2E9 }
            ::-webkit-scrollbar-thumb:hover { background: #94B876 }
          `}</style>
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
          <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold text-gray-700">Мои задачи</h1>
                  {!loggedIn && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full
                    bg-[#E7F0DC] text-[#344E41] font-semibold">
                      гость
                    </span>
                  )}
              </div>

              {loggedIn ? (
                  <button
                      onClick={handleLogout}
                      className="text-sm font-medium text-red-600 hover:text-red-700
                      hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                      Выйти
                  </button>
              ) : (
                  <button
                      onClick={() => { setAuthNotice(''); setAuthOpen(true); }}
                      className="px-4 py-2 rounded-lg bg-[#5F7F5A] text-white text-sm
                       font-semibold hover:bg-[#526E4D] shadow-sm transition-colors"
                  >
                      Войти
                  </button>
              )}
          </div>

            <div className="flex flex-wrap gap-2 mb-6">
              <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium 
              transition-colors ${
                filter === 'all' 
                    ? 'bg-[#5F7F5A] text-white shadow-sm hover:bg-[#526E4D]' 
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
                    ? 'bg-[#5F7F5A] text-white shadow-sm hover:bg-[#526E4D]' 
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
                        ? 'bg-[#5F7F5A] text-white shadow-sm hover:bg-[#526E4D]' 
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
              >
                Выполненные ({tasks.filter((t) => t
                  .isCompleted).length})
              </button>
            </div>

          {!loggedIn && !bannerHidden && (
              <div className="relative mb-4 rounded-lg bg-[#F3F7EE] border
              border-[#DCE9CC] p-4 pr-10 shadow-sm">
                  <button
                      type="button"
                      onClick={() => setBannerHidden(true)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/70
                      hover:bg-white text-[#5F7F4F] flex items-center justify-center text-xs"
                      aria-label="Скрыть предупреждение"
                  >
                      ✕
                  </button>
                  <p className="text-sm font-semibold text-[#344E41]">
                      🌿 Гостевой режим
                      {tasks.length > 0 && (
                          <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full
                          bg-[#DCE9CC] font-semibold">
                              локально: {tasks.length}
                          </span>
                      )}
                  </p>
                  <p className="text-sm text-[#4F6B3F] mt-1">
                      Попробуйте свободно: задачи хранятся только в этом браузере.
                      Войдите или создайте аккаунт - перенесём всё в облако.
                  </p>
                  <button
                      type="button"
                      onClick={() => { setAuthNotice(''); setAuthOpen(true); }}
                      className="mt-3 bg-[#5F7F5A] text-white px-4 py-2 rounded-lg text-sm
                      font-semibold hover:bg-[#526E4D] shadow-sm transition-colors"
                  >
                      Войти или зарегистрироваться
                  </button>
              </div>
          )}

          {error && <p className="text-red-500 mb-4">
                        {error}
                    </p>}

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

          {authOpen && (
              <div
                  className="fixed inset-0 z-50 flex items-center justify-center
                    p-4 bg-[#1E2A22]/50 backdrop-blur-sm"
                  style={{animation: 'todoFade .16s ease-out'}}
                  onMouseDown={(e) => {
                      if (e.target === e.currentTarget && !authLoading && !syncing) {
                          setAuthOpen(false);
                          setAuthNotice('');
                      }
                  }}
              >
                  <div
                      role="dialog"
                      aria-modal="true"
                      className="relative bg-white p-5 sm:p-6 rounded-xl shadow-xl w-full
                        max-w-sm max-h-[85vh] overflow-y-auto"
                      style={{animation: 'todoPop .2s cubic-bezier(.2,.8,.3,1)'}}
                  >
                      {!authLoading && !syncing && (
                          <button
                              type="button"
                              onClick={() => { setAuthOpen(false); setAuthNotice(''); }}
                              className="absolute top-3 right-3 w-8 rounded-full bg-gray-100
                                hover:bg-gray-200 text-gray-500 flex items-center justify-center
                                text-sm transition-colors"
                              aria-label="Закрыть"
                              title="Продолжить без входа"
                          >
                              ✕
                          </button>
                      )}

                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center
                            rounded-full bg-[#E7F0DC] text-[#344E41] shadow-sm">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                               stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                               strokeLinejoin="round" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                          </svg>
                      </div>

                      <h2 className="text-2xl font-bold mb-1 text-center text-[#344E41]">
                          {isRegisterMode ? 'Создать аккаунт' : 'Вход в ToDO'}
                      </h2>
                      <p className="text-sm text-gray-500 text-center mb-5">
                          {isRegisterMode
                              ? 'Задачи будут храниться в аккаунте и открываться с любого устройства'
                              : 'Войдите, чтобы сохранить задачи и открыть их с любого устройства'}
                      </p>

                      {authNotice && !syncing && (
                          <div className="mb-4 rounded-lg bg-[#F3F7EE] border border-[#DCE9CC] p-3">
                              <p className="text-sm text-[#344E41]">{authNotice}</p>
                          </div>
                      )}

                      {!loggedIn && tasks.length > 0 && !syncing && (
                          <div className="mb-4 rounded-lg bg-[#FFF7E6] border border-[#F3E2BE] p-3">
                              <p className="text-sm text-[#7A5B18]">
                                  📥 Локальных задач: <b>{tasks.length}</b>. После входа перенесём их в аккаунт.
                              </p>
                          </div>
                      )}

                      {syncing && (
                          <div className="mb-4" aria-live="polite">
                              <div className="flex items-center gap-2 text-sm text-[#344E41] mb-2">
                                  <Spinner className="text-[#5F7F4F]" />
                                  Переносим задачи… {syncDone} / {syncTotal}
                              </div>
                              <div className="h-2 w-full rounded-full bg-[#E7F0DC] overflow-hidden">
                                  <div className="h-full rounded-full bg-[#94B876] transition-all duration-300"
                                       style={{width: `${syncTotal
                                               ? Math.round((syncDone / syncTotal) * 100)
                                               : 0}%`}} />
                              </div>
                          </div>
                      )}

                      {error && <p className="text-red-500 mb-4 text-sm" role="alert">{error}</p>}

                      <form onSubmit={isRegisterMode ? handleRegister : handleLogin}>
                        <input
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            autoFocus
                            disabled={authLoading || syncing}
                            placeholder="Email"
                            value={email}
                            onChange={(e) =>
                            setEmail(e.target.value)}
                            className="w-full p-3 mb-3 bg-white rounded-lg shadow border-0
                            text-[#344E41] placeholder-gray-400 focus:outline-none
                            focus:ring-2 focus:ring-blue-200 transition-shadow
                            disabled:opacity-60"
                            required
                        />
                        <input
                            type="password"
                            autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                            disabled={authLoading || syncing}
                            placeholder="Пароль"
                            value={password}
                            onChange={(e) =>
                            setPassword(e.target.value)}
                            className="w-full p-3 mb-4 bg-white rounded-lg shadow border-0
                            text-[#344E41] placeholder-gray-400 focus:outline-none
                            focus:ring-2 focus:ring-blue-200 transition-shadow
                            disabled:opacity-60"
                            required
                        />
                        <button
                            type="submit"
                            disabled={authLoading || syncing}
                            className="w-full bg-[#5F7F5A] text-white p-3 rounded-lg
                            font-semibold hover:bg-[#526E4D] active:bg-[#465D41]
                            shadow-sm hover:shadow-md transition-all disabled:opacity-70
                            disabled:cursor-not-allowed flex items-center
                            justify-center gap-2"
                        >
                            {authLoading && !syncing && <Spinner />}
                            {syncing ? 'Переносим…'
                                : authLoading
                                ? (isRegisterMode ? 'Регистрируем...' : 'Входим...')
                                : (isRegisterMode ? 'Зарегистрироваться' : 'Войти')}
                        </button>
                      </form>

                      {slowHint && !syncing && (
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
                        disabled={authLoading || syncing}
                        onClick={() => { setIsRegisterMode(!isRegisterMode); setError(''); }}
                        className="w-full mt-3 text-[#4F6B3F] text-sm hover:text-[#344E41]
                            hover:underline transition-colors disabled:opacity-60"
                      >
                        {isRegisterMode ? 'Уже есть аккаунт? Войти' :
                            'Нет аккаунта? Зарегистрироваться'}
                      </button>

                      {!authLoading && !syncing && (
                          <button
                              type="button"
                              onClick={() => { setAuthOpen(false); setAuthNotice(''); }}
                              className="w-full mt-2 text-gray-400 text-xs
                              hover:text-gray-600 hover:underline"
                          >
                              Продолжить без входа
                          </button>
                      )}

                  </div>
              </div>
          )}
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
