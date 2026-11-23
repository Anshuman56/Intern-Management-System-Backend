const User = require("../models/User");
const Task = require("../models/Task");
const Submission = require("../models/Submission");

const TASK_STATUSES = Task.schema.path("status").enumValues;
const TASK_PRIORITIES = Task.schema.path("priority").enumValues;
const NOT_REVIEWED = { adminFeedback: { $in: ["", null] } };

// Counts tasks grouped by a field, e.g. { Pending: 2, "In Progress": 1, Completed: 0 }
const countTasksBy = async (field, values, match = {}) => {
  const groups = await Task.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);
  const counts = Object.fromEntries(values.map((v) => [v, 0]));
  groups.forEach((g) => (counts[g._id] = g.count));
  return counts;
};

// Builds the filter for tasks that are past their deadline and not completed
const overdueFilter = (match = {}) => ({ ...match, deadline: { $lt: new Date() }, status: { $ne: "Completed" } });

// Collects the numbers for the admin dashboard
const getAdminStats = async () => {
  const [totalInterns, activeInterns, totalTasks, byStatus, byPriority, overdue, totalSubmissions, pendingReview] =
    await Promise.all([
      User.countDocuments({ role: "intern" }),
      User.countDocuments({ role: "intern", isActive: true }),
      Task.countDocuments(),
      countTasksBy("status", TASK_STATUSES),
      countTasksBy("priority", TASK_PRIORITIES),
      Task.countDocuments(overdueFilter()),
      Submission.countDocuments(),
      Submission.countDocuments(NOT_REVIEWED),
    ]);

  return {
    interns: { total: totalInterns, active: activeInterns, inactive: totalInterns - activeInterns },
    tasks: { total: totalTasks, byStatus, byPriority, overdue },
    submissions: { total: totalSubmissions, pendingReview, reviewed: totalSubmissions - pendingReview },
  };
};

// Collects the numbers for one intern's dashboard
const getInternStats = async (internId) => {
  const mine = { assignedTo: internId };
  const [totalTasks, byStatus, overdue, totalSubmissions, pendingReview] = await Promise.all([
    Task.countDocuments(mine),
    countTasksBy("status", TASK_STATUSES, mine),
    Task.countDocuments(overdueFilter(mine)),
    Submission.countDocuments({ intern: internId }),
    Submission.countDocuments({ intern: internId, ...NOT_REVIEWED }),
  ]);

  return {
    tasks: { total: totalTasks, byStatus, overdue },
    submissions: { total: totalSubmissions, pendingReview, reviewed: totalSubmissions - pendingReview },
  };
};

// GET /api/dashboard/stats - Admin gets stats for the whole system; an intern gets stats for their own work
const getStats = async (req, res) => {
  const stats = req.user.role === "admin" ? await getAdminStats() : await getInternStats(req.user._id);
  res.json({ role: req.user.role, ...stats });
};

module.exports = { getStats };
