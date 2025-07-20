#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

console.log('Updating email verification status for existing users...');

// Check if users file exists
if (!fs.existsSync(USERS_FILE)) {
  console.log('No users file found at:', USERS_FILE);
  console.log('This might be normal if running on a fresh installation.');
  process.exit(0);
}

try {
  // Read current users
  const userData = fs.readFileSync(USERS_FILE, 'utf8');
  const users = JSON.parse(userData);
  
  console.log(`Found ${users.length} users in the system.`);
  
  // Update users that don't have emailVerified set or have it set to false
  let updatedCount = 0;
  
  users.forEach((user, index) => {
    if (!user.hasOwnProperty('emailVerified') || user.emailVerified === false) {
      console.log(`Updating verification status for user: ${user.email}`);
      users[index].emailVerified = true;
      
      // Remove verification tokens if they exist (no longer needed)
      if (users[index].emailVerificationToken) {
        delete users[index].emailVerificationToken;
      }
      if (users[index].emailVerificationExpires) {
        delete users[index].emailVerificationExpires;
      }
      
      updatedCount++;
    } else {
      console.log(`User ${user.email} is already verified.`);
    }
  });
  
  if (updatedCount > 0) {
    // Write updated users back to file
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log(`\n✅ Successfully updated ${updatedCount} users.`);
    console.log('All existing users can now log in without email verification.');
  } else {
    console.log('\n✅ No users needed updating - all users are already verified.');
  }
  
} catch (error) {
  console.error('❌ Error updating users:', error.message);
  process.exit(1);
}
