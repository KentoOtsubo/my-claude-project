import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createTestDb, type DbClient } from "./testDb.js";

describe("GET /api/health", () => {
  let db: DbClient;

  beforeAll(async () => {
    db = await createTestDb();
  });

  it("returns status ok", async () => {
    const app = await createApp({ db });

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
