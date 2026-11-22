const User = require("../models/User");
const Task = require("../models/Task");
const Submission = require("../models/Submission");

const EDITABLE_FIELDS = ["name", "email", "password", "phone", "department", "joiningDate", "isActive"];

// Copies only the allowed fields so the client can never set role
const pickFields = (body = {}) =>
  Object.fromEntries(EDITABLE_FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

// GET /api/interns?search=&department=&isActive=
const getInterns = async (req, res) => {
  const { search, department, isActive } = req.query;
  const filter = { role: "intern" };

  if (department) filter.department = department;
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const interns = await User.find(filter).sort({ createdAt: -1 });
  res.json(interns);
};

// POST /api/interns
const createIntern = async (req, res) => {
  const data = pickFields(req.body);
  if (!data.name || !data.email || !data.password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }

  const intern = await User.create({ ...data, role: "intern" });
  const { password, ...rest } = intern.toObject();
  res.status(201).json(rest);
};

// GET /api/interns/:id
const getIntern = async (req, res) => {
  const intern = await User.findOne({ _id: req.params.id, role: "intern" });
  if (!intern) return res.status(404).json({ message: "Intern not found" });
  res.json(intern);
};

// PUT /api/interns/:id
const updateIntern = async (req, res) => {
  const intern = await User.findOne({ _id: req.params.id, role: "intern" });
  if (!intern) return res.status(404).json({ message: "Intern not found" });

  // save() (not findByIdAndUpdate) so a new password gets hashed by the pre-save hook
  Object.assign(intern, pickFields(req.body));
  await intern.save();

  const { password, ...rest } = intern.toObject();
  res.json(rest);
};

// DELETE /api/interns/:id
const deleteIntern = async (req, res) => {
  const intern = await User.findOneAndDelete({ _id: req.params.id, role: "intern" });
  if (!intern) return res.status(404).json({ message: "Intern not found" });

  // Remove the intern's tasks and submissions so nothing points to a missing user
  await Task.deleteMany({ assignedTo: intern._id });
  await Submission.deleteMany({ intern: intern._id });

  res.json({ message: "Intern deleted" });
};

module.exports = { getInterns, createIntern, getIntern, updateIntern, deleteIntern };
