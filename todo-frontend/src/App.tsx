import {useEffect, useState, type SubmitEvent, useMemo, useRef} from "react";
import {login, getTasks, createTask, toggleTask, deleteTask, type Task, register, updateTask} from "./api";

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

function App() {
  const [token, setToken] = useState<string | null>(localStorage
      .getItem('token'));
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
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (token) {
      getTasks(token).then(setTasks).catch(() => setError(
          'Сессия истекла'));
    }
  }, [token]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [newTask]);

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
    try {
      const newToken = await register(email, password);
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setError('');
    } catch (err: unknown) {
      handleError(err);
    }
  };

  const handleLogin = async (
      e: SubmitEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    try {
      const newToken = await login(email, password);
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setError('');
    } catch (err: unknown) {
      handleError(err);
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
    if (!newTask.trim() || !token) return;
    try {
      const task = await createTask(
          token,
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
    }
  };

  const handleToggle = async (task: Task) => {
    if (!token) return;
    try {
      const updated = await toggleTask(token, task);
      setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err: unknown) {
      handleError(err);
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!token) return;
    try {
      await deleteTask(token, taskId);
      const updatedTasks = await getTasks(token);
      setTasks(updatedTasks);
    } catch (err: unknown) {
      handleError(err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
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
    if (!token || !editingTask || !editDescription.trim()) return;
    try {
      const updated = await updateTask(
          token,
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
    }
  };

  if (!token) {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center
        justify-center p-4">
          <form onSubmit={isRegisterMode ? handleRegister : handleLogin}
                className="bg-white p-8 rounded-xl
          shadow-md w-full max-w-sm">
            <h1 className="text-2xl font-bold mb-6 text-center">ToDO App</h1>
            {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
            <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) =>
                setEmail(e.target.value)}
            className="w-full p-3 border rounded-lg mb-3"
            required
            />
            <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) =>
                setPassword(e.target.value)}
            className="w-full p-3 border rounded-lg mb-4"
            required
            />
            <button
                type="submit"
                className="w-full bg-blue-600 text-white p-3 rounded-lg
                font-semibold hover:bg-blue-700"
            >
              {isRegisterMode ? 'Зарегистрироваться' : 'Войти'}
            </button>
            <button
            type="button"
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="w-full mt-3 text-blue-600 text-sm hover:underline"
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
          <div className="flex flex-col sm:flex-row justify-between
          items-start sm:items-center gap-4 mb-6">
            <h1 className="text-2xl font-semibold text-gray-700">Мои задачи</h1>
            <div className="flex flex-wrap gap-2">
              <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all' ? 'bg-blue-600 text-white' : 
                    'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              >
                Все ({tasks.length})
              </button>
              <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'active' ? 'bg-blue-600 text-white' : 
                    'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              >
                Активные ({tasks.filter((t) => !t.isCompleted)
                  .length})
              </button>
              <button
                  onClick={() => setFilter('completed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    filter === 'completed' ? 'bg-blue-600 text-white' :
                        'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
              >
                Выполненные ({tasks.filter((t) => t
                  .isCompleted).length})
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
                className="w-full p-3 bg-white rounded-lg shadow resize-none
                overflow-hidden border-0 focus:outline-none focus:ring-2
                focus:ring-blue-200 transition-shadow"
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
                      pointer-events-none">
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
                className="w-full min-w-0 bg-emerald-500 text-white
            px-6 py-3 rounded-lg font-medium hover:bg-emerald-600
            shadow-sm hover:shadow-md transition-all">
              Добавить
            </button>
              </div>
          </form>
              </div>
            )}

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
                        <input
                            type="text"
                            value={editDescription}
                            onChange={
                          (e) =>
                                setEditDescription(e.target.value)}
                            className="w-full p-2 border rounded-lg"
                        />
                        <div className="flex flex-wrap gap-2">

                          <PrioritySelect value={editPriority}
                                          onChange={setEditPriority}
                                          size="sm"
                                          className="min-w-[160px]"
                          />

                          <div className="relative">
                            <input
                                type="datetime-local"
                                value={editDeadline}
                                onChange={(e) => setEditDeadline(e.target.value)}
                                className="p-2 pr-9 border rounded-lg bg-white text-sm text-gray-500"
                                title="Дедлайн (опционально)"
                            />
                            {!newDeadline && (
                                <span className="absolute left-3 top-1/2
                      -translate-y-1/2 text-sm text-gray-400
                      pointer-events-none">
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
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center text-[10px] transition-colors"
                                    aria-label="Очистить дату"
                                    title="Очистить"
                                >
                                  ✕
                                </button>
                            )}
                          </div>
                        <button
                            onClick={handleEditSave}
                            className="px-3 py-2 rounded
                            bg-green-600 text-white
                            hover:bg-green-700"
                        >
                          ✓
                        </button>
                        <button
                            onClick={handleEditCancel}
                            className="px-3 py-2 rounded
                            bg-gray-300 text-gray-700
                            hover:bg-gray-400"
                        >
                          ✕
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
                  <span className={`block break-words cursor-pointer ${
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
                  className="text-sm px-2 py-1 rounded bg-blue-100
                  text-blue-700 hover:bg-blue-200 shadow-md"
                  title="Редактировать"
                  >
                    ✎
                  </button>
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(task);
                      }}
                      className={`text-sm px-2 py-1 rounded shadow-md ${
                          task.isCompleted
                              ? 'bg-gray-200 text-gray-600 ' 
                              : 'bg-green-100 text-green-700 '
                      }`}
                      title={task.isCompleted ? 'Вернуть в работу' :
                   'Отметить выполненной'}
                  >
                    {task.isCompleted ? '↺' : '✓'}
                  </button>
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(task.id);
                      }}
                      className="text-sm px-2 py-1 rounded bg-red-100
                      text-red-700 hover:bg-red-200 shadow-md"
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
        </div>
        <button
            onClick={() => setShowAddForm((v) => !v)}
            className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full 
            shadow-lg flex items-center justify-center text-2xl 
            transition-all duration-200 ${
              showAddForm
              ? 'bg-gray-400 hover:bg-gray-500 text-white rotate-45' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white ' +
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
