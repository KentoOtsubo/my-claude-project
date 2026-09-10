import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // 006-persistent-storage: tests/integration/persistence.test.tsはPGliteの
    // ディレクトリ永続化モード（実ファイルI/O）を使う。ファイル単位の並列実行
    // （複数ワーカーが同時にファイルI/Oを行う）と組み合わさると、まれに
    // PGlite内部の非同期ファイル書き込みでErrnoErrorが発生することを確認したため、
    // テストファイルは直列実行する。
    fileParallelism: false,
  },
});
