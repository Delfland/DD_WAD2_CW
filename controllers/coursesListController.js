// controllers/coursesListController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

const fmtDateOnly = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "TBA";

export const coursesListPage = async (req, res, next) => {
  try {
    // Query params for filters/pagination
    const {
      level, // beginner | intermediate | advanced
      type, // WEEKLY_BLOCK | WEEKEND_WORKSHOP
      dropin, // yes | no
      q, // text search in title/description (basic contains)
      page = "1", // 1-based
      pageSize = "10", // default page size
    } = req.query;

    // Base filter for DB lookup
    const filter = {};
    if (level) filter.level = level;
    if (type) filter.type = type;
    if (dropin === "yes") filter.allowDropIn = true;
    if (dropin === "no") filter.allowDropIn = false;

    // Fetch all courses matching basic filters
    let courses = await CourseModel.list(filter);

    // Client-side search (NeDB has basic querying; for simplicity, do it here)
    const needle = (q || "").trim().toLowerCase();
    if (needle) {
      courses = courses.filter(
        (c) =>
          c.title?.toLowerCase().includes(needle) ||
          c.description?.toLowerCase().includes(needle)
      );
    }

    // Sort by startDate ascending (fallback to title)
    courses.sort((a, b) => {
      const ad = a.startDate
        ? new Date(a.startDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      const bd = b.startDate
        ? new Date(b.startDate).getTime()
        : Number.MAX_SAFE_INTEGER;
      if (ad !== bd) return ad - bd;
      return (a.title || "").localeCompare(b.title || "");
    });

    // Pagination
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.max(1, parseInt(pageSize, 10) || 10);
    const total = courses.length;
    const totalPages = Math.max(1, Math.ceil(total / ps));
    const start = (p - 1) * ps;
    const pageItems = courses.slice(start, start + ps);

    // Enrich with first session date, session count
    const cards = await Promise.all(
      pageItems.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        const first = sessions[0];
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          location: c.location,
          allowDropIn: c.allowDropIn,
          price: c.price,
          startDate: fmtDateOnly(c.startDate),
          endDate: fmtDateOnly(c.endDate),
          nextSession: first ? fmtDateTime(first.startDateTime) : "TBA",
          sessionsCount: sessions.length,
          description: c.description,
        };
      })
    );

    // Build pagination view model
    const pagination = {
      page: p,
      pageSize: ps,
      total,
      totalPages,
      hasPrev: p > 1,
      hasNext: p < totalPages,
      prevLink: p > 1 ? buildLink(req, p - 1, ps) : null,
      nextLink: p < totalPages ? buildLink(req, p + 1, ps) : null,
    };

    res.render("courses", {
      title: "Courses",
      filters: {
        level,
        isBeginner: level === "beginner",
        isIntermediate: level === "intermediate",
        isAdvanced: level === "advanced",
        type,
        dropin,
        q,
      },
      courses: cards,
      pagination,
    });
  } catch (err) {
    next(err);
  }
};

// Helper to preserve current query params while changing page
function buildLink(req, page, pageSize) {
  const url = new URL(
    `${req.protocol}://${req.get("host")}${req.originalUrl.split("?")[0]}`
  );
  const params = new URLSearchParams(req.query);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  return `${url.pathname}?${params.toString()}`;
}
