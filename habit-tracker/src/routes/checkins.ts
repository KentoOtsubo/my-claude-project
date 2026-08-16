import { Router } from "express";
import { CheckInValidationError } from "../domain/checkin.js";
import type { CheckInRepository } from "../repositories/checkinRepository.js";
import type { HabitRepository } from "../repositories/habitRepository.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createCheckinsRouter(
  habitRepository: HabitRepository,
  checkinRepository: CheckInRepository,
): Router {
  const router = Router({ mergeParams: true });

  router.get<{ habitId: string }>("/", (req, res) => {
    const habit = habitRepository.findById(req.params.habitId);
    if (!habit) {
      res.status(404).json({ error: "habit not found" });
      return;
    }

    res.json(checkinRepository.findByHabitId(habit.id));
  });

  router.post<{ habitId: string }>("/", (req, res) => {
    const habit = habitRepository.findById(req.params.habitId);
    if (!habit) {
      res.status(404).json({ error: "habit not found" });
      return;
    }

    try {
      const checkIn = checkinRepository.create(
        habit.id,
        req.body ?? {},
        habit.createdAt,
        today(),
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

  router.delete<{ habitId: string; checkinId: string }>("/:checkinId", (req, res) => {
    const habit = habitRepository.findById(req.params.habitId);
    if (!habit) {
      res.status(404).json({ error: "habit not found" });
      return;
    }

    const deleted = checkinRepository.delete(habit.id, req.params.checkinId);
    if (!deleted) {
      res.status(404).json({ error: "check-in not found" });
      return;
    }
    res.status(204).send();
  });

  return router;
}
