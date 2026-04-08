// controllers/viewsController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import {
  bookCourseForUser,
  bookSessionForUser,
} from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";
import { UserModel } from "../models/userModel.js";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const fmtDateOnly = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatCourseType = (type) => {
  if (type === "WEEKLY_BLOCK") return "Weekly block";
  if (type === "WEEKEND_WORKSHOP") return "Weekend workshop";
  return type;
};

const toSessionDateParts = (iso) => {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) {
    return { date: "", startTime: "", endTime: "" };
  }
  return {
    date: dt.toISOString().slice(0, 10),
    startTime: dt.toISOString().slice(11, 16),
  };
};

const buildSessionDateTimes = (date, startTime, endTime) => {
  const startDt = new Date(`${date}T${startTime}`);
  const endDt = new Date(`${date}T${endTime}`);

  if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) {
    return null;
  }
  if (endDt <= startDt) {
    return "END_BEFORE_START";
  }

  return {
    startDateTime: startDt.toISOString(),
    endDateTime: endDt.toISOString(),
  };
};

export const homePage = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    const cards = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        const nextSession = sessions[0];
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: formatCourseType(c.type),
          location: c.location,
          allowDropIn: c.allowDropIn,
          price: c.price,
          startDate: c.startDate ? fmtDateOnly(c.startDate) : "",
          endDate: c.endDate ? fmtDateOnly(c.endDate) : "",
          nextSession: nextSession ? fmtDate(nextSession.startDateTime) : "TBA",
          sessionsCount: sessions.length,
          description: c.description,
        };
      })
    );
    res.render("home", { title: "Yoga Courses", courses: cards });
  } catch (err) {
    next(err);
  }
};

export const courseDetailPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    const sessions = await SessionModel.listByCourse(courseId);
    const rows = sessions.map((s) => {
      const booked = s.bookedCount ?? 0;
      const capacity = s.capacity ?? 0;
      return {
        id: s._id,
        location: course.location,
        start: fmtDate(s.startDateTime),
        end: fmtDate(s.endDateTime),
        capacity,
        booked,
        remaining: Math.max(0, capacity - booked),
        isFull: booked >= capacity,
        allowDropIn: !!course.allowDropIn,
      };
    });

    const courseIsFull = rows.some((r) => r.isFull);

    res.render("course", {
      title: course.title,
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: formatCourseType(course.type),
        location: course.location,
        allowDropIn: course.allowDropIn,
        isFull: courseIsFull,
        capacity: course.capacity,
        price: course.price,
        startDate: course.startDate ? fmtDateOnly(course.startDate) : "",
        endDate: course.endDate ? fmtDateOnly(course.endDate) : "",
        description: course.description,
      },
      sessions: rows,
    });
  } catch (err) {
    next(err);
  }
};

export const courseBookingPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    const sessions = await SessionModel.listByCourse(courseId);
    const rows = sessions.map((s) => ({
      id: s._id,
      location: course.location,
      start: fmtDate(s.startDateTime),
      remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
    }));

    res.render("course_book", {
      title: `Book ${course.title}`,
      user: req.user || null,
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: formatCourseType(course.type),
        location: course.location,
        allowDropIn: course.allowDropIn,
        price: course.price,
        startDate: course.startDate ? fmtDateOnly(course.startDate) : "",
        endDate: course.endDate ? fmtDateOnly(course.endDate) : "",
        description: course.description,
      },
      sessionsCount: rows.length,
      sessions: rows,
    });
  } catch (err) {
    next(err);
  }
};

export const sessionBookingPage = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await SessionModel.findById(sessionId);
    if (!session)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Session not found" });

    const course = await CourseModel.findById(session.courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });

    res.render("session_book", {
      title: `Book session for ${course.title}`,
      user: req.user || null,
      course: {
        id: course._id,
        title: course.title,
        location: course.location,
        allowDropIn: course.allowDropIn,
        price: course.price,
      },
      session: {
        id: session._id,
        start: fmtDate(session.startDateTime),
        end: fmtDate(session.endDateTime),
        remaining: Math.max(
          0,
          (session.capacity ?? 0) - (session.bookedCount ?? 0)
        ),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const postBookCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const userId = req.user?._id || req.body.userId;
    if (!userId) {
      return res.status(401).render("error", {
        title: "Authentication required",
        message: "Please sign in before booking a course.",
      });
    }
    const booking = await bookCourseForUser(userId, courseId);
    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    res
      .status(400)
      .render("error", { title: "Booking failed", message: err.message });
  }
};

export const postBookSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const userId = req.user?._id || req.body.userId;
    if (!userId) {
      return res.status(401).render("error", {
        title: "Authentication required",
        message: "Please sign in before booking a session.",
      });
    }
    const booking = await bookSessionForUser(userId, sessionId);
    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    const message =
      err.code === "DROPIN_NOT_ALLOWED"
        ? "Drop-ins are not allowed for this course."
        : err.message;
    res.status(400).render("error", { title: "Booking failed", message });
  }
};

