import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

interface User {
  id: string
  email: string
  password: string
  createdAt: string
  emailVerified: boolean
  emailVerificationToken?: string
  emailVerificationExpires?: string
}

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json')

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(USERS_FILE)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Load users from file
function loadUsers(): User[] {
  ensureDataDir()
  
  if (!fs.existsSync(USERS_FILE)) {
    // Create initial users file with test user and admin user (pre-verified for convenience)
    const initialUsers: User[] = [
      {
        id: '1',
        email: 'test@example.com',
        password: '$2b$12$fSSrN2c9kU2iNu1wCXMQcOeQQu13/Ar17qtPJkIASho7opFgvbGNi', // 'password123'
        createdAt: new Date().toISOString(),
        emailVerified: true // Pre-verified test user
      },
      {
        id: '2',
        email: 'phil.cannata@yahoo.com',
        password: '$2b$12$fSSrN2c9kU2iNu1wCXMQcOeQQu13/Ar17qtPJkIASho7opFgvbGNi', // 'password123'
        createdAt: new Date().toISOString(),
        emailVerified: true // Pre-verified admin user
      }
    ]
    saveUsers(initialUsers)
    return initialUsers
  }
  
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error loading users:', error)
    return []
  }
}

// Save users to file
function saveUsers(users: User[]) {
  ensureDataDir()
  
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
  } catch (error) {
    console.error('Error saving users:', error)
  }
}

// Get all users
export function getUsers(): User[] {
  return loadUsers()
}

// Find user by email
export function findUserByEmail(email: string): User | null {
  const users = loadUsers()
  return users.find(user => user.email === email) || null
}

// Generate verification token
function generateVerificationToken(): string {
  return require('crypto').randomBytes(32).toString('hex')
}

// Create new user with email verification
export async function createUser(email: string, password: string): Promise<User | null> {
  const users = loadUsers()
  
  // Check if user already exists
  if (users.find(user => user.email === email)) {
    return null // User already exists
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12)
  
  // Generate verification token and expiry
  const verificationToken = generateVerificationToken()
  const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  
  // Create new user (unverified)
  const newUser: User = {
    id: Date.now().toString(),
    email,
    password: hashedPassword,
    createdAt: new Date().toISOString(),
    emailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires.toISOString()
  }
  
  users.push(newUser)
  saveUsers(users)
  
  return newUser
}

// Verify user password
export async function verifyUser(email: string, password: string): Promise<User | null> {
  const user = findUserByEmail(email)
  
  if (!user) {
    return null
  }
  
  const passwordMatch = await bcrypt.compare(password, user.password)
  
  if (passwordMatch) {
    return user
  }
  
  return null
}

// Delete user
export function deleteUser(email: string): boolean {
  const users = loadUsers()
  const userIndex = users.findIndex(user => user.email === email)
  
  if (userIndex === -1) {
    return false
  }
  
  users.splice(userIndex, 1)
  saveUsers(users)
  return true
}

// Update user password
export async function updateUserPassword(email: string, newPassword: string): Promise<boolean> {
  const users = loadUsers()
  const userIndex = users.findIndex(user => user.email === email)
  
  if (userIndex === -1) {
    return false
  }
  
  const user = users[userIndex];
  if (!user) {
    return false;
  }
  
  const hashedPassword = await bcrypt.hash(newPassword, 12)
  user.password = hashedPassword
  saveUsers(users)
  return true
}

// Find user by verification token
export function findUserByVerificationToken(token: string): User | null {
  const users = loadUsers()
  return users.find(user => user.emailVerificationToken === token) || null
}

// Verify user email
export function verifyUserEmail(token: string): boolean {
  const users = loadUsers()
  const userIndex = users.findIndex(user => 
    user.emailVerificationToken === token &&
    user.emailVerificationExpires &&
    new Date(user.emailVerificationExpires) > new Date()
  )
  
  if (userIndex === -1) {
    return false // Token not found or expired
  }
  
  const user = users[userIndex]
  if (!user) {
    return false
  }
  
  // Mark as verified and remove verification token
  user.emailVerified = true
  delete user.emailVerificationToken
  delete user.emailVerificationExpires
  
  saveUsers(users)
  return true
}

// Resend verification email (generate new token)
export function regenerateVerificationToken(email: string): string | null {
  const users = loadUsers()
  const userIndex = users.findIndex(user => user.email === email)
  
  if (userIndex === -1) {
    return null
  }
  
  const user = users[userIndex]
  if (!user) {
    return null
  }
  
  if (user.emailVerified) {
    return null // Already verified
  }
  
  // Generate new verification token and expiry
  const newToken = generateVerificationToken()
  const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
  
  user.emailVerificationToken = newToken
  user.emailVerificationExpires = newExpiry.toISOString()
  
  saveUsers(users)
  return newToken
}

// Check if user's email is verified
export function isEmailVerified(email: string): boolean {
  const user = findUserByEmail(email)
  return user?.emailVerified || false
}
