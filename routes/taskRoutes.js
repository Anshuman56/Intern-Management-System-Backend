const express = require("express");
const {
  getTasks,
  createTask,
  getMyTasks,
  updateTask,
  deleteTask,
} = require("../controllers/taskController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

// /my must come before /:id, otherwise "my" would be treated as an id
router.get("/my", getMyTasks);
router.route("/").get(adminOnly, getTasks).post(adminOnly, createTask);
router.route("/:id").put(updateTask).delete(adminOnly, deleteTask);

module.exports = router;
