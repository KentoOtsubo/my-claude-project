import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type CloseableDbClient } from "./testDb.js";
import { HabitRepository } from "../../src/repositories/habitRepository.js";
import { CheckInRepository } from "../../src/repositories/checkinRepository.js";
import { todayJst } from "../../src/domain/clock.js";

describe("データ永続化 (006-persistent-storage)", () => {
  let dataDir: string;
  const openedDbs: CloseableDbClient[] = [];

  beforeEach(() => {
    dataDir = mkdtempSync(join(tmpdir(), "habit-tracker-persistence-"));
  });

  afterEach(async () => {
    // PGliteの内部的な非同期ファイル書き込みが完了してからディレクトリを
    // 削除しないと、書き込み中のファイルが消えてErrnoErrorが非同期に発生する
    // ことがあるため、必ずclose()してからrmSyncする。
    await Promise.all(openedDbs.map((db) => db.close()));
    openedDbs.length = 0;
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("同じデータストアに再接続しても、登録済みの習慣・チェックインが残っている (US1, FR-001, FR-002)", async () => {
    // 1回目: プロセス起動を模擬し、習慣を登録・チェックインを記録する
    const firstDb = await createTestDb({ dataDir });
    const firstHabitRepository = new HabitRepository(firstDb);
    const firstCheckinRepository = new CheckInRepository(firstDb);

    const habit = await firstHabitRepository.create({ name: "読書" });
    const today = todayJst();
    await firstCheckinRepository.create(habit.id, {}, habit.createdAt, today);
    await firstDb.close();

    // 2回目: 同じディレクトリに対して別のDbClientインスタンスを生成し、
    // プロセス再起動を模擬する。
    const secondDb = await createTestDb({ dataDir });
    openedDbs.push(secondDb);
    const secondHabitRepository = new HabitRepository(secondDb);
    const secondCheckinRepository = new CheckInRepository(secondDb);

    const habits = await secondHabitRepository.findAll();
    expect(habits).toHaveLength(1);
    expect(habits[0]).toMatchObject({ id: habit.id, name: "読書" });

    const checkins = await secondCheckinRepository.findByHabitId(habit.id);
    expect(checkins).toHaveLength(1);
    expect(checkins[0]).toMatchObject({ date: today });
  });

  it("異なるデータストアに接続した場合、互いのデータが見えない (US2, FR-004)", async () => {
    const devDir = mkdtempSync(join(tmpdir(), "habit-tracker-dev-"));
    const prodDir = mkdtempSync(join(tmpdir(), "habit-tracker-prod-"));

    try {
      const devDb = await createTestDb({ dataDir: devDir });
      const prodDb = await createTestDb({ dataDir: prodDir });

      try {
        const devHabitRepository = new HabitRepository(devDb);
        const prodHabitRepository = new HabitRepository(prodDb);

        await devHabitRepository.create({ name: "開発環境の習慣" });

        const devHabits = await devHabitRepository.findAll();
        const prodHabits = await prodHabitRepository.findAll();

        expect(devHabits).toHaveLength(1);
        expect(prodHabits).toHaveLength(0);
      } finally {
        await devDb.close();
        await prodDb.close();
      }
    } finally {
      rmSync(devDir, { recursive: true, force: true });
      rmSync(prodDir, { recursive: true, force: true });
    }
  });
});
