import { fetchHabits, createGoal, updateGoal } from "../api.js";
import { showView } from "../app.js";

const form = document.getElementById("goal-form");
const heading = document.getElementById("goal-form-heading");
const goalHabitSelect = document.getElementById("goal-habit");
const goalStartDateInput = document.getElementById("goal-start-date");
const goalEndDateInput = document.getElementById("goal-end-date");
const goalTargetCountInput = document.getElementById("goal-target-count");
const goalFormSubmitButton = document.getElementById("goal-form-submit");
const goalFormCancelButton = document.getElementById("goal-form-cancel");
const goalFormError = document.getElementById("goal-form-error");

let editingGoalId = null;

async function populateGoalHabitSelect(selectedHabitId) {
  const habits = await fetchHabits();
  goalHabitSelect.innerHTML = "";
  for (const habit of habits) {
    const option = document.createElement("option");
    option.value = habit.id;
    option.textContent = habit.name;
    goalHabitSelect.appendChild(option);
  }
  if (selectedHabitId && habits.some((habit) => habit.id === selectedHabitId)) {
    goalHabitSelect.value = selectedHabitId;
  }
}

// 新規モード（goal省略）または編集モード（goal指定）で目標登録・編集画面を開く。
export async function openGoalForm(mode, goal) {
  goalFormError.textContent = "";
  await populateGoalHabitSelect(goal?.habitId);

  if (mode === "edit") {
    editingGoalId = goal.id;
    goalHabitSelect.value = goal.habitId;
    goalHabitSelect.disabled = true;
    goalStartDateInput.value = goal.startDate;
    goalEndDateInput.value = goal.endDate;
    goalTargetCountInput.value = String(goal.targetCount);
    goalFormSubmitButton.textContent = "更新";
    heading.textContent = "目標を編集";
  } else {
    editingGoalId = null;
    form.reset();
    goalHabitSelect.disabled = false;
    goalFormSubmitButton.textContent = "設定";
    heading.textContent = "目標を設定";
  }

  showView("goal-form");
}

export function initGoalFormView() {
  goalFormCancelButton.addEventListener("click", () => {
    // タブメニューによる離脱と同様、入力内容を破棄して一覧へ戻る（spec.md FR-011）。
    showView("goal-list");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    goalFormError.textContent = "";

    const payload = {
      habitId: goalHabitSelect.value,
      startDate: goalStartDateInput.value,
      endDate: goalEndDateInput.value,
      targetCount: Number(goalTargetCountInput.value),
    };

    const { ok, body } = editingGoalId
      ? await updateGoal(editingGoalId, payload)
      : await createGoal(payload);

    if (!ok) {
      goalFormError.textContent = body.error ?? "処理に失敗しました";
      return;
    }

    // showView("goal-list")が一覧の再読み込みも行う（app.jsのshowView実装参照）。
    showView("goal-list");
  });
}