export const bookingConfirmationPage = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await BookingModel.findById(bookingId);
    if (!booking)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Booking not found" });

    res.render("booking_confirmation", {
      title: "Booking confirmation",
      booking: {
        id: booking._id,
        type: booking.type,
        status: req.query.status || booking.status,
        createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
      },
    });
  } catch (err) {
    next(err);
  }
};

export const courseBookingsPage = async (req, res, next) => {
  try {
    const countByStatus = (items) => {
      const confirmed = items.filter((b) => b.status === "CONFIRMED").length;
      const waitlisted = items.filter((b) => b.status === "WAITLISTED").length;
      return {
        confirmed,
        waitlisted,
      };
    };

    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });
    }

    const sessions = await SessionModel.listByCourse(courseId);
    const bookings = await BookingModel.listByCourse(courseId);

    const bookingsWithUser = await Promise.all(
      bookings.map(async (b) => {
        const user = b.userId ? await UserModel.findById(b.userId) : null;
        return {
          id: b._id,
          type: b.type || "",
          status: b.status || "",
          createdAt: b.createdAt ? fmtDate(b.createdAt) : "",
          userName: user?.name || "Unknown user",
          userEmail: user?.email || "",
          sessionIds: Array.isArray(b.sessionIds) ? b.sessionIds : [],
        };
      })
    );

    const isDropIn = !!course.allowDropIn;
    const totals = countByStatus(bookingsWithUser);

    const sessionBookingGroups = isDropIn
      ? sessions.map((s) => {
          const sessionBookings = bookingsWithUser.filter((b) =>
            b.sessionIds.includes(s._id)
          );
          const statusTotals = countByStatus(sessionBookings);
          return {
            sessionId: s._id,
            sessionDate: fmtDateOnly(s.startDateTime),
            sessionStart: fmtDate(s.startDateTime),
            sessionEnd: fmtDate(s.endDateTime),
            bookings: sessionBookings,
            hasBookings: sessionBookings.length > 0,
            confirmedCount: statusTotals.confirmed,
            waitlistedCount: statusTotals.waitlisted,
          };
        })
      : [];

    return res.render("course_bookings", {
      title: `Bookings - ${course.title}`,
      course: {
        id: course._id,
        title: course.title,
        allowDropIn: isDropIn,
      },
      bookings: bookingsWithUser,
      hasBookings: bookingsWithUser.length > 0,
      confirmedCount: totals.confirmed,
      waitlistedCount: totals.waitlisted,
      sessionBookingGroups,
      hasSessionGroups: sessionBookingGroups.length > 0,
    });
  } catch (err) {
    return next(err);
  }
};

export const usersPage = async (req, res, next) => {
  try {
    const users = await UserModel.list();
    const qRaw = typeof req.query.q === "string" ? req.query.q : "";
    const q = qRaw.trim().toLocaleLowerCase("en-GB");
    const adminOnly =
      req.query.admin === "on" ||
      req.query.admin === "true" ||
      req.query.admin === "1";

    const currentUser = req.user || null;
    const canManageUsers = currentUser?.role === "admin";
    const sortedUsers = users
      .map((u) => UserModel.sanitize(u))
      .filter((u) => (adminOnly ? u?.role === "admin" : true))
      .filter((u) => {
        if (!q) return true;
        const name = (u?.name || "").toLocaleLowerCase("en-GB");
        const email = (u?.email || "").toLocaleLowerCase("en-GB");
        return name.includes(q) || email.includes(q);
      })
      .sort((a, b) => {
        const nameA = (a?.name || "").toLocaleLowerCase("en-GB");
        const nameB = (b?.name || "").toLocaleLowerCase("en-GB");
        if (nameA !== nameB) return nameA.localeCompare(nameB, "en-GB");
        return (a?.email || "").localeCompare(b?.email || "", "en-GB");
      })
      .map((u) => ({
        id: u._id,
        name: u.name || "",
        email: u.email || "",
        role: u.role || "user",
        isAdmin: u.role === "admin",
        isCurrentUser: currentUser?._id === u._id,
        canRemoveAdmin: u.role === "admin" && currentUser?._id !== u._id,
      }));

    return res.render("users", {
      title: "Users",
      users: sortedUsers,
      hasUsers: sortedUsers.length > 0,
      canManageUsers,
      filters: {
        q: qRaw,
        adminOnly,
      },
    });
  } catch (err) {
    return next(err);
  }
};

