const express = require("express");
const {
  createSubmission,
  getSubmissions,
  reviewSubmission,
} = require("../controllers/submissionController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

// POST is for interns, so it uses protect only; the controller checks the task belongs to them
router.route("/").post(createSubmission).get(adminOnly, getSubmissions);
router.put("/:id/review", adminOnly, reviewSubmission);

module.exports = router;
