"use client";

import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";

// Supabaseクライアント（ここを自分の値に置き換えて！）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  isDaily: boolean;
  lastResetDate?: string;
  dueDate?: string;
  timerMinutes?: number;
  timerSeconds?: number;
  color?: "red" | "orange" | "yellow" | "green" | "blue" | "indigo" | "purple";
};

type SortType = "added" | "color" | "due" | "custom";

const colorOrder: ("red" | "orange" | "yellow" | "green" | "blue" | "indigo" | "purple")[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "indigo",
  "purple",
];

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [isDaily, setIsDaily] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [timerPreset, setTimerPreset] = useState("none");
  const [customMinutes, setCustomMinutes] = useState("25");
  const [customSeconds, setCustomSeconds] = useState("00");
  const [taskColor, setTaskColor] = useState<"red" | "orange" | "yellow" | "green" | "blue" | "indigo" | "purple">("blue");

  // フリータイマー
  const [freeMinutesInput, setFreeMinutesInput] = useState("25");
  const [freeSecondsInput, setFreeSecondsInput] = useState("00");
  const [freeRemaining, setFreeRemaining] = useState(25 * 60);
  const [freeIsRunning, setFreeIsRunning] = useState(false);
  const [freeIsPomodoro, setFreeIsPomodoro] = useState(true);

  // タスクタイマー
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);
  const [taskRemaining, setTaskRemaining] = useState(0);
  const [taskIsRunning, setTaskIsRunning] = useState(false);

  // UI状態
  const [clockSize, setClockSize] = useState<"small" | "medium" | "large" | "none">("medium");
  const [clockOpacity, setClockOpacity] = useState(100);
  const [showClockMenu, setShowClockMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "calendar">("tasks");
  const [showTaskInputPanel, setShowTaskInputPanel] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>("");

  // 警告・削除
  const [deleteConfirmTodo, setDeleteConfirmTodo] = useState<Todo | null>(null);
  const [overdueAlert, setOverdueAlert] = useState<Todo[]>([]);
  const [urgentTodoIds, setUrgentTodoIds] = useState<string[]>([]);

  // ソート
  const [normalSort, setNormalSort] = useState<SortType>("due");

  // カレンダー用
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Supabase ユーザー状態
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // タブタイトル
  useEffect(() => {
    if (taskIsRunning || freeIsRunning) {
      const totalSeconds = taskIsRunning ? taskRemaining : freeRemaining;
      const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
      const s = (totalSeconds % 60).toString().padStart(2, "0");
      document.title = `${m}:${s} - 俺のTodoアプリ`;
    } else {
      document.title = "俺の究極Todoアプリ";
    }
  }, [taskRemaining, freeRemaining, taskIsRunning, freeIsRunning]);

  // localStorage（Supabase導入前の一時保存）
  useEffect(() => {
    const saved = localStorage.getItem("todos");
    if (saved) {
      const loaded = JSON.parse(saved);
      setTodos(loaded);
      checkOverdue(loaded);
    }
    const savedClockSize = localStorage.getItem("clockSize");
    if (savedClockSize) setClockSize(savedClockSize as any);
    const savedClockOpacity = localStorage.getItem("clockOpacity");
    if (savedClockOpacity) setClockOpacity(Number(savedClockOpacity));
    const savedNormalSort = localStorage.getItem("normalSort");
    if (savedNormalSort) setNormalSort(savedNormalSort as SortType);
  }, []);

  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
    localStorage.setItem("clockSize", clockSize);
    localStorage.setItem("clockOpacity", clockOpacity.toString());
    localStorage.setItem("normalSort", normalSort);
    checkOverdue(todos);
  }, [todos, clockSize, clockOpacity, normalSort]);

  // Supabaseログイン状態チェック
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkOverdue = (todosList: Todo[]) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdue = todosList.filter(t => !t.isDaily && !t.completed && t.dueDate && new Date(t.dueDate) < now);
    if (overdue.length > 0) {
      setOverdueAlert(overdue);
    }
  };

  useEffect(() => {
    if (activeTab === "tasks") {
      setShowTaskInputPanel(false);
    }
  }, [activeTab]);

  // デイリーリセット
  useEffect(() => {
    const checkAndResetDaily = () => {
      const now = new Date();
      const currentDateStr = now.toISOString().split('T')[0];
      const needsReset = todos.some(t => t.isDaily && t.lastResetDate !== currentDateStr);

      if (needsReset && (now.getHours() >= 5 || now.getHours() < 1)) {
        setTodos(prev =>
          prev.map(t =>
            t.isDaily && t.lastResetDate !== currentDateStr
              ? { ...t, completed: false, lastResetDate: currentDateStr }
              : t
          )
        );
      }
    };

    checkAndResetDaily();
    const interval = setInterval(checkAndResetDaily, 60 * 1000);
    return () => clearInterval(interval);
  }, [todos]);

  const addTodo = () => {
    if (!input.trim()) return;

    let totalSeconds = 0;
    if (isDaily) {
      if (timerPreset === "10") totalSeconds = 10 * 60;
      else if (timerPreset === "25") totalSeconds = 25 * 60;
      else if (timerPreset === "30") totalSeconds = 30 * 60;
      else if (timerPreset === "custom") {
        totalSeconds = (parseInt(customMinutes) || 0) * 60 + (parseInt(customSeconds) || 0);
      }
    }

    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: input.trim(),
      completed: false,
      isDaily,
      dueDate: !isDaily && dueDate ? dueDate : undefined,
      lastResetDate: isDaily ? new Date().toISOString().split('T')[0] : undefined,
      timerMinutes: isDaily ? Math.floor(totalSeconds / 60) : undefined,
      timerSeconds: isDaily ? totalSeconds % 60 || 0 : undefined,
      color: taskColor,
    };

    setTodos([...todos, newTodo]);
    setInput("");
    setDueDate("");
    setTimerPreset("none");
    setCustomMinutes("25");
    setCustomSeconds("00");
    setShowTaskInputPanel(false);
  };

  const requestDelete = (todo: Todo) => {
    setDeleteConfirmTodo(todo);
  };

  const confirmDelete = () => {
    if (!deleteConfirmTodo) return;
    setTodos(todos.filter(t => t.id !== deleteConfirmTodo.id));
    if (activeTodoId === deleteConfirmTodo.id) resetTaskTimer();
    setDeleteConfirmTodo(null);
  };

  const markOverdueAsDone = () => {
    overdueAlert.forEach(t => {
      setTodos(prev => prev.filter(p => p.id !== t.id));
    });
    setOverdueAlert([]);
  };

  const markAsUrgent = () => {
    setUrgentTodoIds(overdueAlert.map(t => t.id));
    setOverdueAlert([]);
  };

  const resetTaskTimer = () => {
    setTaskIsRunning(false);
    setActiveTodoId(null);
    setTaskRemaining(0);
  };

  const playBeep = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 900;
    o.type = "sine";
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  };

  useEffect(() => {
    if (!taskIsRunning || taskRemaining <= 0) return;
    const interval = setInterval(() => {
      setTaskRemaining(prev => {
        if (prev <= 1) {
          setTaskIsRunning(false);
          playBeep();
          if (activeTodoId) {
            setTodos(prevTodos => prevTodos.map(t => t.id === activeTodoId ? { ...t, completed: true } : t));
            setActiveTodoId(null);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [taskIsRunning, taskRemaining, activeTodoId]);

  useEffect(() => {
    if (!freeIsRunning || freeRemaining <= 0) return;
    const interval = setInterval(() => {
      setFreeRemaining(prev => {
        if (prev <= 1) {
          setFreeIsRunning(false);
          playBeep();
          return freeIsPomodoro ? 5 * 60 : 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [freeIsRunning, freeRemaining, freeIsPomodoro]);

  const startFreeTimer = () => {
    const mins = freeIsPomodoro ? 25 : (parseInt(freeMinutesInput) || 0);
    const secs = freeIsPomodoro ? 0 : (parseInt(freeSecondsInput) || 0);
    const total = mins * 60 + secs;
    if (total > 0) {
      setFreeRemaining(total);
      setFreeIsRunning(true);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  useEffect(() => {
    setCurrentTime(new Date());
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const getClockClass = () => {
    if (clockSize === "small") return "text-2xl px-4 py-2";
    if (clockSize === "medium") return "text-3xl px-6 py-3";
    if (clockSize === "large") return "text-5xl px-8 py-4";
    return "hidden";
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const getDateColor = (dateStr: string) => {
    const dayTasks = todos.filter(t => !t.isDaily && t.dueDate === dateStr && t.color);
    return dayTasks.length > 0 ? dayTasks[0].color! : null;
  };

  const colorClasses = {
    red: "bg-red-500",
    orange: "bg-orange-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    purple: "bg-purple-500",
  };

  const handleDateClick = (dateStr: string) => {
    if (activeTab !== "calendar") return;
    setSelectedCalendarDate(dateStr);
    setDueDate(dateStr);
    setIsDaily(false);
    setInput("");
    setShowTaskInputPanel(true);
  };

  const closeAllPanels = () => {
    setShowClockMenu(false);
    setSidebarOpen(false);
    setShowTaskInputPanel(false);
    setDeleteConfirmTodo(null);
  };

  const getDueDateColor = (dueDateStr: string | undefined) => {
    if (!dueDateStr) return "text-gray-800";
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const delta = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (delta < 0) return "text-purple-600 font-bold";
    if (delta <= 3) return "text-red-600 font-bold";
    if (delta <= 7) return "text-orange-600 font-bold";
    return "text-gray-800";
  };

  const formatJapaneseDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const sortTodos = (todosList: Todo[], type: SortType) => {
    const list = [...todosList];
    if (type === "added") {
      return list.reverse();
    } else if (type === "color") {
      return list.sort((a, b) => {
        const aIndex = a.color ? colorOrder.indexOf(a.color) : -1;
        const bIndex = b.color ? colorOrder.indexOf(b.color) : -1;
        return aIndex - bIndex;
      });
    } else if (type === "due") {
      return list.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }
    return list.reverse(); // customは追加順逆
  };

  const normalTodos = sortTodos(todos.filter(t => !t.isDaily), normalSort);
  const dailyTodos = todos.filter(t => t.isDaily);

  const startTodoTimer = (todo: Todo) => {
    const total = (todo.timerMinutes || 0) * 60 + (todo.timerSeconds || 0);
    if (total === 0) return;
    setActiveTodoId(todo.id);
    setTaskRemaining(total);
    setTaskIsRunning(true);
  };

  // ログイン関数
  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert("ログイン失敗: " + error.message);
    } else {
      setIsLoginOpen(false);
      alert("ログイン成功！");
    }
  };

  // サインアップ関数
  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      alert("登録失敗: " + error.message);
    } else {
      alert("登録完了！メールを確認してログインしてください");
    }
  };

  // ログアウト
  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert("ログアウトしました");
  };

  return (
    <>
      {(sidebarOpen || showClockMenu || showTaskInputPanel || deleteConfirmTodo || overdueAlert.length > 0) && (
        <div className="fixed inset-0 bg-black/50 z-20" onClick={closeAllPanels} />
      )}

      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="fixed top-5 left-5 text-4xl z-50 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-4 shadow-2xl hover:shadow-xl transition-all">
        ≡
      </button>

      <div className="fixed top-5 right-5 z-50 flex items-start gap-4">
        <button onClick={() => setShowClockMenu(!showClockMenu)} className="text-4xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-4 shadow-2xl hover:shadow-xl transition-all">
          🕒
        </button>

        {currentTime && clockSize !== "none" && (
          <div
            className={`bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-2xl font-mono text-gray-800 dark:text-gray-200 ${getClockClass()}`}
            style={{ opacity: clockOpacity / 100 }}
          >
            {currentTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        )}

        {showClockMenu && (
          <div className="absolute top-20 right-0 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-2xl py-4 px-6 w-64 z-30">
            <div className="mb-6">
              <p className="text-lg font-medium mb-3">サイズ</p>
              {["なし", "小", "中", "大"].map(size => (
                <button key={size} className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" onClick={() => setClockSize(size === "なし" ? "none" : size === "小" ? "small" : size === "中" ? "medium" : "large")}>
                  {size} {clockSize === (size === "なし" ? "none" : size === "小" ? "small" : size === "中" ? "medium" : "large") && "✓"}
                </button>
              ))}
            </div>
            <div>
              <p className="text-lg font-medium mb-3">透明度: {clockOpacity}%</p>
              <input type="range" min="20" max="100" value={clockOpacity} onChange={(e) => setClockOpacity(Number(e.target.value))} className="w-full h-3 bg-gray-300 rounded-lg appearance-none cursor-pointer" />
            </div>
            <button onClick={() => setShowClockMenu(false)} className="mt-6 w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              閉じる
            </button>
          </div>
        )}
      </div>

      <div className={`fixed left-0 top-0 h-full w-96 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 shadow-2xl z-40 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-8">
          <button onClick={() => setSidebarOpen(false)} className="text-3xl mb-8 text-gray-600 dark:text-gray-400 hover:text-gray-900">×</button>
          <h2 className="text-3xl font-bold mb-10 text-gray-800 dark:text-white">メニュー</h2>
          <div className="space-y-4">
            <button onClick={() => { setActiveTab("tasks"); setSidebarOpen(false); }} className={`w-full text-left text-xl py-4 px-6 rounded-xl transition-all ${activeTab === "tasks" ? "bg-blue-500 text-white shadow-lg" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
              タスク管理
            </button>
            <button onClick={() => { setActiveTab("calendar"); setSidebarOpen(false); }} className={`w-full text-left text-xl py-4 px-6 rounded-xl transition-all ${activeTab === "calendar" ? "bg-blue-500 text-white shadow-lg" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"}`}>
              カレンダー
            </button>

            {/* ログインメニュー */}
            <div className="mt-8 border-t pt-6">
              {user ? (
                <div className="text-center">
                  <p className="text-lg font-medium mb-4">ようこそ、{user.email}</p>
                  <Button onClick={handleLogout} variant="destructive" className="w-full">
                    ログアウト
                  </Button>
                </div>
              ) : (
                <div>
                  <Button onClick={() => setIsLoginOpen(!isLoginOpen)} className="w-full text-xl py-6">
                    {isLoginOpen ? "閉じる" : "ログイン / 登録"}
                  </Button>

                  {isLoginOpen && (
                    <div className="mt-6 space-y-4">
                      <Input
                        type="email"
                        placeholder="メールアドレス"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="text-lg"
                      />
                      <Input
                        type="password"
                        placeholder="パスワード"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="text-lg"
                      />
                      <div className="flex gap-4">
                        <Button onClick={handleLogin} className="flex-1">
                          ログイン
                        </Button>
                        <Button onClick={handleSignUp} variant="outline" className="flex-1">
                          新規登録
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="transition-all duration-500">
        {activeTab === "calendar" && (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-20 px-8">
            <div className="max-w-5xl mx-auto">
              <h1 className="text-5xl font-bold text-center mb-12 text-gray-800 dark:text-white">カレンダー</h1>
              <Card className="p-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="text-3xl p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">‹</button>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
                    {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
                  </h2>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="text-3xl p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">›</button>
                </div>
                <div className="grid grid-cols-7 gap-4 text-center text-lg font-medium text-gray-600 dark:text-gray-400 mb-4">
                  {["日", "月", "火", "水", "木", "金", "土"].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-4">
                  {Array.from({ length: getFirstDayOfMonth(currentMonth) }, (_, i) => <div key={`empty-${i}`} />)}
                  {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => {
                    const day = i + 1;
                    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const cellColor = getDateColor(dateStr);
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    return (
                      <button
                        key={day}
                        onClick={() => handleDateClick(dateStr)}
                        className={`aspect-square rounded-2xl text-3xl font-bold transition-all flex items-center justify-center relative ${
                          cellColor ? colorClasses[cellColor] : isToday ? "bg-blue-200 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                        } ${cellColor ? "text-white hover:opacity-80" : "text-gray-800 dark:text-white"}`}
                        style={cellColor && showTaskInputPanel && selectedCalendarDate === dateStr ? { backgroundColor: "#000" } : {}}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <main className="max-w-7xl mx-auto p-8 pt-28 pb-20">
            <h1 className="text-5xl font-bold mb-12 text-center text-gray-800 dark:text-white bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              俺の究極Todoアプリ
            </h1>

            <Card className="p-8 mb-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-xl">
              <div className="flex flex-col gap-6">
                <Input value={input} onChange={e => setInput(e.target.value)} placeholder="新しいタスクを入力..." onKeyDown={e => e.key === "Enter" && addTodo()} className="text-xl h-14" />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                  <div className="flex items-center gap-4">
                    <label className="text-lg font-medium">種類：</label>
                    <select value={isDaily ? "daily" : "normal"} onChange={e => setIsDaily(e.target.value === "daily")} className="px-5 py-3 border rounded-xl text-lg bg-gray-50 dark:bg-gray-700">
                      <option value="normal">通常タスク</option>
                      <option value="daily">デイリータスク</option>
                    </select>
                  </div>

                  {!isDaily && (
                    <div className="flex items-center gap-4">
                      <label className="text-lg font-medium">期限：</label>
                      <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="text-lg" />
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <label className="text-lg font-medium">色：</label>
                    <select value={taskColor} onChange={e => setTaskColor(e.target.value as any)} className="px-5 py-3 border rounded-xl text-lg bg-gray-50 dark:bg-gray-700">
                      <option value="red">赤</option>
                      <option value="orange">橙</option>
                      <option value="yellow">黄</option>
                      <option value="green">緑</option>
                      <option value="blue">青</option>
                      <option value="indigo">藍</option>
                      <option value="purple">紫</option>
                    </select>
                  </div>

                  {isDaily && (
                    <div className="flex items-center gap-4">
                      <label className="text-lg font-medium">タイマー：</label>
                      <select value={timerPreset} onChange={e => setTimerPreset(e.target.value)} className="px-5 py-3 border rounded-xl text-lg bg-gray-50 dark:bg-gray-700">
                        <option value="none">なし</option>
                        <option value="10">10分</option>
                        <option value="25">25分</option>
                        <option value="30">30分</option>
                        <option value="custom">カスタム</option>
                      </select>
                      {timerPreset === "custom" && (
                        <div className="flex items-center gap-2">
                          <Input type="number" value={customMinutes} onChange={e => setCustomMinutes(e.target.value)} placeholder="分" className="w-20 text-center" />
                          <span className="text-xl">:</span>
                          <Input type="number" value={customSeconds} onChange={e => setCustomSeconds(e.target.value)} placeholder="秒" className="w-20 text-center" min="0" max="59" />
                        </div>
                      )}
                    </div>
                  )}

                  <Button onClick={addTodo} size="lg" className="text-xl py-7">
                    タスク追加
                  </Button>
                </div>
              </div>
            </Card>

            {taskIsRunning && activeTodoId && (
              <Card className="p-10 mb-12 bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-2xl">
                <div className="text-center">
                  <p className="text-2xl font-medium mb-6">
                    タスク「{todos.find(t => t.id === activeTodoId)?.text}」作業中
                  </p>
                  <p className="text-8xl font-bold font-mono mb-8">{formatTime(taskRemaining)}</p>
                  <Button onClick={resetTaskTimer} variant="destructive" size="lg" className="text-xl">
                    中止する
                  </Button>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-white">通常タスク</h2>
                  <select value={normalSort} onChange={e => setNormalSort(e.target.value as SortType)} className="px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700">
                    <option value="added">追加順</option>
                    <option value="color">色順</option>
                    <option value="due">期限順</option>
                    <option value="custom">カスタム（現在無効）</option>
                  </select>
                </div>
                <div className="space-y-6">
                  {normalTodos.map(todo => (
                    <TaskCard
                      key={todo.id}
                      todo={todo}
                      isActive={activeTodoId === todo.id}
                      onStart={startTodoTimer}
                      onToggle={() => {}}
                      onDelete={requestDelete}
                      urgentTodoIds={urgentTodoIds}
                    />
                  ))}
                  {normalTodos.length === 0 && <Card className="p-12 text-center text-gray-500">通常タスクはありません</Card>}
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">デイリータスク</h2>
                <div className="space-y-6">
                  {dailyTodos.map(todo => (
                    <TaskCard
                      key={todo.id}
                      todo={todo}
                      isActive={activeTodoId === todo.id}
                      onStart={startTodoTimer}
                      onToggle={(checked) => {
                        setTodos(todos.map(t => t.id === todo.id ? { ...t, completed: checked as boolean } : t));
                        if (activeTodoId === todo.id) resetTaskTimer();
                      }}
                      onDelete={requestDelete}
                      urgentTodoIds={urgentTodoIds}
                    />
                  ))}
                  {dailyTodos.length === 0 && <Card className="p-12 text-center text-gray-500">デイリータスクはありません</Card>}
                </div>
              </div>
            </div>

            <Card className="p-12 bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-2xl">
              <h2 className="text-4xl font-bold text-center mb-10">フリータイマー</h2>
              <div className="text-center text-8xl font-bold font-mono mb-10">{formatTime(freeRemaining)}</div>
              <p className="text-2xl text-center mb-8">{freeIsPomodoro ? "🍅 ポモドーロモード" : "通常タイマー"}</p>

              <div className="flex justify-center items-center gap-4 mb-8">
                <Input
                  value={freeMinutesInput}
                  onChange={e => setFreeMinutesInput(e.target.value)}
                  type="number"
                  placeholder="分"
                  className="w-24 text-center text-black"
                  disabled={freeIsPomodoro || freeIsRunning}
                />
                <span className="text-4xl">:</span>
                <Input
                  value={freeSecondsInput}
                  onChange={e => setFreeSecondsInput(e.target.value)}
                  type="number"
                  placeholder="秒"
                  className="w-24 text-center text-black"
                  min="0"
                  max="59"
                  disabled={freeIsPomodoro || freeIsRunning}
                />
              </div>

              <div className="flex justify-center gap-6 flex-wrap">
                {!freeIsRunning && (
                  <Button onClick={startFreeTimer} size="lg" className="text-2xl px-10 py-8">
                    スタート
                  </Button>
                )}
                <Button onClick={() => setFreeIsRunning(!freeIsRunning)} size="lg" variant="secondary" className="text-2xl px-10 py-8 text-black">
                  {freeIsRunning ? "ポーズ" : "再開"}
                </Button>
                <Button onClick={() => { setFreeIsRunning(false); setFreeRemaining(freeIsPomodoro ? 25*60 : 0); }} size="lg" variant="outline" className="text-2xl px-10 py-8 text-black border-2 border-white">
                  リセット
                </Button>
                {!freeIsRunning && (
                  <Button onClick={() => setFreeIsPomodoro(!freeIsPomodoro)} size="lg" variant="outline" className="text-2xl px-10 py-8 text-black border-2 border-white">
                    {freeIsPomodoro ? "通常モード" : "ポモドーロ"}
                  </Button>
                )}
              </div>
            </Card>
          </main>
        )}
      </div>

      <div className={`fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl z-30 transition-transform duration-500 ${showTaskInputPanel ? "translate-x-0" : "translate-x-full"}`}>
        <div className="p-10 flex flex-col h-full">
          <h2 className="text-3xl font-bold mb-8">タスク追加 ({selectedCalendarDate})</h2>

          <div className="mb-8 flex-1 overflow-y-auto">
            <p className="text-lg font-medium mb-4">この日のタスク</p>
            {todos.filter(t => !t.isDaily && t.dueDate === selectedCalendarDate).length === 0 ? (
              <p className="text-gray-500">まだタスクはありません</p>
            ) : (
              <div className="space-y-4">
                {todos.filter(t => !t.isDaily && t.dueDate === selectedCalendarDate).map(todo => (
                  <TaskCard
                    key={todo.id}
                    todo={todo}
                    isActive={false}
                    onStart={() => {}}
                    onToggle={() => {}}
                    onDelete={requestDelete}
                    urgentTodoIds={urgentTodoIds}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t pt-8">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="新しいタスクを入力" className="text-xl h-14 mb-6" autoFocus />

            <div className="mb-6">
              <label className="text-lg font-medium block mb-3">色を選択：</label>
              <select value={taskColor} onChange={e => setTaskColor(e.target.value as any)} className="w-full px-5 py-3 border rounded-xl text-lg bg-gray-50 dark:bg-gray-700">
                <option value="red">赤</option>
                <option value="orange">橙</option>
                <option value="yellow">黄</option>
                <option value="green">緑</option>
                <option value="blue">青</option>
                <option value="indigo">藍</option>
                <option value="purple">紫</option>
              </select>
            </div>

            <Button onClick={addTodo} size="lg" className="w-full text-xl py-8 mb-4">
              この日に追加
            </Button>

            <Button onClick={() => setShowTaskInputPanel(false)} variant="outline" size="lg" className="w-full text-xl py-6">
              閉じる
            </Button>
          </div>
        </div>
      </div>

      {deleteConfirmTodo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-10 max-w-md mx-4">
            <h3 className="text-2xl font-bold mb-6 text-center">
              {deleteConfirmTodo.isDaily
                ? `デイリータスク「${deleteConfirmTodo.text}」を消去します。本当にいいのかな？かな？？`
                : `通常タスク「${deleteConfirmTodo.text}」を消去します。本当に終わったかな？かな？？`}
            </h3>
            <div className="flex gap-4 justify-center">
              <Button onClick={confirmDelete} variant="destructive" size="lg">
                はい、削除する
              </Button>
              <Button onClick={() => setDeleteConfirmTodo(null)} variant="outline" size="lg">
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}

      {overdueAlert.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-10 max-w-lg mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-3xl font-bold mb-8 text-center text-red-600">期限超過警告</h3>
            <div className="space-y-6 mb-8">
              {overdueAlert.map(todo => (
                <div key={todo.id} className="p-6 bg-red-100 dark:bg-red-900 rounded-xl">
                  <p className="text-2xl font-medium text-center">
                    タスク「{todo.text}」が期限を超過しています
                  </p>
                  <p className="text-xl text-center mt-3">
                    (期限 {formatJapaneseDate(todo.dueDate!)})
                  </p>
                  <p className="text-xl text-center mt-4 font-bold">
                    ちゃんと終わってるかな？かな？？
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-6 justify-center">
              <Button onClick={markAsUrgent} variant="destructive" size="lg" className="text-2xl px-10 py-6">
                ヤバい！！
              </Button>
              <Button onClick={markOverdueAsDone} size="lg" className="text-2xl px-10 py-6">
                終わった！
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TaskCard({
  todo,
  isActive,
  onStart,
  onToggle,
  onDelete,
  urgentTodoIds,
}: {
  todo: Todo;
  isActive: boolean;
  onStart: (todo: Todo) => void;
  onToggle: (checked: boolean) => void;
  onDelete: (todo: Todo) => void;
  urgentTodoIds: string[];
}) {
  const colorClasses = {
    red: "border-l-8 border-red-500",
    orange: "border-l-8 border-orange-500",
    yellow: "border-l-8 border-yellow-500",
    green: "border-l-8 border-green-500",
    blue: "border-l-8 border-blue-500",
    indigo: "border-l-8 border-indigo-500",
    purple: "border-l-8 border-purple-500",
  };

  const cardColorClass = todo.color ? colorClasses[todo.color] : "";

  const dueColorClass = getDueDateColor(todo.dueDate);

  const isUrgent = urgentTodoIds.includes(todo.id);

  return (
    <div className="relative">
      <Card
        className={`p-8 transition-all ${isActive ? "ring-4 ring-blue-500 shadow-2xl scale-105" : "shadow-lg hover:shadow-xl"} ${cardColorClass}`}
      >
        <div className="flex items-center gap-6 flex-wrap">
          {isUrgent && <span className="text-6xl text-red-600 font-bold animate-pulse">！</span>}
          {todo.isDaily && <Checkbox checked={todo.completed} onCheckedChange={onToggle} className="h-8 w-8" />}
          <div className="flex-1">
            <span className={`text-2xl ${todo.completed ? "line-through text-gray-500" : "text-gray-800 dark:text-white"}`}>
              {todo.text}
            </span>
            {todo.dueDate && <span className={`block text-lg mt-2 ${dueColorClass}`}>期限: {todo.dueDate}</span>}
            {todo.isDaily && (todo.timerMinutes !== undefined || todo.timerSeconds !== undefined) && (
              <span className="block text-lg text-green-600">
                タイマー: {todo.timerMinutes || 0}分 {todo.timerSeconds || 0}秒
              </span>
            )}
          </div>
          {todo.isDaily && !todo.completed && (todo.timerMinutes !== undefined || todo.timerSeconds !== undefined) && (
            <Button size="lg" variant={isActive ? "secondary" : "default"} onClick={() => onStart(todo)} className="text-xl px-8">
              {isActive ? "実行中" : "開始"}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => onDelete(todo)} className="text-2xl">
            ×
          </Button>
        </div>
      </Card>
    </div>
  );
}

function getDueDateColor(dueDateStr: string | undefined): string {
  if (!dueDateStr) return "text-gray-800";
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const delta = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (delta < 0) return "text-purple-600 font-bold";
  if (delta <= 3) return "text-red-600 font-bold";
  if (delta <= 7) return "text-orange-600 font-bold";
  return "text-gray-800";
}