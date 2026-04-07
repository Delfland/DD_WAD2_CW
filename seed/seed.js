// seed/seed.js
import {
  initDb,
  usersDb,
  coursesDb,
  sessionsDb,
  bookingsDb,
} from "../models/_db.js";
import { pathToFileURL } from "url";
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { UserModel } from "../models/userModel.js";
import { bookCourseForUser, bookSessionForUser } from "../services/bookingService.js";

const iso = (d) => new Date(d).toISOString();
const SEED_USER_PASSWORD = "admin-password";
const FIONA_SEED_PASSWORD = "user-password";

async function wipeAll() {
  // Remove all documents to guarantee a clean seed
  await Promise.all([
    usersDb.remove({}, { multi: true }),
    coursesDb.remove({}, { multi: true }),
    sessionsDb.remove({}, { multi: true }),
    bookingsDb.remove({}, { multi: true }),
  ]);
  // Compact files so you’re not looking at stale data on disk
  await Promise.all([
    usersDb.persistence.compactDatafile(),
    coursesDb.persistence.compactDatafile(),
    sessionsDb.persistence.compactDatafile(),
    bookingsDb.persistence.compactDatafile(),
  ]);
}

async function ensureDemoStudent() {
  let student = await UserModel.findByEmail("fiona@student.local");
  if (!student) {
    student = await UserModel.create({
      name: "Fiona",
      email: "fiona@student.local",
      password: FIONA_SEED_PASSWORD,
    });
  }
  return student;
}

async function ensureSecondDemoStudent() {
  let student = await UserModel.findByEmail("sam@student.local");
  if (!student) {
    student = await UserModel.create({
      name: "Sam",
      email: "sam@student.local",
      password: SEED_USER_PASSWORD,
    });
  }
  return student;
}

async function createWeekendWorkshop() {
  const instructor = await UserModel.create({
    name: "Ava",
    email: "ava@yoga.local",
    role: "admin",
    password: SEED_USER_PASSWORD,
  });
  const course = await CourseModel.create({
    title: "Winter Mindfulness Workshop",
    level: "beginner",
    type: "WEEKEND_WORKSHOP",
    location: "Studio A",
    allowDropIn: false,
    capacity: 1,
    price: 60,
    startDate: "2026-01-10",
    endDate: "2026-01-11",
    instructorId: instructor._id,
    description:
      "Two days of breath, posture alignment, and meditation.",
  });

  const base = new Date("2026-01-10T09:00:00"); // Sat 9am
  const sessions = [];
  for (let i = 0; i < 5; i++) {
    const start = new Date(base.getTime() + i * 2 * 60 * 60 * 1000); // every 2 hours
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const s = await SessionModel.create({
      courseId: course._id,
      startDateTime: iso(start),
      endDateTime: iso(end),
      bookedCount: 0,
    });
    sessions.push(s);
  }
  return { course, sessions, instructor };
}

async function createWeeklyBlock() {
  const instructor = await UserModel.create({
    name: "Ben",
    email: "ben@yoga.local",
    role: "admin",
    password: SEED_USER_PASSWORD,
  });
  const course = await CourseModel.create({
    title: "12‑Week Vinyasa Flow",
    level: "intermediate",
    type: "WEEKLY_BLOCK",
    location: "Main Hall",
    allowDropIn: true,
    capacity: 1,
    price: 8,
    startDate: "2026-02-02",
    endDate: "2026-04-20",
    instructorId: instructor._id,
    description:
      "Progressive sequences building strength and flexibility.",
  });

  const first = new Date("2026-02-02T18:30:00"); // Monday 6:30pm
  const sessions = [];
  for (let i = 0; i < 12; i++) {
    const start = new Date(first.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 75 * 60 * 1000);
    const s = await SessionModel.create({
      courseId: course._id,
      startDateTime: iso(start),
      endDateTime: iso(end),
      bookedCount: 0,
    });
    sessions.push(s);
  }
  return { course, sessions, instructor };
}

async function createSeedBookings({ studentOne, studentTwo, weekend, weekly }) {
  // Full-course bookings for the workshop (non drop-in): one confirmed, one waitlisted.
  await bookCourseForUser(studentOne._id, weekend.course._id);
  await bookCourseForUser(studentTwo._id, weekend.course._id);

  // Drop-in bookings on weekly sessions: include both confirmed and waitlisted.
  if (weekly.sessions[0]) {
    await bookSessionForUser(studentOne._id, weekly.sessions[0]._id);
    await bookSessionForUser(studentTwo._id, weekly.sessions[0]._id);
  }
  if (weekly.sessions[1]) {
    await bookSessionForUser(studentOne._id, weekly.sessions[1]._id);
  }
}

async function verifyAndReport() {
  const [users, courses, sessions, bookings] = await Promise.all([
    usersDb.count({}),
    coursesDb.count({}),
    sessionsDb.count({}),
    bookingsDb.count({}),
  ]);
  console.log("— Verification —");
  console.log("Users   :", users);
  console.log("Courses :", courses);
  console.log("Sessions:", sessions);
  console.log("Bookings:", bookings);
  if (courses === 0 || sessions === 0 || bookings === 0) {
    throw new Error("Seed finished but expected courses, sessions, and bookings to be created.");
  }
}

export async function runSeed() {
  console.log("Initializing DB…");
  await initDb();

  console.log("Wiping existing data…");
  await wipeAll();

  console.log("Creating demo student…");
  const student = await ensureDemoStudent();

  console.log("Creating second demo student…");
  const secondStudent = await ensureSecondDemoStudent();

  console.log("Creating weekend workshop…");
  const w = await createWeekendWorkshop();

  console.log("Creating weekly block…");
  const b = await createWeeklyBlock();

  console.log("Creating seed bookings…");
  await createSeedBookings({
    studentOne: student,
    studentTwo: secondStudent,
    weekend: w,
    weekly: b,
  });

  await verifyAndReport();

  console.log("run Seed complete.");
  console.log("Student ID:", student._id);
  console.log(
    "Workshop course ID:",
    w.course._id,
    "(sessions:",
    w.sessions.length + ")"
  );
  console.log(
    "Weekly block course ID:",
    b.course._id,
    "(sessions:",
    b.sessions.length + ")"
  );
}

const isDirectRun =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runSeed().catch((err) => {
    console.error("run Seed failed:", err?.stack || err);
    process.exit(1);
  });
}