const denyUserManagement = (req, res, message) => {
  if (req.accepts("html")) {
    return res.status(403).render("error", {
      title: "Forbidden",
      message,
    });
  }

  return res.status(403).json({ error: message });
};

export const makeUserAdmin = async (req, res, next) => {
  try {
    if (req.user?.role !== "admin") {
      return denyUserManagement(req, res, "Only admins can promote users.");
    }

    const userId = req.params.id;
    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .render("error", { title: "Not found", message: "User not found" });
    }

    if (user.role === "admin") {
      return res.redirect("/users");
    }

    await UserModel.update(userId, { role: "admin" });
    return res.redirect("/users");
  } catch (err) {
    return next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    if (req.user?.role !== "admin") {
      return denyUserManagement(req, res, "Only admins can remove users.");
    }

    const userId = req.params.id;
    if (req.user?._id === userId) {
      return res.status(400).render("error", {
        title: "Action not allowed",
        message: "You cannot remove your own account.",
      });
    }

    const removed = await UserModel.delete(userId);
    if (!removed) {
      return res
        .status(404)
        .render("error", { title: "Not found", message: "User not found" });
    }

    return res.redirect("/users");
  } catch (err) {
    return next(err);
  }
};

export const removeUserAdmin = async (req, res, next) => {
  try {
    if (req.user?.role !== "admin") {
      return denyUserManagement(req, res, "Only admins can remove admin access.");
    }

    const userId = req.params.id;
    if (req.user?._id === userId) {
      return res.status(400).render("error", {
        title: "Action not allowed",
        message: "You cannot remove your own admin access.",
      });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .render("error", { title: "Not found", message: "User not found" });
    }

    if (user.role !== "admin") {
      return res.redirect("/users");
    }

    await UserModel.update(userId, { role: "user" });
    return res.redirect("/users");
  } catch (err) {
    return next(err);
  }
};

export const courseEditPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });
    }

    const sessions = await SessionModel.listByCourse(courseId);

    res.render("course_edit", {
      title: `Edit ${course.title}`,
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        isBeginner: course.level === "beginner",
        isIntermediate: course.level === "intermediate",
        isAdvanced: course.level === "advanced",
        type: course.type,
        isWeeklyBlock: course.type === "WEEKLY_BLOCK",
        isWeekendWorkshop: course.type === "WEEKEND_WORKSHOP",
        location: course.location,
        allowDropIn: course.allowDropIn,
        capacity: course.capacity,
        price: course.price,
        startDate: course.startDate,
        endDate: course.endDate,
        instructorId: course.instructorId,
        description: course.description,
      },
      sessions: sessions.map((s) => {
        const startParts = toSessionDateParts(s.startDateTime);
        const endParts = toSessionDateParts(s.endDateTime);
        return {
          id: s._id,
          date: startParts.date,
          startTime: startParts.startTime,
          endTime: endParts.startTime,
          capacity: s.capacity,
          bookedCount: s.bookedCount || 0,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
};

export const courseCreatePage = async (req, res, next) => {
  try {
    return res.render("course_create", {
      title: "Create Course",
      course: {
        level: "beginner",
        isBeginner: true,
        isIntermediate: false,
        isAdvanced: false,
        type: "WEEKLY_BLOCK",
        isWeeklyBlock: true,
        isWeekendWorkshop: false,
        allowDropIn: true,
      },
    });
  } catch (err) {
    return next(err);
  }
};

export const postCourseCreate = async (req, res, next) => {
  try {
    const {
      title,
      level,
      type,
      location,
      allowDropIn,
      capacity,
      price,
      startDate,
      endDate,
      description,
      sessionDate,
      startTime,
      endTime,
    } = req.body;

    const initialSessionTimes = buildSessionDateTimes(
      sessionDate,
      startTime,
      endTime
    );
    if (!initialSessionTimes) {
      return res.status(400).render("error", {
        title: "Invalid dates",
        message: "Please provide a valid date, start time, and end time.",
      });
    }
    if (initialSessionTimes === "END_BEFORE_START") {
      return res.status(400).render("error", {
        title: "Invalid times",
        message: "End time must be after start time.",
      });
    }

    const course = await CourseModel.create({
      title,
      level,
      type,
      location,
      allowDropIn: allowDropIn === "on" || allowDropIn === "true",
      capacity: parseInt(capacity, 10),
      price: parseFloat(price),
      startDate,
      endDate,
      instructorId: req.user?._id,
      description,
    });

    await SessionModel.create({
      courseId: course._id,
      startDateTime: initialSessionTimes.startDateTime,
      endDateTime: initialSessionTimes.endDateTime,
      bookedCount: 0,
    });

    return res.redirect(`/courses/${course._id}/edit`);
  } catch (err) {
    return next(err);
  }
};

export const postCourseEdit = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const {
      title,
      level,
      type,
      location,
      allowDropIn,
      capacity,
      price,
      startDate,
      endDate,
      description,
    } = req.body;

    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });
    }

    await CourseModel.update(courseId, {
      title,
      level,
      type,
      location,
      allowDropIn: allowDropIn === "on" || allowDropIn === "true",
      capacity: parseInt(capacity, 10),
      price: parseFloat(price),
      startDate,
      endDate,
      description,
    });

    return res.redirect("/courses");
  } catch (err) {
    return next(err);
  }
};

