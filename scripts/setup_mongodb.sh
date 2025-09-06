#!/bin/bash

# MongoDB connection details
MONGO_URI="mongodb://localhost:27017"
ADMIN_DB="admin"
ADMIN_USER="admin"
ADMIN_PWD="admin@A!11" # Replace with a secure password
DB_NAME="icarewellbeingdb"
DB_USER="icare"
DB_USER_PWD="user@A!!@@2" # Replace with a secure password

# Function to execute MongoDB commands
execute_mongo_command() {
  local command="$1"
  mongo --quiet --eval "$command"
}

# Step 1: Create the admin user
echo "Creating admin user..."
execute_mongo_command "
  db = db.getSiblingDB('$ADMIN_DB');
  db.createUser({
    user: '$ADMIN_USER',
    pwd: '$ADMIN_PWD',
    roles: [{ role: 'userAdminAnyDatabase', db: '$ADMIN_DB' }]
  });
"
echo "Admin user created successfully."

# Step 2: Enable authentication
echo "Enabling authentication..."
sudo sed -i '/^security:/d' /etc/mongod.conf # Remove existing security section
echo "security:
  authorization: enabled" | sudo tee -a /etc/mongod.conf > /dev/null
sudo systemctl restart mongodb
echo "Authentication enabled."

# Step 3: Create the database and restricted user
echo "Creating database and restricted user..."
execute_mongo_command "
  db = db.getSiblingDB('$DB_NAME');
  db.createUser({
    user: '$DB_USER',
    pwd: '$DB_USER_PWD',
    roles: [
      { role: 'readWrite', db: '$DB_NAME' },
      { role: 'dbAdmin', db: '$DB_NAME' }
    ]
  });
"
echo "Database '$DB_NAME' and restricted user '$DB_USER' created successfully."

echo "MongoDB setup completed successfully."

# Step 4: Navigate to the project directory and install dependencies
echo "Changing directory to therapyGlow..."
cd .. || { echo "Directory not found. Exiting..."; exit 1; }

echo "Installing dependencies..."
npm install || { echo "Failed to install dependencies. Exiting..."; exit 1; }

echo "Building the project..."
npm run build || { echo "Failed to build the project. Exiting..."; exit 1; }

# Step 5: Restart PM2 processes
echo "Restarting PM2 processes..."
pm2 restart 0 || echo "PM2 process 0 not found. Continuing..."
pm2 restart 1 || echo "PM2 process 1 not found. Continuing..."

echo "Setup completed successfully."