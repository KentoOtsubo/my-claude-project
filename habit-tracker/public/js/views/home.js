import { fetchReminders, fetchHabits, fetchGoals, createCheckin } from "../api.js";
import { CATEGORY_LABELS, todayString } from "../format.js";

const reminderListElement = document.getElementById("reminder-list");
const reminderListEmptyElement = document.getElementById("reminder-list-empty");
const homeHabitCountElement = document.getElementById("home-habit-count");
const homeGoalCountElement = document.getElementById("home-goal-count");

function renderReminderList(reminders) {
  reminderListElement.innerHTML = "";
  reminderListEmptyElement.hidden = reminders.length > 0;

  for (const reminder of reminders) {
    const item = document.createElement("li");

    const label = document.createElement("span");
    label.textContent = `${reminder.name}（${CATEGORY_LABELS[reminder.category]}）`;
    item.appendChild(label);

    const checkInButton = document.createElement("button");
    checkInButton.type = "button";
    checkInButton.textContent = "チェックイン";
    checkInButton.addEventListener("click", () => checkInFromHome(reminder.id));
    item.appendChild(checkInButton);

    reminderListElement.appendChild(item);
  }
}

async function checkInFromHome(habitId) {
  const { ok, body } = await createCheckin(habitId);
  if (!ok) {
    window.alert(body.error ?? "チェックインに失敗しました");
    return;
  }
  await refreshHomeView();
}

export function initHomeView() {
  // DOM参照はモジュール読み込み時にキャッシュ済み。追加の初期化は不要。
}

// refreshHomeView()は複数回呼ばれうる（初期表示時・「ホーム」タブ選択時）。
// 先に呼ばれた古い呼び出しのfetchが、後から呼ばれた新しい呼び出しより遅く
// 解決すると、古いデータで画面を上書きしてしまう競合が発生しうるため、
// 呼び出しごとに採番したトークンで最新の呼び出し以外の描画を無視する。
let latestRefreshToken = 0;

export async function refreshHomeView() {
  const token = ++latestRefreshToken;

  const reminders = await fetchReminders();
  if (token !== latestRefreshToken) return;
  renderReminderList(reminders);

  const habits = await fetchHabits();
  if (token !== latestRefreshToken) return;
  homeHabitCountElement.textContent = String(habits.length);

  const goals = await fetchGoals();
  if (token !== latestRefreshToken) return;
  const today = todayString();
  const inProgressCount = goals.filter(
    (goal) => goal.startDate <= today && goal.endDate >= today,
  ).length;
  homeGoalCountElement.textContent = String(inProgressCount);
}
