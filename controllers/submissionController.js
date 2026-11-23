const Submission = require("../models/Submission");
const Task = require("../models/Task");

const SUBMIT_FIELDS = ["task", "description", "githubUrl", "docLink"];
const TASK_STATUSES = Task.schema.path("status").enumValues;

// Copies only the allowed fields from the request body
const pickFields = (body = {}) =>
  Object.fromEntries(SUBMIT_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

// Checks that a link is a real http or https URL
const isValidUrl = (value) => {
  if (!URL.canParse(value)) return false;
  return ["http:", "https:"].includes(new URL(value).protocol);
};

// Adds the task and intern details to a submission
const populateSubmission = (query) =>
  query.populate("task", "title status deadline priority").populate("intern", "name email department");

// POST /api/submissions - Intern submits their work for one of their own tasks
const createSubmission = async (req, res) => {
  if (req.user.role !== "intern") {
    return res.status(403).json({ message: "Only interns can submit work" });
  }

  const data = pickFields(req.body);
  if (!data.task) return res.status(400).json({ message: "Task is required" });
  if (!data.githubUrl && !data.docLink) {
    return res.status(400).json({ message: "Add a githubUrl or a docLink" });
  }
  for (const field of ["githubUrl", "docLink"]) {
    if (data[field] && !isValidUrl(data[field])) {
      return res.status(400).json({ message: `${field} must be a valid http(s) link` });
    }
  }

  const task = await Task.findById(data.task);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (!task.assignedTo.equals(req.user._id)) {
    return res.status(403).json({ message: "You can only submit work for your own tasks" });
  }
  if (task.status === "Completed") {
    return res.status(400).json({ message: "This task is already completed" });
  }

  const submission = await Submission.create({ ...data, intern: req.user._id });
  res.status(201).json(await populateSubmission(Submission.findById(submission._id)));
};

// GET /api/submissions?task=&intern=&reviewed= - Admin gets all submissions, newest first
const getSubmissions = async (req, res) => {
  const { task, intern, reviewed } = req.query;
  const filter = {};

  if (task) filter.task = task;
  if (intern) filter.intern = intern;
  if (reviewed === "true") filter.adminFeedback = { $nin: ["", null] };
  if (reviewed === "false") filter.adminFeedback = { $in: ["", null] };

  const submissions = await populateSubmission(Submission.find(filter)).sort({ submittedAt: -1 });
  res.json(submissions);
};

// PUT /api/submissions/:id/review - Admin gives feedback and can update the task status at the same time
const reviewSubmission = async (req, res) => {
  const { adminFeedback, taskStatus } = req.body || {};
  if (typeof adminFeedback !== "string" || !adminFeedback.trim()) {
    return res.status(400).json({ message: "adminFeedback is required" });
  }
  if (taskStatus !== undefined && !TASK_STATUSES.includes(taskStatus)) {
    return res.status(400).json({ message: `taskStatus must be one of: ${TASK_STATUSES.join(", ")}` });
  }

  const submission = await Submission.findById(req.params.id);
  if (!submission) return res.status(404).json({ message: "Submission not found" });

  submission.adminFeedback = adminFeedback;
  await submission.save();

  if (taskStatus) {
    await Task.findByIdAndUpdate(submission.task, { status: taskStatus });
  }

  res.json(await populateSubmission(Submission.findById(submission._id)));
};

module.exports = { createSubmission, getSubmissions, reviewSubmission };
