import { createHabit, updateHabit } from "../api.js";
import { showView } from "../app.js";

const form = document.getElementById("habit-form");
const heading = document.getElementById("habit-form-heading");
const nameInput = document.getElementById("habit-name");
const frequencyTypeSelect = document.getElementById("habit-frequency-type");
const weeklyDaysFieldset = document.getElementById("habit-weekly-days");
const categorySelect = document.getElementById("habit-category");
const reminderEnabledCheckbox = document.getElementById("habit-reminder-enabled");
const formError = document.getElementById("habit-form-error");
const formSubmitButton = document.getElementById("habit-form-submit");
const formCancelButton = document.getElementById("habit-form-cancel");

let editingHabitId = null;

function weeklyDaysFromForm() {
  return Array.from(
    weeklyDaysFieldset.querySelectorAll("input[type=checkbox]:checked"),
  ).map((checkbox) => Number(checkbox.value));
}

function setWeeklyDaysInForm(days) {
  const checkboxes = weeklyDaysFieldset.querySelectorAll("input[type=checkbox]");
  for (const checkbox of checkboxes) {
    checkbox.checked = days.includes(Number(checkbox.value));
  }
}

// 新規モード（habit省略）または編集モード（habit指定）で習慣登録・編集画面を開く。
export function openHabitForm(mode, habit) {
  formError.textContent = "";

  if (mode === "edit") {
    editingHabitId = habit.id;
    nameInput.value = habit.name;
    frequencyTypeSelect.value = habit.frequencyType;
    weeklyDaysFieldset.hidden = habit.frequencyType !== "weekly";
    setWeeklyDaysInForm(habit.weeklyDays);
    categorySelect.value = habit.category;
    reminderEnabledCheckbox.checked = habit.reminderEnabled;
    formSubmitButton.textContent = "更新";
    heading.textContent = "習慣を編集";
  } else {
    editingHabitId = null;
    form.reset();
    weeklyDaysFieldset.hidden = true;
    formSubmitButton.textContent = "登録";
    heading.textContent = "習慣を登録";
  }

  showView("habit-form");
}

export function initHabitFormView() {
  frequencyTypeSelect.addEventListener("change", () => {
    weeklyDaysFieldset.hidden = frequencyTypeSelect.value !== "weekly";
  });

  formCancelButton.addEventListener("click", () => {
    // タブメニューによる離脱と同様、入力内容を破棄して一覧へ戻る（spec.md FR-006）。
    showView("habit-list");
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

    const { ok, body } = editingHabitId
      ? await updateHabit(editingHabitId, payload)
      : await createHabit(payload);

    if (!ok) {
      formError.textContent = body.error ?? "処理に失敗しました";
      return;
    }

    // showView("habit-list")が一覧の再読み込みも行う（app.jsのshowView実装参照）。
    showView("habit-list");
  });
}
