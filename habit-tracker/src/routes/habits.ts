import { Router } from "express";
import { todayJst } from "../domain/clock.js";
import {
  HabitValidationError,
  normalizeCategoryFilter,
} from "../domain/habit.js";
import { calculateCurrentStreak } from "../domain/streak.js";
import type { CheckInRepository } from "../repositories/checkinRepository.js";
import type { HabitRepository } from "../repositories/habitRepository.js";

export function createHabitsRouter(
  repository: HabitRepository,
  checkinRepository: CheckInRepository,
): Router {
  const router = Router();

  router.get("/", async (req, res) => {
    try {
      const category = normalizeCategoryFilter(req.query.category);
      const today = todayJst();
      const allHabits = await repository.findAll(category);
      const habits = await Promise.all(
        allHabits.map(async (habit) => ({
          ...habit,
          currentStreak: calculateCurrentStreak(
            habit,
            (await checkinRepository.findByHabitId(habit.id)).map((c) => c.date),
            today,
          ),
        })),
      );
      res.json(habits);
    } catch (error) {
      if (error instanceof HabitValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.post("/", async (req, res) => {
    try {
      const habit = await repository.create(req.body ?? {});
      res.status(201).json(habit);
    } catch (error) {
      if (error instanceof HabitValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.put("/:id", async (req, res) => {
    try {
      const habit = await repository.update(req.params.id, req.body ?? {});
      if (!habit) {
        res.status(404).json({ error: "指定された習慣が見つかりません" });
        return;
      }
      res.json(habit);
    } catch (error) {
      if (error instanceof HabitValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.delete("/:id", async (req, res) => {
    const deleted = await repository.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "指定された習慣が見つかりません" });
      return;
    }
    res.status(204).send();
  });

  return router;
}
