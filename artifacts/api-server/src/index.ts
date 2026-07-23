import app from "./app";
import { logger } from "./lib/logger";

// Use API_PORT for the backend so it runs on a fixed internal port alongside
// the Vite dev server (which owns PORT). Falls back to 3001.
const rawPort = process.env["API_PORT"] ?? process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "Neither API_PORT nor PORT environment variable is set.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid port value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
