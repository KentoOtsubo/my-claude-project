import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import type { ErrorRequestHandler } from "express";
import "express-async-errors";
import { createDatabase, type DbClient } from "./repositories/db.js";
import { CheckInRepository } from "./repositories/checkinRepository.js";
import { GoalRepository } from "./repositories/goalRepository.js";
import { HabitRepository } from "./repositories/habitRepository.js";
import { createCheckinsRouter } from "./routes/checkins.js";
import { createGoalsRouter } from "./routes/goals.js";
import { createHabitsRouter } from "./routes/habits.js";
import { createRemindersRouter } from "./routes/reminders.js";
import { createReportsRouter } from "./routes/reports.js";

export interface CreateAppOptions {
  /** 本番・開発用の接続文字列（server.tsが`process.env.DATABASE_URL`を渡す）。 */
  connectionString?: string;
  /** テスト用のDbClient直接注入（PGliteベースの`createTestDb()`等から渡す）。 */
  db?: DbClient;
}

// `express.static("public")`のような相対パス文字列は`process.cwd()`基準で解決
// されるため、サーバーレス環境（Vercel等）でカレントディレクトリが想定と異なると
// 見つからなくなる。このモジュール自身の場所を基準にした絶対パスにすることで
// 実行環境に依存せず解決できるようにする。
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public");

export async function createApp(options: CreateAppOptions = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static(publicDir));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const db = options.db ?? (await createDatabase(options.connectionString));
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

  // ドメイン層のバリデーションエラーは各ルートで個別にcatch済み。ここでは、
  // DB接続失敗等の未捕捉エラーを中途半端な状態のまま応答させず、分かりやすい
  // エラーメッセージとともに500を返す（express-async-errorsにより非同期
  // ハンドラの例外もここに転送される、FR-005）。
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "予期しないエラーが発生しました" });
  };
  app.use(errorHandler);

  return app;
}

// Vercel等のサーバーレス環境がこのモジュールを直接呼び出す場合のためのデフォルト
// export（Node.jsランタイムは default export が関数または http.Server である
// ことを要求する）。`createApp()`は非同期のためExpressアプリを直接exportできず、
// 初回リクエスト時に遅延生成・キャッシュして委譲する薄いハンドラをexportする。
// `createApp()`（名前付きexport）は`server.ts`・テストからの明示的なオプション
// 付き呼び出しに引き続き使用する。
let cachedApp: ReturnType<typeof createApp> | undefined;

export default async function handler(
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse,
): Promise<void> {
  cachedApp ??= createApp({ connectionString: process.env.DATABASE_URL });
  const app = await cachedApp;
  app(req, res);
}
