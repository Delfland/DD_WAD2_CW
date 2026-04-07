
// index.js
import express from "express";
import cookieParser from "cookie-parser";
import mustacheExpress from "mustache-express";
import path from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "./loadEnv.js";

loadEnv();

import viewRoutes from "./routes/views.js";
import authRoutes from "./routes/users.js";
import { attachAuthUser } from "./auth/auth.js";
import {
  initDb,
  usersDb,
  coursesDb,
  sessionsDb,
  bookingsDb,
} from "./models/_db.js";
import { runSeed } from "./seed/seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// View engine (Mustache)
app.engine(
  "mustache",
  mustacheExpress(path.join(__dirname, "views", "partials"), ".mustache")
);
app.set("view engine", "mustache");
app.set("views", path.join(__dirname, "views"));

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Static
app.use("/static", express.static(path.join(__dirname, "public")));

// Auth
app.use(attachAuthUser);
app.use("/", authRoutes);

// Health
app.get("/health", (req, res) => res.json({ ok: true }));

// SSR view routes
app.use("/", viewRoutes);

// Errors
export const not_found = (req, res) =>
  res.status(404).type("text/plain").send("404 Not found.");
export const server_error = (err, req, res, next) => {
  console.error(err);
  res.status(500).type("text/plain").send("Internal Server Error.");
};
app.use(not_found);
app.use(server_error);

// Only start the server outside tests
if (process.env.NODE_ENV !== "test") {
  await initDb();

  const shouldAutoSeed =
    process.env.NODE_ENV === "development" &&
    process.env.AUTO_SEED === "true";

  if (shouldAutoSeed) {
    const [users, courses, sessions, bookings] = await Promise.all([
      usersDb.count({}),
      coursesDb.count({}),
      sessionsDb.count({}),
      bookingsDb.count({}),
    ]);
    const isEmptyDb = users === 0 && courses === 0 && sessions === 0 && bookings === 0;

    if (isEmptyDb) {
      console.log("AUTO_SEED enabled and DB is empty. Running seed...");
      await runSeed();
    } else {
      console.log(
        "AUTO_SEED enabled but DB is not empty. Skipping auto-seed to avoid data loss."
      );
    }
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`Yoga booking running on http://localhost:${PORT}`)
  );
}
