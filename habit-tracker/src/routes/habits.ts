import { Router } from "express";
import {
  HabitValidationError,
  normalizeCategoryFilter,
} from "../domain/habit.js";
import type { HabitRepository } from "../repositories/habitRepository.js";

export function createHabitsRouter(repository: HabitRepository): Router {
  const router = Router();

  router.get("/", (req, res) => {
    try {
      const category = normalizeCategoryFilter(req.query.category);
      res.json(repository.findAll(category));
    } catch (error) {
      if (error instanceof HabitValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.post("/", (req, res) => {
    try {
      const habit = repository.create(req.body ?? {});
      res.status(201).json(habit);
    } catch (error) {
      if (error instanceof HabitValidationError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  });

  router.put("/:id", (req, res) => {
    try {
      const habit = repository.update(req.params.id, req.body ?? {});
      if (!habit) {
        res.status(404).json({ error: "habit not found" });
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

  router.delete("/:id", (req, res) => {
    const deleted = repository.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "habit not found" });
      return;
    }
    res.status(204).send();
  });

  return router;
}
