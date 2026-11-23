const express = require("express");
const { getStats } = require("../controllers/dashboardController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Both roles use this route; the controller decides which stats to return
router.get("/stats", protect, getStats);

module.exports = router;
