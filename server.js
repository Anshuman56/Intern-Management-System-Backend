require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/error");
const authRoutes = require("./routes/authRoutes");
const internRoutes = require("./routes/internRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Intern Management System API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/interns", internRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
