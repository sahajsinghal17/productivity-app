import dotenv from "dotenv";

dotenv.config();

import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

const PORT = Number(process.env.PORT) || 4000;

async function startServer(): Promise<void> {
  await connectDatabase();

  const server = app.listen(PORT, () => {
    console.log(`Productivity App API running at http://localhost:${PORT}`);
  });

  async function shutdown(): Promise<void> {
    console.log("Shutting down server...");

    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error: unknown) => {
  console.error("Failed to start the server:", error);
  process.exit(1);
});