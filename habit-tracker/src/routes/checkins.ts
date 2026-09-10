import { Router } from "express";
import { todayJst } from "../domain/clock.js";
import { CheckInValidationError } from "../domain/checkin.js";
import type { CheckInRepository } from "../repositories/checkinRepository.js";
import type { HabitRepository } from "../repositories/habitRepository.js";

export function createCheckinsRouter(
  habitRepository: HabitRepository,
  checkinRepository: CheckInRepository,
): Router {
  const router = Router({ mergeParams: true });

  router.get<{ habitId: string }>("/", async (req, res) => {
    const habit = await habitRepository.findById(req.params.habitId);
    if (!habit) {
      res.status(404).json({ error: "指定された習慣が見つかりません" });
      return;
    }

    res.json(await checkinRepository.findByHabitId(habit.id));
  });

  router.post<{ habitId: string }>("/", async (req, res) => {
    const habit = await habitRepository.findById(req.params.habitId);
    if (!habit) {
      res.status(404).json({ error: "指定された習慣が見つかりません" });
      return;
    }

    try {
      const checkIn = await checkinRepository.create(
        habit.id,
        req.body ?? {},
        habit.createdAt,
        todayJst(),
      );
      res.status(201).json(checkIn);
    } catch (error) {
      if (error instanceof CheckInValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.delete<{ habitId: string; checkinId: string }>("/:checkinId", async (req, res) => {
    const habit = await habitRepository.findById(req.params.habitId);
    if (!habit) {
      res.status(404).json({ error: "指定された習慣が見つかりません" });
      return;
    }

    const deleted = await checkinRepository.delete(habit.id, req.params.checkinId);
    if (!deleted) {
      res.status(404).json({ error: "指定されたチェックインが見つかりません" });
      return;
    }
    res.status(204).send();
  });

  return router;
}
