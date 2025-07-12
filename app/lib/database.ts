import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Execute a SQL query against the Oracle database using SQLclScript.sh
 * @param sqlQuery - The SQL query to execute
 * @param params - Optional parameters for parameterized queries
 * @returns Promise with query results
 */
export async function executeQuery(sqlQuery: string, params: any[] = []): Promise<any[]> {
  try {
    // Process parameterized queries by replacing ? with actual values
    let processedQuery = sqlQuery;
    if (params && params.length > 0) {
      let paramIndex = 0;
      processedQuery = sqlQuery.replace(/\?/g, () => {
        if (paramIndex < params.length) {
          const param = params[paramIndex++];
          // Handle different parameter types
          if (param === null || param === undefined) {
            return 'NULL';
          } else if (typeof param === 'string') {
            // Escape single quotes for SQL safety
            return `'${param.replace(/'/g, "''")}'`;
          } else if (typeof param === 'number') {
            return param.toString();
          } else if (typeof param === 'boolean') {
            return param ? '1' : '0';
          } else {
            return `'${String(param).replace(/'/g, "''")}'`;
          }
        }
        return '?'; // Leave unmatched placeholders as-is
      });
    }
    
    console.log('🔍 Executing Oracle Database Query:', processedQuery);
    
    // Execute the SQLclScript.sh with the SQL query
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${processedQuery.replace(/"/g, '\\"')}"`);
    
    if (stderr) {
      console.error('❌ Database query error:', stderr);
      throw new Error(`Database error: ${stderr}`);
    }
    
    console.log('✅ Database query executed successfully');
    
    // Parse JSON response
    try {
      const jsonData = JSON.parse(stdout);
      
      // Extract the actual data from Oracle's JSON format
      if (jsonData.results && jsonData.results[0] && jsonData.results[0].items) {
        return jsonData.results[0].items;
      } else if (Array.isArray(jsonData)) {
        return jsonData;
      } else {
        return [jsonData];
      }
    } catch (parseError) {
      console.error('❌ Failed to parse database response as JSON:', parseError);
      console.log('Raw output:', stdout);
      
      // If not JSON, try to handle it as raw text
      if (stdout.trim()) {
        return [{ raw_output: stdout.trim() }];
      }
      return [];
    }
  } catch (error) {
    console.error('❌ Database execution error:', error);
    throw new Error(`Database execution failed: ${(error as Error).message}`);
  }
}

/**
 * Execute a simple test query to check database connectivity
 * @returns Promise with boolean indicating connection status
 */
export async function testConnection(): Promise<boolean> {
  try {
    await executeQuery('SELECT 1 FROM dual');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

/**
 * Execute a query and return a single row
 * @param sqlQuery - The SQL query to execute
 * @param params - Optional parameters for parameterized queries
 * @returns Promise with single row result or null
 */
export async function executeQuerySingle(sqlQuery: string, params: any[] = []): Promise<any | null> {
  const results = await executeQuery(sqlQuery, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute a query and return the count of affected rows
 * @param sqlQuery - The SQL query to execute (INSERT, UPDATE, DELETE)
 * @param params - Optional parameters for parameterized queries
 * @returns Promise with number of affected rows
 */
export async function executeUpdate(sqlQuery: string, params: any[] = []): Promise<number> {
  try {
    const results = await executeQuery(sqlQuery, params);
    // For INSERT/UPDATE/DELETE queries, Oracle typically returns the number of affected rows
    if (results && results[0] && typeof results[0].count !== 'undefined') {
      return results[0].count;
    }
    // If no specific count is returned, assume success means 1 row affected
    return 1;
  } catch (error) {
    console.error('❌ Update query failed:', error);
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction-like manner
 * @param queries - Array of objects with sqlQuery and params
 * @returns Promise with array of results
 */
export async function executeTransaction(queries: { sqlQuery: string; params?: any[] }[]): Promise<any[]> {
  const results = [];
  
  for (const query of queries) {
    try {
      const result = await executeQuery(query.sqlQuery, query.params || []);
      results.push(result);
    } catch (error) {
      console.error('❌ Transaction failed at query:', query.sqlQuery);
      throw error;
    }
  }
  
  return results;
}

/**
 * Format Oracle date strings to JavaScript Date format (YYYY-MM-DD)
 * @param oracleDate - Oracle date string (e.g., "25-OCT-16")
 * @returns Formatted date string
 */
export function formatOracleDate(oracleDate: string): string {
  if (!oracleDate) return '';
  
  try {
    // Handle different Oracle date formats
    if (oracleDate.includes('-')) {
      const parts = oracleDate.split('-');
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1];
        const year = parts[2];
        
        // Convert month name to number
        const monthMap: { [key: string]: string } = {
          'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
          'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
          'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
        };
        
        const monthNum = monthMap[month.toUpperCase()] || '01';
        const fullYear = year.length === 2 ? '20' + year : year;
        
        return `${fullYear}-${monthNum}-${day}`;
      }
    }
    
    // If it's already in a good format, try to parse and reformat
    const date = new Date(oracleDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return oracleDate; // Return as-is if we can't parse it
  } catch (error) {
    console.error('Error formatting Oracle date:', error);
    return oracleDate;
  }
}
