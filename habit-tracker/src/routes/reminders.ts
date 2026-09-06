import { Router } from "express";
import { todayJst } from "../domain/clock.js";
import { calculateReminderList } from "../domain/reminder.js";
import type { CheckInRepository } from "../repositories/checkinRepository.js";
import type { HabitRepository } from "../repositories/habitRepository.js";

export function createRemindersRouter(
  habitRepository: HabitRepository,
  checkinRepository: CheckInRepository,
): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const today = todayJst();

    const habits = habitRepository.findAll().map((habit) => ({
      ...habit,
      checkinDates: checkinRepository.findByHabitId(habit.id).map((c) => c.date),
    }));

    res.json(calculateReminderList(habits, today));
  });

  return router;
}
