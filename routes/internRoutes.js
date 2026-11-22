const express = require("express");
const {
  getInterns,
  createIntern,
  getIntern,
  updateIntern,
  deleteIntern,
} = require("../controllers/internController");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

router.use(protect, adminOnly);

router.route("/").get(getInterns).post(createIntern);
router.route("/:id").get(getIntern).put(updateIntern).delete(deleteIntern);

module.exports = router;
