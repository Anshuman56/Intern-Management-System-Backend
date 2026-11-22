require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");

const seedAdmin = async () => {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || "admin@ims.com").toLowerCase();
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`Admin already exists: ${email}`);
  } else {
    await User.create({
      name: process.env.ADMIN_NAME || "Admin",
      email,
      password: process.env.ADMIN_PASSWORD || "Admin@123",
      role: "admin",
    });
    console.log(`Admin created: ${email}`);
  }

  await mongoose.disconnect();
};

seedAdmin().catch(async (error) => {
  console.error(`Seeding failed: ${error.message}`);
  await mongoose.disconnect();
  process.exit(1);
});
