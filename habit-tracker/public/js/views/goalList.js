import { fetchHabits, fetchGoals, deleteGoal } from "../api.js";
import { formatGoalPeriod } from "../format.js";
import { openGoalForm } from "./goalForm.js";

const goalListElement = document.getElementById("goal-list");
const goalListEmptyElement = document.getElementById("goal-list-empty");
const newButton = document.getElementById("goal-list-new-button");

function renderGoalList(goals, habitsById) {
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
    editButton.addEventListener("click", () => openGoalForm("edit", goal));
    item.appendChild(editButton);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => deleteGoalFromList(goal.id));
    item.appendChild(deleteButton);

    goalListElement.appendChild(item);
  }
}

async function deleteGoalFromList(id) {
  const confirmed = window.confirm("この目標を削除しますか？（元に戻せません）");
  if (!confirmed) {
    return;
  }

  await deleteGoal(id);
  await refreshGoalListView();
}

export function initGoalListView() {
  newButton.addEventListener("click", () => openGoalForm("new"));
}

// refreshHomeView()と同様、複数回の呼び出しが重なった際に古い結果で
// 上書きしないよう、最新の呼び出しのみ描画を反映する。
let latestRefreshToken = 0;

export async function refreshGoalListView() {
  const token = ++latestRefreshToken;
  const habits = await fetchHabits();
  if (token !== latestRefreshToken) return;
  const habitsById = new Map(habits.map((habit) => [habit.id, habit]));

  const goals = await fetchGoals();
  if (token !== latestRefreshToken) return;
  renderGoalList(goals, habitsById);
}
