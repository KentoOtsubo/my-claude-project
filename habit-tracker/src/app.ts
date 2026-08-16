import express from "express";
import { createDatabase } from "./repositories/db.js";
import { CheckInRepository } from "./repositories/checkinRepository.js";
import { HabitRepository } from "./repositories/habitRepository.js";
import { createCheckinsRouter } from "./routes/checkins.js";
import { createHabitsRouter } from "./routes/habits.js";

export interface CreateAppOptions {
  dbPath?: string;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static("public"));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const db = createDatabase(options.dbPath ?? ":memory:");
  const habitRepository = new HabitRepository(db);
  const checkinRepository = new CheckInRepository(db);
  app.use("/api/habits", createHabitsRouter(habitRepository, checkinRepository));
  app.use(
    "/api/habits/:habitId/checkins",
    createCheckinsRouter(habitRepository, checkinRepository),
  );

  return app;
}
