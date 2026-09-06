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
const reminderEnabledCheckbox = document.getElementById("habit-reminder-enabled");
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
  reminderEnabledCheckbox.checked = habit.reminderEnabled;
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

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// サーバー側（src/domain/clock.ts）と同じ方式で、ブラウザのタイムゾーン設定に
// 依存せず日本時間（JST, UTC+9）の日付を固定オフセット計算で求める。
function todayString() {
  return new Date(Date.now() + JST_OFFSET_MS).toISOString().slice(0, 10);
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
  await loadGoals();
  await loadDashboard();
  await loadReminders();
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
  await loadGoals();
  await loadDashboard();
  await loadReminders();
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
  await loadGoals();
  await loadDashboard();
  await loadReminders();
}

const goalForm = document.getElementById("goal-form");
const goalHabitSelect = document.getElementById("goal-habit");
const goalStartDateInput = document.getElementById("goal-start-date");
const goalEndDateInput = document.getElementById("goal-end-date");
const goalTargetCountInput = document.getElementById("goal-target-count");
const goalFormSubmitButton = document.getElementById("goal-form-submit");
const goalFormCancelButton = document.getElementById("goal-form-cancel");
const goalFormError = document.getElementById("goal-form-error");
const goalListElement = document.getElementById("goal-list");
const goalListEmptyElement = document.getElementById("goal-list-empty");

let habitsById = new Map();
let editingGoalId = null;

function formatGoalPeriod(goal) {
  return `${goal.startDate} 〜 ${goal.endDate}`;
}

function renderGoalList(goals) {
  goalListElement.innerHTML = "";
  goalListEmptyElement.hidden = goals.length > 0;

  for (const goal of goals) {
    const item = document.createElement("li");
    item.dataset.goalId = goal.id;

    const habitName = habitsById.get(goal.habitId)?.name ?? "(不明な習慣)";
    const label = document.createElement("span");
    label.textContent = `${habitName}: ${formatGoalPeriod(goal)} / 目標${goal.targetCount}回`;
    item.appendChild(label);

    const progressLabel = document.createElement("span");
    progressLabel.textContent = goal.achieved
      ? `🎉 達成（${goal.actualCount}/${goal.targetCount}回・${goal.progressPercent}%）`
      : `進捗 ${goal.progressPercent}%（${goal.actualCount}/${goal.targetCount}回）`;
    item.appendChild(progressLabel);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "編集";
    editButton.addEventListener("click", () => enterGoalEditMode(goal));
    item.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => deleteGoal(goal.id));
    item.appendChild(deleteButton);

    goalListElement.appendChild(item);
  }
}

function enterGoalEditMode(goal) {
  editingGoalId = goal.id;
  goalHabitSelect.value = goal.habitId;
  goalHabitSelect.disabled = true;
  goalStartDateInput.value = goal.startDate;
  goalEndDateInput.value = goal.endDate;
  goalTargetCountInput.value = String(goal.targetCount);
  goalFormSubmitButton.textContent = "更新";
  goalFormCancelButton.hidden = false;
  goalFormError.textContent = "";
}

function exitGoalEditMode() {
  editingGoalId = null;
  goalForm.reset();
  goalHabitSelect.disabled = false;
  goalFormSubmitButton.textContent = "設定";
  goalFormCancelButton.hidden = true;
}

async function deleteGoal(id) {
  const confirmed = window.confirm("この目標を削除しますか？（元に戻せません）");
  if (!confirmed) {
    return;
  }

  await fetch(`/api/goals/${id}`, { method: "DELETE" });
  if (editingGoalId === id) {
    exitGoalEditMode();
  }
  await loadGoals();
  await loadDashboard();
}

async function populateGoalHabitSelect() {
  const res = await fetch("/api/habits");
  const habits = await res.json();
  habitsById = new Map(habits.map((habit) => [habit.id, habit]));

  const selected = goalHabitSelect.value;
  goalHabitSelect.innerHTML = "";
  for (const habit of habits) {
    const option = document.createElement("option");
    option.value = habit.id;
    option.textContent = habit.name;
    goalHabitSelect.appendChild(option);
  }
  if (habits.some((habit) => habit.id === selected)) {
    goalHabitSelect.value = selected;
  }
}

