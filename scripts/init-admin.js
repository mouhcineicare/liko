const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "12345qwert";

// User Schema (simplified version matching our User model)
const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ["patient", "therapist", "admin"],
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: String,
  telephone: String,
  image: String,
});

// Password hashing middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

async function initAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    // Get User model (or create if doesn't exist)
    const User = mongoose.models.User || mongoose.model("User", userSchema);

    // Check if admin exists
    const existingAdmin = await User.findOne({ role: "admin" });

    if (existingAdmin) {
      console.log("Admin user already exists, skipping creation");
    } else {
      // Create admin user
      const adminUser = new User({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: "admin",
        fullName: "System Admin",
      });

      await adminUser.save();
      console.log("Admin user created successfully");
    }

    // Close the connection
    await mongoose.connection.close();
    console.log("Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run the initialization
initAdmin();
