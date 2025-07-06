import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

interface User {
  id: string
  email: string
  password: string
  createdAt: string
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
    // Create initial users file with test user and admin user
    const initialUsers: User[] = [
      {
        id: '1',
        email: 'test@example.com',
        password: '$2b$12$fSSrN2c9kU2iNu1wCXMQcOeQQu13/Ar17qtPJkIASho7opFgvbGNi', // 'password123'
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        email: 'phil.cannata@yahoo.com',
        password: '$2b$12$fSSrN2c9kU2iNu1wCXMQcOeQQu13/Ar17qtPJkIASho7opFgvbGNi', // 'password123'
        createdAt: new Date().toISOString()
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

// Create new user
export async function createUser(email: string, password: string): Promise<User | null> {
  const users = loadUsers()
  
  // Check if user already exists
  if (users.find(user => user.email === email)) {
    return null // User already exists
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12)
  
  // Create new user
  const newUser: User = {
    id: Date.now().toString(),
    email,
    password: hashedPassword,
    createdAt: new Date().toISOString()
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
