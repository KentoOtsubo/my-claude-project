import { initHomeView, refreshHomeView } from "./views/home.js";
import { initHabitListView, refreshHabitListView } from "./views/habitList.js";
import { initHabitFormView } from "./views/habitForm.js";
import { initGoalListView, refreshGoalListView } from "./views/goalList.js";
import { initGoalFormView } from "./views/goalForm.js";
import { refreshDashboardView } from "./views/dashboard.js";

const VIEW_IDS = [
  "home",
  "habit-list",
  "habit-form",
  "goal-list",
  "goal-form",
  "dashboard",
];

// 画面（View）の排他表示切り替え。タブ4画面（home/habit-list/goal-list/
// dashboard）はアクティブになるたび最新データを再取得して描画する
// （research.md「3.」参照）。habit-form/goal-formはhabitForm.js/goalForm.js側の
// openHabitForm()/openGoalForm()が個別に初期化してから呼び出す。
// habit-form/goal-formはタブメニューに存在しないため、表示中は元になった
// 一覧タブ（habit-list/goal-list）をアクティブ表示のまま維持する。
const TAB_FOR_VIEW = {
  home: "home",
  "habit-list": "habit-list",
  "habit-form": "habit-list",
  "goal-list": "goal-list",
  "goal-form": "goal-list",
  dashboard: "dashboard",
};

export function showView(name) {
  for (const id of VIEW_IDS) {
    document.getElementById(`view-${id}`).hidden = id !== name;
  }
  for (const button of document.querySelectorAll(".tab-button")) {
    button.classList.toggle(
      "is-active",
      button.dataset.view === TAB_FOR_VIEW[name],
    );
  }
  if (name === "home") refreshHomeView();
  if (name === "habit-list") refreshHabitListView();
  if (name === "goal-list") refreshGoalListView();
  if (name === "dashboard") refreshDashboardView();
}

for (const button of document.querySelectorAll(".tab-button")) {
  button.addEventListener("click", () => showView(button.dataset.view));
}

initHomeView();
initHabitListView();
initHabitFormView();
initGoalListView();
initGoalFormView();

showView("home");
