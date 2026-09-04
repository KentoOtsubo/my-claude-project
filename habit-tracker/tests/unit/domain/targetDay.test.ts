import { describe, expect, it } from "vitest";
import {
  isTargetDay,
  nextDate,
  previousDate,
  toDateOnly,
} from "../../../src/domain/targetDay.js";

const DAILY = { frequencyType: "daily" as const, weeklyDays: [] as number[] };
const WEEKLY_MWF = {
  frequencyType: "weekly" as const,
  weeklyDays: [1, 3, 5], // 月・水・金
};

describe("isTargetDay", () => {
  it("頻度「毎日」の場合はどの曜日でも対象日である", () => {
    expect(isTargetDay(DAILY, "2026-01-12")).toBe(true); // 月
    expect(isTargetDay(DAILY, "2026-01-13")).toBe(true); // 火
  });

  it("頻度「毎週」の場合は指定曜日のみ対象日である", () => {
    expect(isTargetDay(WEEKLY_MWF, "2026-01-12")).toBe(true); // 月
    expect(isTargetDay(WEEKLY_MWF, "2026-01-13")).toBe(false); // 火
    expect(isTargetDay(WEEKLY_MWF, "2026-01-14")).toBe(true); // 水
  });
});

describe("previousDate / nextDate", () => {
  it("前日の日付文字列を返す", () => {
    expect(previousDate("2026-01-02")).toBe("2026-01-01");
  });

  it("月をまたぐ場合も正しく前日を返す", () => {
    expect(previousDate("2026-02-01")).toBe("2026-01-31");
  });

  it("翌日の日付文字列を返す", () => {
    expect(nextDate("2026-01-01")).toBe("2026-01-02");
  });

  it("月をまたぐ場合も正しく翌日を返す", () => {
    expect(nextDate("2026-01-31")).toBe("2026-02-01");
  });
});

describe("toDateOnly", () => {
  it("ISO 8601の日時文字列から日付部分のみを取り出す", () => {
    expect(toDateOnly("2026-01-01T09:30:00.000Z")).toBe("2026-01-01");
  });
});
