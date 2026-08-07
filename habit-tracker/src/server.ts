import { createApp } from "./app.js";

const port = process.env.PORT ?? 3000;
const app = createApp({ dbPath: process.env.HABIT_DB_PATH ?? "data/habits.db" });

app.listen(port, () => {
  console.log(`habit-tracker server listening on port ${port}`);
});
