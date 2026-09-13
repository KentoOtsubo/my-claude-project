import { fetchDashboard, fetchHabits } from "../api.js";
import { CATEGORY_LABELS } from "../format.js";

const dashboardEmptyElement = document.getElementById("dashboard-empty");
const dashboardHabitListElement = document.getElementById("dashboard-habit-list");
const dashboardCategoryListElement = document.getElementById(
  "dashboard-category-list",
);
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

function renderDashboardGoals(goals, habitsById) {
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

// refreshHomeView()と同様、複数回の呼び出しが重なった際に古い結果で
// 上書きしないよう、最新の呼び出しのみ描画を反映する。
let latestRefreshToken = 0;

export async function refreshDashboardView() {
  const token = ++latestRefreshToken;
  const habits = await fetchHabits();
  if (token !== latestRefreshToken) return;
  const habitsById = new Map(habits.map((habit) => [habit.id, habit]));

  const dashboard = await fetchDashboard();
  if (token !== latestRefreshToken) return;

  dashboardEmptyElement.hidden =
    dashboard.habits.length > 0 || dashboard.goals.length > 0;

  renderDashboardHabits(dashboard.habits);
  renderDashboardCategories(dashboard.categories);
  renderDashboardGoals(dashboard.goals, habitsById);
}
