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

  router.get("/", async (_req, res) => {
    const today = todayJst();

    const allHabits = await habitRepository.findAll();
    const habits = await Promise.all(
      allHabits.map(async (habit) => ({
        ...habit,
        checkinDates: (await checkinRepository.findByHabitId(habit.id)).map((c) => c.date),
      })),
    );

    res.json(calculateReminderList(habits, today));
  });

  return router;
}
