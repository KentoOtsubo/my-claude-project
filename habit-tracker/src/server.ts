import { createApp } from "./app.js";

const port = process.env.PORT ?? 3000;
const app = await createApp({ connectionString: process.env.DATABASE_URL });

app.listen(port, () => {
  console.log(`habit-tracker server listening on port ${port}`);
});