async function loadGoals() {
  await populateGoalHabitSelect();
  const res = await fetch("/api/goals");
  const goals = await res.json();
  renderGoalList(goals);
}

goalFormCancelButton.addEventListener("click", () => {
  exitGoalEditMode();
});

goalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  goalFormError.textContent = "";

  const payload = {
    habitId: goalHabitSelect.value,
    startDate: goalStartDateInput.value,
    endDate: goalEndDateInput.value,
    targetCount: Number(goalTargetCountInput.value),
  };

  const res = editingGoalId
    ? await fetch(`/api/goals/${editingGoalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    : await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

  if (!res.ok) {
    const body = await res.json();
    goalFormError.textContent = body.error ?? "処理に失敗しました";
    return;
  }

  exitGoalEditMode();
  await loadGoals();
  await loadDashboard();
});

const dashboardEmptyElement = document.getElementById("dashboard-empty");
const dashboardHabitListElement = document.getElementById("dashboard-habit-list");
const dashboardCategoryListElement = document.getElementById("dashboard-category-list");
const dashboardGoalListElement = document.getElementById("dashboard-goal-list");

const GOAL_STATUS_LABELS = {
  in_progress: "進行中",
  achieved: "達成",
  not_achieved: "未達成",
};

function renderDashboardHabits(habits) {
  dashboardHabitListElement.innerHTML = "";
  for (const habit of habits) {
    const item = document.createElement("li");
    item.textContent =
      `${habit.name}（${CATEGORY_LABELS[habit.category]}）: ` +
      `今週の実施率 ${habit.weekly.actualDays}/${habit.weekly.targetDays}日（${habit.weekly.percent}%）, ` +
      `今月の実施率 ${habit.monthly.actualDays}/${habit.monthly.targetDays}日（${habit.monthly.percent}%）, ` +
      `🔥現在${habit.currentStreak}日 / 最長${habit.longestStreak}日`;
    dashboardHabitListElement.appendChild(item);
  }
}

function renderDashboardCategories(categories) {
  dashboardCategoryListElement.innerHTML = "";
  for (const category of categories) {
    const item = document.createElement("li");
    item.textContent =
      `${CATEGORY_LABELS[category.category]}: ` +
      `今週の実施率 ${category.weekly.percent}%, 今月の実施率 ${category.monthly.percent}%`;
    dashboardCategoryListElement.appendChild(item);
  }
}

function renderDashboardGoals(goals) {
  dashboardGoalListElement.innerHTML = "";
  for (const goal of goals) {
    const item = document.createElement("li");
    const habitName = habitsById.get(goal.habitId)?.name ?? "(不明な習慣)";
    item.textContent =
      `${habitName}: ${GOAL_STATUS_LABELS[goal.status]}` +
      (goal.status === "in_progress" ? `（進捗 ${goal.progressPercent}%）` : "");
    dashboardGoalListElement.appendChild(item);
  }
}

async function loadDashboard() {
  const res = await fetch("/api/reports/dashboard");
  const dashboard = await res.json();

  dashboardEmptyElement.hidden =
    dashboard.habits.length > 0 || dashboard.goals.length > 0;

  renderDashboardHabits(dashboard.habits);
  renderDashboardCategories(dashboard.categories);
  renderDashboardGoals(dashboard.goals);
}

const reminderListElement = document.getElementById("reminder-list");
const reminderListEmptyElement = document.getElementById("reminder-list-empty");

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
    checkInButton.addEventListener("click", () => checkInHabit(reminder.id));
    item.appendChild(checkInButton);

    reminderListElement.appendChild(item);
  }
}

async function loadReminders() {
  const res = await fetch("/api/reminders");
  const reminders = await res.json();
  renderReminderList(reminders);
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
    reminderEnabled: reminderEnabledCheckbox.checked,
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
  await loadGoals();
  await loadDashboard();
  await loadReminders();
});

loadHabits();
loadGoals();
loadDashboard();
loadReminders();
