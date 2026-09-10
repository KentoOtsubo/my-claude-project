import { Router } from "express";
import { GoalValidationError } from "../domain/goal.js";
import { calculateGoalProgress } from "../domain/goalProgress.js";
import type { CheckInRepository } from "../repositories/checkinRepository.js";
import type { GoalRepository } from "../repositories/goalRepository.js";
import type { HabitRepository } from "../repositories/habitRepository.js";

export function createGoalsRouter(
  habitRepository: HabitRepository,
  goalRepository: GoalRepository,
  checkinRepository: CheckInRepository,
): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const allGoals = await goalRepository.findAll();
    const goals = await Promise.all(
      allGoals.map(async (goal) => {
        const checkinDates = (await checkinRepository.findByHabitId(goal.habitId)).map(
          (c) => c.date,
        );
        return { ...goal, ...calculateGoalProgress(goal, checkinDates) };
      }),
    );
    res.json(goals);
  });

  router.post("/", async (req, res) => {
    const { habitId } = req.body ?? {};
    const habit = await habitRepository.findById(habitId);
    if (!habit) {
      res.status(404).json({ error: "指定された習慣が見つかりません" });
      return;
    }

    try {
      const goal = await goalRepository.create(habitId, req.body ?? {}, habit.createdAt);
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof GoalValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.put("/:id", async (req, res) => {
    const existing = await goalRepository.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "指定された目標が見つかりません" });
      return;
    }

    const habit = await habitRepository.findById(existing.habitId);
    if (!habit) {
      res.status(404).json({ error: "指定された習慣が見つかりません" });
      return;
    }

    try {
      const goal = await goalRepository.update(req.params.id, req.body ?? {}, habit.createdAt);
      res.json(goal);
    } catch (error) {
      if (error instanceof GoalValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.delete("/:id", async (req, res) => {
    const deleted = await goalRepository.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "指定された目標が見つかりません" });
      return;
    }
    res.status(204).send();
  });

  return router;
}
