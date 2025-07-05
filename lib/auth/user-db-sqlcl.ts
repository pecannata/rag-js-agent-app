import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface UserData {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
}

// Execute Oracle query using SQLclScript.sh
async function executeSQLclQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Clerk Auth DB Query:', sqlQuery.substring(0, 100) + '...');
    
    // Execute the SQLclScript.sh with the SQL query
    const { stdout, stderr } = await execAsync(`bash ../SQLclScript.sh "${sqlQuery.replace(/"/g, '\\"')}"`);
    
    if (stderr) {
      console.error('❌ Auth database query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Auth database query executed successfully');
    
    // Parse JSON response
    try {
      const jsonData = JSON.parse(stdout);
      return { success: true, data: jsonData };
    } catch (parseError) {
      // If not JSON, return raw output
      return { success: true, data: stdout };
    }
  } catch (error) {
    console.error('❌ Auth database execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Helper to generate UUID (since we can't use crypto.randomUUID in some environments)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class UserDatabase {
  static async createUser(userData: {
    clerkUserId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<UserData> {
    const id = generateUUID();
    const now = new Date().toISOString();
    
    const sql = `
      INSERT INTO RAG_AUTH_USERS 
      (id, clerk_user_id, email, first_name, last_name, is_active, created_at, updated_at) 
      VALUES (
        '${id}', 
        '${userData.clerkUserId}', 
        '${userData.email}', 
        ${userData.firstName ? `'${userData.firstName}'` : 'NULL'}, 
        ${userData.lastName ? `'${userData.lastName}'` : 'NULL'}, 
        1, 
        TIMESTAMP '${now}', 
        TIMESTAMP '${now}'
      )
    `;
    
    const result = await executeSQLclQuery(sql);
    
    if (!result.success) {
      throw new Error(`Failed to create user: ${result.error}`);
    }
    
    return {
      id,
      clerkUserId: userData.clerkUserId,
      email: userData.email,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      isActive: true,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      lastLogin: null,
    };
  }

  static async getUserByClerkId(clerkUserId: string): Promise<UserData | null> {
    const sql = `
      SELECT id, clerk_user_id, email, first_name, last_name, is_active, 
             created_at, updated_at, last_login 
      FROM RAG_AUTH_USERS 
      WHERE clerk_user_id = '${clerkUserId}'
    `;
    
    const result = await executeSQLclQuery(sql);
    
    if (!result.success) {
      throw new Error(`Failed to get user: ${result.error}`);
    }
    
    // Check if we have data and it's an array with results
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      const row = result.data[0];
      return {
        id: row.ID || row.id,
        clerkUserId: row.CLERK_USER_ID || row.clerk_user_id,
        email: row.EMAIL || row.email,
        firstName: row.FIRST_NAME || row.first_name,
        lastName: row.LAST_NAME || row.last_name,
        isActive: (row.IS_ACTIVE || row.is_active) === 1,
        createdAt: new Date(row.CREATED_AT || row.created_at),
        updatedAt: new Date(row.UPDATED_AT || row.updated_at),
        lastLogin: row.LAST_LOGIN || row.last_login ? new Date(row.LAST_LOGIN || row.last_login) : null,
      };
    }
    
    return null;
  }

  static async updateUser(clerkUserId: string, updates: {
    email?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void> {
    const setParts = [];
    
    if (updates.email) {
      setParts.push(`email = '${updates.email}'`);
    }
    
    if (updates.firstName !== undefined) {
      setParts.push(`first_name = ${updates.firstName ? `'${updates.firstName}'` : 'NULL'}`);
    }
    
    if (updates.lastName !== undefined) {
      setParts.push(`last_name = ${updates.lastName ? `'${updates.lastName}'` : 'NULL'}`);
    }
    
    if (setParts.length > 0) {
      setParts.push(`updated_at = TIMESTAMP '${new Date().toISOString()}'`);
      
      const sql = `
        UPDATE RAG_AUTH_USERS 
        SET ${setParts.join(', ')} 
        WHERE clerk_user_id = '${clerkUserId}'
      `;
      
      const result = await executeSQLclQuery(sql);
      
      if (!result.success) {
        throw new Error(`Failed to update user: ${result.error}`);
      }
    }
  }

  static async updateLastLogin(clerkUserId: string): Promise<void> {
    const now = new Date().toISOString();
    
    const sql = `
      UPDATE RAG_AUTH_USERS 
      SET last_login = TIMESTAMP '${now}', updated_at = TIMESTAMP '${now}' 
      WHERE clerk_user_id = '${clerkUserId}'
    `;
    
    const result = await executeSQLclQuery(sql);
    
    if (!result.success) {
      throw new Error(`Failed to update last login: ${result.error}`);
    }
  }

  static async logUserActivity(clerkUserId: string, activity: {
    type: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    // First get the user to get their internal ID
    const user = await this.getUserByClerkId(clerkUserId);
    if (!user) {
      console.warn(`User ${clerkUserId} not found, skipping activity log`);
      return;
    }
    
    const activityId = generateUUID();
    const now = new Date().toISOString();
    const detailsJson = activity.details ? JSON.stringify(activity.details).replace(/'/g, "''") : null;
    
    const sql = `
      INSERT INTO RAG_AUTH_USER_ACTIVITY 
      (id, user_id, clerk_user_id, activity_type, activity_details, ip_address, user_agent, created_at) 
      VALUES (
        '${activityId}', 
        '${user.id}', 
        '${clerkUserId}', 
        '${activity.type}', 
        ${detailsJson ? `'${detailsJson}'` : 'NULL'}, 
        ${activity.ipAddress ? `'${activity.ipAddress}'` : 'NULL'}, 
        ${activity.userAgent ? `'${activity.userAgent.replace(/'/g, "''")}'` : 'NULL'}, 
        TIMESTAMP '${now}'
      )
    `;
    
    const result = await executeSQLclQuery(sql);
    
    if (!result.success) {
      throw new Error(`Failed to log activity: ${result.error}`);
    }
  }

  // Helper method to test if SQLclScript.sh is available
  static async testConnection(): Promise<boolean> {
    try {
      const testSql = "SELECT 'connection_test' as test FROM dual";
      const result = await executeSQLclQuery(testSql);
      return result.success;
    } catch (error) {
      console.error('SQLclScript.sh connection test failed:', error);
      return false;
    }
  }
}
