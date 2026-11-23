const Task = require("../models/Task");
const User = require("../models/User");
const Submission = require("../models/Submission");

const EDITABLE_FIELDS = ["title", "description", "assignedTo", "deadline", "priority", "status"];
const INTERN_POPULATE = ["assignedTo", "name email department"];

// Copies only the allowed fields from the request body
const pickFields = (body = {}) =>
  Object.fromEntries(EDITABLE_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

// Checks that the given id belongs to an active intern
const isActiveIntern = async (id) => Boolean(await User.exists({ _id: id, role: "intern", isActive: true }));

// GET /api/tasks?status=&priority=&assignedTo= - Admin gets all tasks, with optional filters
const getTasks = async (req, res) => {
  const { status, priority, assignedTo } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = assignedTo;

  const tasks = await Task.find(filter).populate(...INTERN_POPULATE).sort({ deadline: 1 });
  res.json(tasks);
};

// POST /api/tasks - Admin creates a task and assigns it to an intern
const createTask = async (req, res) => {
  const data = pickFields(req.body);
  if (!data.title || !data.assignedTo || !data.deadline) {
    return res.status(400).json({ message: "Title, assignedTo and deadline are required" });
  }
  if (!(await isActiveIntern(data.assignedTo))) {
    return res.status(400).json({ message: "assignedTo must be an active intern" });
  }

  const task = await Task.create(data);
  await task.populate(...INTERN_POPULATE);
  res.status(201).json(task);
};

// GET /api/tasks/my?status= - Logged-in intern gets the tasks assigned to them
const getMyTasks = async (req, res) => {
  const filter = { assignedTo: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const tasks = await Task.find(filter).sort({ deadline: 1 });
  res.json(tasks);
};

// PUT /api/tasks/:id - Admin edits any field; an intern can only change the status of their own task
const updateTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const data = pickFields(req.body);

  if (req.user.role === "intern") {
    if (!task.assignedTo.equals(req.user._id)) {
      return res.status(403).json({ message: "You can only update your own tasks" });
    }
    if (Object.keys(data).some((f) => f !== "status")) {
      return res.status(403).json({ message: "Interns can only update the status" });
    }
  } else if (data.assignedTo && !(await isActiveIntern(data.assignedTo))) {
    return res.status(400).json({ message: "assignedTo must be an active intern" });
  }

  // save() runs the schema validators, so a wrong status or priority is rejected
  Object.assign(task, data);
  await task.save();
  await task.populate(...INTERN_POPULATE);
  res.json(task);
};

// DELETE /api/tasks/:id - Admin deletes a task and all its submissions
const deleteTask = async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  await Submission.deleteMany({ task: task._id });

  res.json({ message: "Task deleted" });
};

module.exports = { getTasks, createTask, getMyTasks, updateTask, deleteTask };
