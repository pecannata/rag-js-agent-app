import oracledb from 'oracledb';

// Oracle connection pool configuration
const poolConfig = {
  user: process.env.ORACLE_USER || 'RAGUSER',
  password: process.env.ORACLE_PASSWORD || 'WelcomeRAG123###',
  connectString: process.env.ORACLE_CONNECT_STRING || '129.213.106.172/RAG23ai_PDB1.sub08201532330.philfnvcn.oraclevcn.com',
  poolMin: 2,                 // Minimum connections in pool
  poolMax: 10,                // Maximum connections in pool
  poolIncrement: 1,           // Connections added when pool is exhausted
  poolTimeout: 60,            // Idle timeout in seconds
  stmtCacheSize: 30,          // Statement cache size
  queueMax: 0,                // No limit on queue
  queueTimeout: 60000,        // Queue timeout in milliseconds
  enableStatistics: true,     // Enable pool statistics
  events: true                // Enable events
};

let pool: oracledb.Pool | null = null;

// Initialize the connection pool
export async function initializePool(): Promise<void> {
  if (pool) {
    console.log('🔄 Oracle connection pool already initialized');
    return;
  }

  try {
    console.log('🚀 Initializing Oracle connection pool...');
    
    // Set Oracle client options
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    oracledb.autoCommit = true;
    oracledb.fetchAsString = [oracledb.CLOB];
    
    pool = await oracledb.createPool(poolConfig);
    
    console.log('✅ Oracle connection pool initialized successfully');
    console.log(`📊 Pool config: min=${poolConfig.poolMin}, max=${poolConfig.poolMax}, increment=${poolConfig.poolIncrement}`);
    
    // Setup pool event handlers
    pool.on('poolCreated', () => {
      console.log('🎯 Oracle pool created');
    });
    
    pool.on('poolClosed', () => {
      console.log('🔒 Oracle pool closed');
    });
    
    pool.on('connectionRequest', () => {
      console.log('🔗 Connection requested from pool');
    });
    
    pool.on('connectionClose', () => {
      console.log('🔌 Connection returned to pool');
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize Oracle connection pool:', error);
    throw error;
  }
}

// Execute a query using the connection pool
export async function executeQuery(sql: string, binds: any[] = []): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!pool) {
    await initializePool();
  }

  let connection: oracledb.Connection | null = null;
  
  try {
    // Get connection from pool
    connection = await pool!.getConnection();
    
    console.log('🔍 Executing query:', sql.substring(0, 200) + (sql.length > 200 ? '...' : ''));
    console.log('📊 Pool stats:', await pool!.getStatistics());
    
    // Execute the query
    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchArraySize: 100,
      maxRows: 10000
    });

    console.log('✅ Query executed successfully');
    console.log('📝 Rows affected:', result.rowsAffected || 0);
    console.log('📋 Rows returned:', result.rows?.length || 0);
    
    return {
      success: true,
      data: result.rows || [],
      rowsAffected: result.rowsAffected
    };
    
  } catch (error) {
    console.error('❌ Query execution error:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  } finally {
    // Always return connection to pool
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('⚠️ Error closing connection:', error);
      }
    }
  }
}

// Get pool statistics
export async function getPoolStats(): Promise<oracledb.PoolStatistics | null> {
  if (!pool) {
    return null;
  }
  
  try {
    return await pool.getStatistics();
  } catch (error) {
    console.error('❌ Error getting pool statistics:', error);
    return null;
  }
}

// Close the connection pool
export async function closePool(): Promise<void> {
  if (!pool) {
    console.log('ℹ️ No pool to close');
    return;
  }

  try {
    console.log('🔒 Closing Oracle connection pool...');
    await pool.close(10); // 10 second timeout
    pool = null;
    console.log('✅ Oracle connection pool closed');
  } catch (error) {
    console.error('❌ Error closing connection pool:', error);
    throw error;
  }
}

// Health check
export async function healthCheck(): Promise<{ healthy: boolean; stats?: oracledb.PoolStatistics; error?: string }> {
  if (!pool) {
    return { healthy: false, error: 'Pool not initialized' };
  }

  try {
    const stats = await pool.getStatistics();
    const testResult = await executeQuery('SELECT 1 as test FROM DUAL');
    
    return {
      healthy: testResult.success,
      stats,
      error: testResult.error
    };
  } catch (error) {
    return {
      healthy: false,
      error: (error as Error).message
    };
  }
}

// Initialize pool on module load
initializePool().catch(console.error);
