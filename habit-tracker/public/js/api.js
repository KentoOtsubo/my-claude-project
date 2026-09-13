// 既存API（001〜006で実装済み）を呼び出す薄いラッパー。リクエスト/レスポンス
// 形式は一切変更しない（007-ui-navigation spec.md FR-014）。

export async function fetchHabits(category) {
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(`/api/habits${query}`);
  return res.json();
}

export async function createHabit(payload) {
  const res = await fetch("/api/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, body: await res.json() };
}

export async function updateHabit(id, payload) {
  const res = await fetch(`/api/habits/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, body: await res.json() };
}

export async function deleteHabit(id) {
  const res = await fetch(`/api/habits/${id}`, { method: "DELETE" });
  return { ok: res.ok };
}

export async function fetchCheckins(habitId) {
  const res = await fetch(`/api/habits/${habitId}/checkins`);
  return res.json();
}

export async function createCheckin(habitId, payload = {}) {
  const res = await fetch(`/api/habits/${habitId}/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, body: await res.json() };
}

export async function deleteCheckin(habitId, checkinId) {
  await fetch(`/api/habits/${habitId}/checkins/${checkinId}`, {
    method: "DELETE",
  });
}

export async function fetchGoals() {
  const res = await fetch("/api/goals");
  return res.json();
}

export async function createGoal(payload) {
  const res = await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, body: await res.json() };
}

export async function updateGoal(id, payload) {
  const res = await fetch(`/api/goals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, body: await res.json() };
}

export async function deleteGoal(id) {
  await fetch(`/api/goals/${id}`, { method: "DELETE" });
}

export async function fetchDashboard() {
  const res = await fetch("/api/reports/dashboard");
  return res.json();
}

export async function fetchReminders() {
  const res = await fetch("/api/reminders");
  return res.json();
}
