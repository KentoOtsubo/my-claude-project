import express from "express";
import { createDatabase } from "./repositories/db.js";
import { CheckInRepository } from "./repositories/checkinRepository.js";
import { GoalRepository } from "./repositories/goalRepository.js";
import { HabitRepository } from "./repositories/habitRepository.js";
import { createCheckinsRouter } from "./routes/checkins.js";
import { createGoalsRouter } from "./routes/goals.js";
import { createHabitsRouter } from "./routes/habits.js";
import { createRemindersRouter } from "./routes/reminders.js";
import { createReportsRouter } from "./routes/reports.js";

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
  const goalRepository = new GoalRepository(db);
  app.use("/api/habits", createHabitsRouter(habitRepository, checkinRepository));
  app.use(
    "/api/habits/:habitId/checkins",
    createCheckinsRouter(habitRepository, checkinRepository),
  );
  app.use(
    "/api/goals",
    createGoalsRouter(habitRepository, goalRepository, checkinRepository),
  );
  app.use(
    "/api/reports",
    createReportsRouter(habitRepository, checkinRepository, goalRepository),
  );
  app.use(
    "/api/reminders",
    createRemindersRouter(habitRepository, checkinRepository),
  );

  return app;
}

// Vercel等のサーバーレス環境がこのモジュールを直接呼び出す場合のためのデフォルト
// export（Node.jsランタイムは default export が関数または http.Server である
// ことを要求する）。Expressアプリのインスタンス自体は (req, res) => void として
// 呼び出し可能なため、これで要件を満たす。`createApp()`（名前付きexport）は
// server.ts・テストからの明示的なDBパス指定付き呼び出しに引き続き使用する。
export default createApp();
