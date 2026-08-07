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

function renderHabitList(habits) {
  listElement.innerHTML = "";
  listEmptyElement.hidden = habits.length > 0;

  for (const habit of habits) {
    const item = document.createElement("li");
    item.dataset.habitId = habit.id;

    const label = document.createElement("span");
    label.textContent = formatHabit(habit);
    item.appendChild(label);

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

    listElement.appendChild(item);
  }
}

async function loadHabits() {
  const category = categoryFilterSelect.value;
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(`/api/habits${query}`);
  const habits = await res.json();
  renderHabitList(habits);
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
