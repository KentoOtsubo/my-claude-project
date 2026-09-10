import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import type { DbClient } from "./testDb.js";

/** query()が常に失敗するダミーのDbClient（接続断・障害を模擬する）。 */
function createFailingDb(): DbClient {
  return {
    async query() {
      throw new Error("simulated connection failure");
    },
  };
}

describe("接続失敗時のエラーハンドリング (FR-005)", () => {
  it("DB接続が失敗する場合、プロセスをクラッシュさせず500とエラーメッセージを返す", async () => {
    const app = await createApp({ db: createFailingDb() });

    const res = await request(app)
      .post("/api/habits")
      .send({ name: "読書" });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it("一覧取得（GET）でもDB接続失敗時に500を返す", async () => {
    const app = await createApp({ db: createFailingDb() });

    const res = await request(app).get("/api/habits");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});
