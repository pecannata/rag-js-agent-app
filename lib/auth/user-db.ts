import oracledb from 'oracledb';

// Initialize Oracle DB connection (adjust based on your existing DB setup)
const dbConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECTION_STRING,
};

// Check if Oracle is properly configured
function isOracleConfigured(): boolean {
  return !!(dbConfig.user && dbConfig.password && dbConfig.connectString &&
           !dbConfig.user.includes('your_') && 
           !dbConfig.password.includes('your_') &&
           !dbConfig.connectString.includes('your_'));
}

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

export class UserDatabase {
  private static async getConnection() {
    if (!isOracleConfigured()) {
      throw new Error('Oracle database not configured. Please set ORACLE_USER, ORACLE_PASSWORD, and ORACLE_CONNECTION_STRING in your environment.');
    }
    return await oracledb.getConnection(dbConfig);
  }

  static async createUser(userData: {
    clerkUserId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<UserData> {
    const connection = await this.getConnection();
    
    try {
      const id = crypto.randomUUID();
      const now = new Date();
      
      const result = await connection.execute(
        `INSERT INTO RAG_AUTH_USERS 
         (id, clerk_user_id, email, first_name, last_name, is_active, created_at, updated_at) 
         VALUES (:id, :clerkUserId, :email, :firstName, :lastName, 1, :now, :now)`,
        {
          id,
          clerkUserId: userData.clerkUserId,
          email: userData.email,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          now,
        }
      );
      
      await connection.commit();
      
      return {
        id,
        clerkUserId: userData.clerkUserId,
        email: userData.email,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        lastLogin: null,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.close();
    }
  }

  static async getUserByClerkId(clerkUserId: string): Promise<UserData | null> {
    const connection = await this.getConnection();
    
    try {
      const result = await connection.execute(
        `SELECT id, clerk_user_id, email, first_name, last_name, is_active, 
                created_at, updated_at, last_login 
         FROM RAG_AUTH_USERS 
         WHERE clerk_user_id = :clerkUserId`,
        { clerkUserId }
      );
      
      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0] as any[];
        return {
          id: row[0],
          clerkUserId: row[1],
          email: row[2],
          firstName: row[3],
          lastName: row[4],
          isActive: row[5] === 1,
          createdAt: row[6],
          updatedAt: row[7],
          lastLogin: row[8],
        };
      }
      
      return null;
    } finally {
      await connection.close();
    }
  }

  static async updateUser(clerkUserId: string, updates: {
    email?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void> {
    const connection = await this.getConnection();
    
    try {
      const setParts = [];
      const bindParams: any = { clerkUserId, updatedAt: new Date() };
      
      if (updates.email) {
        setParts.push('email = :email');
        bindParams.email = updates.email;
      }
      
      if (updates.firstName !== undefined) {
        setParts.push('first_name = :firstName');
        bindParams.firstName = updates.firstName;
      }
      
      if (updates.lastName !== undefined) {
        setParts.push('last_name = :lastName');
        bindParams.lastName = updates.lastName;
      }
      
      if (setParts.length > 0) {
        setParts.push('updated_at = :updatedAt');
        
        await connection.execute(
          `UPDATE RAG_AUTH_USERS 
           SET ${setParts.join(', ')} 
           WHERE clerk_user_id = :clerkUserId`,
          bindParams
        );
        
        await connection.commit();
      }
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.close();
    }
  }

  static async updateLastLogin(clerkUserId: string): Promise<void> {
    const connection = await this.getConnection();
    
    try {
      await connection.execute(
        `UPDATE RAG_AUTH_USERS 
         SET last_login = :now, updated_at = :now 
         WHERE clerk_user_id = :clerkUserId`,
        { 
          now: new Date(), 
          clerkUserId 
        }
      );
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.close();
    }
  }

  static async logUserActivity(clerkUserId: string, activity: {
    type: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const connection = await this.getConnection();
    
    try {
      const user = await this.getUserByClerkId(clerkUserId);
      if (!user) return;
      
      await connection.execute(
        `INSERT INTO RAG_AUTH_USER_ACTIVITY 
         (id, user_id, clerk_user_id, activity_type, activity_details, ip_address, user_agent, created_at) 
         VALUES (:id, :userId, :clerkUserId, :activityType, :activityDetails, :ipAddress, :userAgent, :now)`,
        {
          id: crypto.randomUUID(),
          userId: user.id,
          clerkUserId,
          activityType: activity.type,
          activityDetails: activity.details ? JSON.stringify(activity.details) : null,
          ipAddress: activity.ipAddress || null,
          userAgent: activity.userAgent || null,
          now: new Date(),
        }
      );
      
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.close();
    }
  }
}
