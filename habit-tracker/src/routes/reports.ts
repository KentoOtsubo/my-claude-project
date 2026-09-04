import { Router } from "express";
import { todayJst } from "../domain/clock.js";
import { calculateCategoryCompletionRate, calculateCompletionRate } from "../domain/completionRate.js";
import { determineGoalReviewStatus } from "../domain/goalReviewStatus.js";
import { calculateLongestStreak } from "../domain/longestStreak.js";
import { calculateCurrentStreak } from "../domain/streak.js";
import type { CheckInRepository } from "../repositories/checkinRepository.js";
import type { GoalRepository } from "../repositories/goalRepository.js";
import type { HabitRepository } from "../repositories/habitRepository.js";

const WEEKLY_WINDOW_DAYS = 7;
const MONTHLY_WINDOW_DAYS = 30;

export function createReportsRouter(
  habitRepository: HabitRepository,
  checkinRepository: CheckInRepository,
  goalRepository: GoalRepository,
): Router {
  const router = Router();

  router.get("/dashboard", (_req, res) => {
    const today = todayJst();

    const habitsWithCheckins = habitRepository.findAll().map((habit) => ({
      habit,
      checkinDates: checkinRepository.findByHabitId(habit.id).map((c) => c.date),
    }));

    const habits = habitsWithCheckins.map(({ habit, checkinDates }) => ({
      habitId: habit.id,
      name: habit.name,
      category: habit.category,
      currentStreak: calculateCurrentStreak(habit, checkinDates, today),
      longestStreak: calculateLongestStreak(habit, checkinDates, today),
      weekly: calculateCompletionRate(habit, checkinDates, today, WEEKLY_WINDOW_DAYS),
      monthly: calculateCompletionRate(habit, checkinDates, today, MONTHLY_WINDOW_DAYS),
    }));

    const categoryInputs = habitsWithCheckins.map(({ habit, checkinDates }) => ({
      ...habit,
      checkinDates,
    }));
    const weeklyCategories = calculateCategoryCompletionRate(
      categoryInputs,
      today,
      WEEKLY_WINDOW_DAYS,
    );
    const monthlyCategories = calculateCategoryCompletionRate(
      categoryInputs,
      today,
      MONTHLY_WINDOW_DAYS,
    );
    const categories = weeklyCategories.map((weekly) => {
      const monthly = monthlyCategories.find((m) => m.category === weekly.category);
      return {
        category: weekly.category,
        weekly: { targetDays: weekly.targetDays, actualDays: weekly.actualDays, percent: weekly.percent },
        monthly: monthly
          ? { targetDays: monthly.targetDays, actualDays: monthly.actualDays, percent: monthly.percent }
          : { targetDays: 0, actualDays: 0, percent: 0 },
      };
    });

    const goals = goalRepository.findAll().map((goal) => {
      const checkinDates = checkinRepository.findByHabitId(goal.habitId).map((c) => c.date);
      const review = determineGoalReviewStatus(goal, checkinDates, today);
      return {
        goalId: goal.id,
        habitId: goal.habitId,
        status: review.status,
        actualCount: review.actualCount,
        progressPercent: review.progressPercent,
      };
    });

    res.json({ habits, categories, goals });
  });

  return router;
}
