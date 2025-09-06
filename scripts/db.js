const { MongoClient } = require("mongodb");
require("dotenv").config(); // Load environment variables

async function createUsers() {
  const uri = "mongodb://localhost:27017"; // MongoDB connection URI
  const client = new MongoClient(uri, { useUnifiedTopology: true });

  try {
    // Connect to MongoDB
    await client.connect();

    // Get the admin database
    const adminDb = client.db("admin");

    // Create the admin user
    await adminDb.command({
      createUser: "admin",
      pwd: process.env.DB_ADMIN_PWD, // Use environment variable for password
      roles: [{ role: "userAdminAnyDatabase", db: "admin" }],
    });

    // Create the icarewellbeingdb database
    const icareDb = client.db("icarewellbeingdb");

    // Create the restricted user
    await icareDb.command({
      createUser: "icare",
      pwd: process.env.DB_USER_PWD, // Use environment variable for password
      roles: [
        { role: "readWrite", db: "icarewellbeingdb" },
        { role: "dbAdmin", db: "icarewellbeingdb" },
      ],
    });
  } catch (err) {
    console.error("Error creating users:", err);
  } finally {
    // Close the connection
    await client.close();
  }
}

// Run the function
createUsers();