export const deleteCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.redirect("/courses");
    }

    // Delete associated sessions
    const sessions = await SessionModel.listByCourse(courseId);
    for (const session of sessions) {
      await SessionModel.delete(session._id);
    }

    // Delete the course
    await CourseModel.delete(courseId);

    return res.redirect("/courses");
  } catch (err) {
    return next(err);
  }
};

export const createSession = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { sessionDate, startTime, endTime } = req.body;

    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });
    }

    const sessionTimes = buildSessionDateTimes(sessionDate, startTime, endTime);
    if (!sessionTimes) {
      return res.status(400).render("error", {
        title: "Invalid dates",
        message: "Please provide a valid date, start time, and end time.",
      });
    }
    if (sessionTimes === "END_BEFORE_START") {
      return res.status(400).render("error", {
        title: "Invalid times",
        message: "End time must be after start time.",
      });
    }

    await SessionModel.create({
      courseId,
      startDateTime: sessionTimes.startDateTime,
      endDateTime: sessionTimes.endDateTime,
      bookedCount: 0,
    });

    return res.redirect(`/courses/${courseId}/edit`);
  } catch (err) {
    return next(err);
  }
};

export const deleteSession = async (req, res, next) => {
  try {
    const { id: courseId, sessionId } = req.params;
    const session = await SessionModel.findById(sessionId);

    if (!session) {
      return res.redirect(`/courses/${courseId}/edit`);
    }

    await SessionModel.delete(sessionId);
    return res.redirect(`/courses/${courseId}/edit`);
  } catch (err) {
    return next(err);
  }
};

export const editSessionPage = async (req, res, next) => {
  try {
    const { id: courseId, sessionId } = req.params;

    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found" });
    }

    const session = await SessionModel.findById(sessionId);
    if (!session) {
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Session not found" });
    }

    const startParts = toSessionDateParts(session.startDateTime);
    const endParts = toSessionDateParts(session.endDateTime);

    res.render("session_edit", {
      title: `Edit Session - ${course.title}`,
      course: {
        id: course._id,
        title: course.title,
      },
      session: {
        id: session._id,
        sessionDate: startParts.date,
        startTime: startParts.startTime,
        endTime: endParts.startTime,
        capacity: course.capacity,
        bookedCount: session.bookedCount || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateSession = async (req, res, next) => {
  try {
    const { id: courseId, sessionId } = req.params;
    const { sessionDate, startTime, endTime } = req.body;

    const session = await SessionModel.findById(sessionId);
    if (!session) {
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Session not found" });
    }

    const sessionTimes = buildSessionDateTimes(sessionDate, startTime, endTime);
    if (!sessionTimes) {
      return res.status(400).render("error", {
        title: "Invalid dates",
        message: "Please provide a valid date, start time, and end time.",
      });
    }
    if (sessionTimes === "END_BEFORE_START") {
      return res.status(400).render("error", {
        title: "Invalid times",
        message: "End time must be after start time.",
      });
    }

    await SessionModel.update(sessionId, {
      startDateTime: sessionTimes.startDateTime,
      endDateTime: sessionTimes.endDateTime,
    });

    return res.redirect(`/courses/${courseId}/edit`);
  } catch (err) {
    return next(err);
  }
};
