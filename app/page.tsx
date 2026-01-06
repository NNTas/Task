"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  isDaily?: boolean;
  lastResetDate?: string;
};

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [isDaily, setIsDaily] = useState(false);

  // localStorageから読み込み
  useEffect(() => {
    const saved = localStorage.getItem("todos");
    if (saved) setTodos(JSON.parse(saved));
  }, []);

  // localStorageに保存（todosが変わるたび）
  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  // デイリータスクのリセットチェック
  useEffect(() => {
    const checkAndResetDaily = () => {
      const now = new Date();
      const currentDateStr = now.toISOString().split('T')[0];
      const resetHour = 5;

      const needsReset = todos.some(
        t => t.isDaily && t.lastResetDate !== currentDateStr
      );

      if (!needsReset) return;

      if (now.getHours() >= resetHour || now.getHours() < 1) {
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

  // 警告判定
  const hasUnfinishedDaily = todos.some(
    t => t.isDaily && !t.completed && new Date().getHours() >= 4
  );

  const addTodo = () => {
    if (!input.trim()) return;
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: input.trim(),
      completed: false,
      isDaily,
      lastResetDate: isDaily ? new Date().toISOString().split('T')[0] : undefined,
    };
    setTodos([...todos, newTodo]);
    setInput("");
    setIsDaily(false);
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <main className="max-w-2xl mx-auto p-6 pt-10">
      <h1 className="text-4xl font-bold mb-10 text-center">俺のシンプルTodo</h1>

      {/* 警告 */}
      {hasUnfinishedDaily && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-8 text-center font-medium">
          ⚠️ 未完了のデイリータスクがあります！朝5時でリセットされます
        </div>
      )}

      {/* 入力エリア（デイリーチェック付き） */}
      <Card className="p-6 mb-10">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="新しいタスクを入力..."
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            className="flex-1 text-lg"
          />
          <div className="flex items-center gap-3">
            <Checkbox
              id="daily"
              checked={isDaily}
              onCheckedChange={(checked) => setIsDaily(!!checked)}
            />
            <label htmlFor="daily" className="text-sm font-medium cursor-pointer">
              毎日リセット
            </label>
          </div>
          <Button onClick={addTodo} size="lg">
            追加
          </Button>
        </div>
      </Card>

      {/* タスクリスト */}
      <div className="space-y-4">
        {todos.map((todo) => (
          <Card key={todo.id} className="p-5">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={todo.completed}
                onCheckedChange={() => toggleTodo(todo.id)}
                className="h-6 w-6"
              />
              <span className={`flex-1 text-lg ${todo.completed ? "line-through text-muted-foreground" : ""}`}>
                {todo.text}
                {todo.isDaily && <span className="text-xs text-blue-600 ml-3">（毎日リセット）</span>}
              </span>
              <Button variant="ghost" size="icon" onClick={() => deleteTodo(todo.id)}>
                ×
              </Button>
            </div>
          </Card>
        ))}
        {todos.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            まだタスクがありません
          </div>
        )}
      </div>
    </main>
  );
}