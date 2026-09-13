import {
  fetchHabits,
  fetchCheckins,
  createCheckin,
  deleteCheckin,
  deleteHabit,
} from "../api.js";
import { formatHabit, todayString, isTargetDay } from "../format.js";
import { openHabitForm } from "./habitForm.js";

const listElement = document.getElementById("habit-list");
const listEmptyElement = document.getElementById("habit-list-empty");
const categoryFilterSelect = document.getElementById("habit-category-filter");
const newButton = document.getElementById("habit-list-new-button");

function renderHabitList(habitsWithCheckins) {
  listElement.innerHTML = "";
  listEmptyElement.hidden = habitsWithCheckins.length > 0;

  for (const { habit, checkins } of habitsWithCheckins) {
    const item = document.createElement("li");
    item.dataset.habitId = habit.id;

    const label = document.createElement("span");
    label.textContent = formatHabit(habit);
    item.appendChild(label);

    const streakLabel = document.createElement("span");
    streakLabel.textContent = `🔥 ${habit.currentStreak}日継続`;
    item.appendChild(streakLabel);

    const today = todayString();
    const checkedInToday = checkins.some((c) => c.date === today);
    if (checkedInToday) {
      const doneLabel = document.createElement("span");
      doneLabel.textContent = "✓ 本日チェックイン済み";
      item.appendChild(doneLabel);
    } else if (isTargetDay(habit, today)) {
      const checkInButton = document.createElement("button");
      checkInButton.type = "button";
      checkInButton.textContent = "チェックイン";
      checkInButton.addEventListener("click", () => checkInHabit(habit.id));
      item.appendChild(checkInButton);
    }
    // 対象日でない場合はチェックインボタンを表示しない

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "編集";
    editButton.addEventListener("click", () => openHabitForm("edit", habit));
    item.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => deleteHabitFromList(habit.id));
    item.appendChild(deleteButton);

    item.appendChild(renderCheckinHistory(habit, checkins));

    listElement.appendChild(item);
  }
}

function renderCheckinHistory(habit, checkins) {
  const historyList = document.createElement("ul");
  historyList.className = "checkin-history";

  if (checkins.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "チェックイン履歴がありません";
    historyList.appendChild(empty);
    return historyList;
  }

  for (const checkin of checkins) {
    const entry = document.createElement("li");

    const dateLabel = document.createElement("span");
    dateLabel.textContent = checkin.date;
    entry.appendChild(dateLabel);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "取り消し";
    cancelButton.addEventListener("click", () =>
      cancelCheckIn(habit.id, checkin.id),
    );
    entry.appendChild(cancelButton);

    historyList.appendChild(entry);
  }

  return historyList;
}

async function cancelCheckIn(habitId, checkinId) {
  const confirmed = window.confirm(
    "このチェックインを取り消しますか？（元に戻せません）",
  );
  if (!confirmed) {
    return;
  }

  await deleteCheckin(habitId, checkinId);
  await refreshHabitListView();
}

async function checkInHabit(habitId) {
  const { ok, body } = await createCheckin(habitId);
  if (!ok) {
    window.alert(body.error ?? "チェックインに失敗しました");
    return;
  }
  await refreshHabitListView();
}

async function deleteHabitFromList(id) {
  const confirmed = window.confirm("この習慣を削除しますか？（元に戻せません）");
  if (!confirmed) {
    return;
  }

  await deleteHabit(id);
  await refreshHabitListView();
}

export function initHabitListView() {
  newButton.addEventListener("click", () => openHabitForm("new"));
  categoryFilterSelect.addEventListener("change", () => {
    refreshHabitListView();
  });
}

// refreshHomeView()と同様、複数回の呼び出しが重なった際に古い結果で
// 上書きしないよう、最新の呼び出しのみ描画を反映する。
let latestRefreshToken = 0;

export async function refreshHabitListView() {
  const token = ++latestRefreshToken;
  const category = categoryFilterSelect.value;
  const habits = await fetchHabits(category || undefined);
  if (token !== latestRefreshToken) return;

  const habitsWithCheckins = await Promise.all(
    habits.map(async (habit) => {
      const checkins = await fetchCheckins(habit.id);
      return { habit, checkins };
    }),
  );
  if (token !== latestRefreshToken) return;

  renderHabitList(habitsWithCheckins);
}
