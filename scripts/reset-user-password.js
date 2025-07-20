#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');
const EMAIL = 'phil.cannata@yahoo.com';
const NEW_PASSWORD = 'password123';

console.log(`Resetting password for ${EMAIL}...`);

// Check if users file exists
if (!fs.existsSync(USERS_FILE)) {
  console.log('No users file found at:', USERS_FILE);
  process.exit(1);
}

async function resetPassword() {
  try {
    // Read current users
    const userData = fs.readFileSync(USERS_FILE, 'utf8');
    const users = JSON.parse(userData);
    
    console.log(`Found ${users.length} users in the system.`);
    
    // Find the user
    const userIndex = users.findIndex(user => user.email === EMAIL);
    
    if (userIndex === -1) {
      console.log(`❌ User ${EMAIL} not found.`);
      process.exit(1);
    }
    
    console.log(`Found user: ${EMAIL}`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 12);
    console.log(`New password hash: ${hashedPassword}`);
    
    // Update the user
    users[userIndex].password = hashedPassword;
    users[userIndex].emailVerified = true; // Ensure still verified
    
    // Write updated users back to file
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log(`✅ Successfully reset password for ${EMAIL}.`);
    console.log(`New password: ${NEW_PASSWORD}`);
    
    // Verify the password works
    const passwordMatch = await bcrypt.compare(NEW_PASSWORD, hashedPassword);
    console.log(`🔍 Password verification: ${passwordMatch ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    process.exit(1);
  }
}

resetPassword();
