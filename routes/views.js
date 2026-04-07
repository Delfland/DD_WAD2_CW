// routes/views.js
import { Router } from "express";
import {
  homePage,
  courseDetailPage,
  courseBookingPage,
  courseEditPage,
  postCourseEdit,
  deleteCourse,
  createSession,
  deleteSession,
  editSessionPage,
  updateSession,
  sessionBookingPage,
  postBookCourse,
  postBookSession,
  bookingConfirmationPage,
  courseBookingsPage,
  usersPage,
  makeUserAdmin,
  removeUserAdmin,
  deleteUser,
} from "../controllers/viewsController.js";
import { requireAdmin, requireAuth } from "../auth/auth.js";

import { coursesListPage } from "../controllers/coursesListController.js";

const router = Router();

router.get("/", homePage);
router.get("/users", requireAdmin, usersPage);
router.post("/users/:id/admin", requireAdmin, makeUserAdmin);
router.post("/users/:id/remove-admin", requireAdmin, removeUserAdmin);
router.post("/users/:id/delete", requireAdmin, deleteUser);
router.get("/courses", requireAdmin, coursesListPage);
router.get("/courses/:id", courseDetailPage);
router.get("/courses/:id/bookings", requireAdmin, courseBookingsPage);
router.get("/courses/:id/edit", requireAdmin, courseEditPage);
router.post("/courses/:id/edit", requireAdmin, postCourseEdit);
router.post("/courses/:id/delete", requireAdmin, deleteCourse);
router.post("/courses/:id/sessions/new", requireAdmin, createSession);
router.get("/courses/:id/sessions/:sessionId/edit", requireAdmin, editSessionPage);
router.post("/courses/:id/sessions/:sessionId/edit", requireAdmin, updateSession);
router.post("/courses/:id/sessions/:sessionId/delete", requireAdmin, deleteSession);
router.get("/courses/:id/book", requireAuth, courseBookingPage);
router.post("/courses/:id/book", requireAuth, postBookCourse);
router.get("/sessions/:id/book", sessionBookingPage);
router.post("/sessions/:id/book", postBookSession);
router.get("/bookings/:bookingId", bookingConfirmationPage);

export default router;
