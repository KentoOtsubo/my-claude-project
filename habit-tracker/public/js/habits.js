const FREQUENCY_LABELS = { daily: "毎日", weekly: "毎週" };
const CATEGORY_LABELS = {
  health: "健康",
  work: "仕事",
  study: "学習",
  other: "その他",
  uncategorized: "未分類",
};
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const form = document.getElementById("habit-form");
const nameInput = document.getElementById("habit-name");
const frequencyTypeSelect = document.getElementById("habit-frequency-type");
const weeklyDaysFieldset = document.getElementById("habit-weekly-days");
const categorySelect = document.getElementById("habit-category");
const formError = document.getElementById("habit-form-error");
const formSubmitButton = document.getElementById("habit-form-submit");
const formCancelButton = document.getElementById("habit-form-cancel");
const listElement = document.getElementById("habit-list");
const listEmptyElement = document.getElementById("habit-list-empty");
const categoryFilterSelect = document.getElementById("habit-category-filter");

let editingHabitId = null;

function formatHabit(habit) {
  const frequency =
    habit.frequencyType === "weekly"
      ? `毎週（${habit.weeklyDays.map((day) => WEEKDAY_LABELS[day]).join("・")}）`
      : FREQUENCY_LABELS[habit.frequencyType];
  return `${habit.name}（${frequency} / ${CATEGORY_LABELS[habit.category]}）`;
}

function weeklyDaysFromForm() {
  return Array.from(
    weeklyDaysFieldset.querySelectorAll("input[type=checkbox]:checked"),
  ).map((checkbox) => Number(checkbox.value));
}

function setWeeklyDaysInForm(days) {
  const checkboxes = weeklyDaysFieldset.querySelectorAll(
    "input[type=checkbox]",
  );
  for (const checkbox of checkboxes) {
    checkbox.checked = days.includes(Number(checkbox.value));
  }
}

function enterEditMode(habit) {
  editingHabitId = habit.id;
  nameInput.value = habit.name;
  frequencyTypeSelect.value = habit.frequencyType;
  weeklyDaysFieldset.hidden = habit.frequencyType !== "weekly";
  setWeeklyDaysInForm(habit.weeklyDays);
  categorySelect.value = habit.category;
  formSubmitButton.textContent = "更新";
  formCancelButton.hidden = false;
  formError.textContent = "";
}

function exitEditMode() {
  editingHabitId = null;
  form.reset();
  weeklyDaysFieldset.hidden = true;
  formSubmitButton.textContent = "登録";
  formCancelButton.hidden = true;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function dayOfWeek(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`).getUTCDay();
}

function isTargetDay(habit, dateString) {
  return (
    habit.frequencyType === "daily" ||
    habit.weeklyDays.includes(dayOfWeek(dateString))
  );
}

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
    editButton.addEventListener("click", () => enterEditMode(habit));
    item.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => deleteHabit(habit.id));
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

  await fetch(`/api/habits/${habitId}/checkins/${checkinId}`, {
    method: "DELETE",
  });
  await loadHabits();
}

async function loadHabits() {
  const category = categoryFilterSelect.value;
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(`/api/habits${query}`);
  const habits = await res.json();

  const habitsWithCheckins = await Promise.all(
    habits.map(async (habit) => {
      const checkinsRes = await fetch(`/api/habits/${habit.id}/checkins`);
      const checkins = await checkinsRes.json();
      return { habit, checkins };
    }),
  );

  renderHabitList(habitsWithCheckins);
}

async function checkInHabit(habitId) {
  const res = await fetch(`/api/habits/${habitId}/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const body = await res.json();
    window.alert(body.error ?? "チェックインに失敗しました");
    return;
  }

  await loadHabits();
}

async function deleteHabit(id) {
  const confirmed = window.confirm("この習慣を削除しますか？（元に戻せません）");
  if (!confirmed) {
    return;
  }

  const res = await fetch(`/api/habits/${id}`, { method: "DELETE" });
  if (res.ok && editingHabitId === id) {
    exitEditMode();
  }
  await loadHabits();
}

frequencyTypeSelect.addEventListener("change", () => {
  weeklyDaysFieldset.hidden = frequencyTypeSelect.value !== "weekly";
});

categoryFilterSelect.addEventListener("change", () => {
  loadHabits();
});

formCancelButton.addEventListener("click", () => {
  exitEditMode();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.textContent = "";

  const payload = {
    name: nameInput.value,
    frequencyType: frequencyTypeSelect.value,
    weeklyDays: weeklyDaysFromForm(),
    category: categorySelect.value,
  };

  const res = editingHabitId
    ? await fetch(`/api/habits/${editingHabitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    : await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

  if (!res.ok) {
    const body = await res.json();
    formError.textContent = body.error ?? "処理に失敗しました";
    return;
  }

  exitEditMode();
  await loadHabits();
});

loadHabits();
