// routes/views.js
import { Router } from "express";
import {
  homePage,
  courseDetailPage,
  postBookCourse,
  postBookSession,
  bookingConfirmationPage,
} from "../controllers/viewsController.js";

import { coursesListPage } from "../controllers/coursesListController.js";

const router = Router();

router.get("/", homePage);
router.get("/courses", coursesListPage);
router.get("/courses/:id", courseDetailPage);
router.post("/courses/:id/book", postBookCourse);
router.post("/sessions/:id/book", postBookSession);
router.get("/bookings/:bookingId", bookingConfirmationPage);

export default router;
