import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

/**
 * Execute a SQL query against the Oracle database using SQLclScript.sh
 * @param sqlQuery - The SQL query to execute
 * @param params - Optional parameters for parameterized queries
 * @returns Promise with query results
 */
export async function executeQuery(sqlQuery: string, params: any[] = []): Promise<any[]> {
  try {
    let processedQuery = sqlQuery;
    
    if (params && params.length > 0) {
      let paramIndex = 0;
      let hasLargeStrings = false;
      let clobVariables: string[] = [];
      
      // First pass: identify large strings and prepare CLOB variables
      const processedParams = params.map((param, index) => {
        if (typeof param === 'string' && param.length > 4000) {
          hasLargeStrings = true;
          const varName = `v_clob_${index}`;
          clobVariables.push(`${varName} CLOB := '${param.replace(/'/g, "''")}'`);
          return varName;
        }
        return param;
      });
      
      // If we have large strings, use Oracle's XMLType to handle them
      if (hasLargeStrings) {
        processedQuery = sqlQuery.replace(/\?/g, () => {
          if (paramIndex < processedParams.length) {
            const param = processedParams[paramIndex++];
            if (typeof param === 'string' && param.startsWith('v_clob_')) {
              const originalParam = params[paramIndex - 1];
              if (typeof originalParam === 'string' && originalParam.length > 4000) {
                // Use XMLType to handle large strings
                const base64Data = Buffer.from(originalParam).toString('base64');
                return `XMLType('<![CDATA[' || UTL_RAW.CAST_TO_VARCHAR2(UTL_ENCODE.BASE64_DECODE(UTL_RAW.CAST_TO_RAW('${base64Data}'))) || ']]>').getClobVal()`;
              }
            }
            // Handle other parameter types
            if (param === null || param === undefined) {
              return 'NULL';
            } else if (typeof param === 'string') {
              return `'${param.replace(/'/g, "''")}'`;
            } else if (typeof param === 'number') {
              return param.toString();
            } else if (typeof param === 'boolean') {
              return param ? '1' : '0';
            } else {
              const stringParam = String(param);
              return `'${stringParam.replace(/'/g, "''")}'`;
            }
          }
          return '?';
        });
      } else {
        // Normal parameter replacement for smaller strings
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
              const stringParam = String(param);
              return `'${stringParam.replace(/'/g, "''")}'`;
            }
          }
          return '?'; // Leave unmatched placeholders as-is
        });
      }
    }
    
    console.log('🔍 Executing Oracle Database Query (first 500 chars):', processedQuery.substring(0, 500));
    console.log('📊 Query length:', processedQuery.length);
    console.log('📝 Original params count:', params.length);
    
    // Log parameter info without exposing full content
    params.forEach((param, index) => {
      const paramType = typeof param;
      const paramLength = param ? String(param).length : 0;
      console.log(`   Param ${index}: ${paramType}, length: ${paramLength}`);
    });
    
    // For complex queries with JSON paths, write to temp file to avoid shell parsing issues
    let result;
    if (processedQuery.includes('JSON_TABLE') || processedQuery.includes('$[*]') || processedQuery.includes('$.schedule[*]')) {
      const tempFile = join(process.cwd(), 'temp_query.sql');
      writeFileSync(tempFile, `SET SQLFORMAT JSON-FORMATTED\nset feedback off\nset long 10000000\nset pagesize 0\nset linesize 32767\nset wrap off\nset trimout on\nset trimspool on\nSET DEFINE OFF\n${processedQuery};\ncommit;`);
      
      const command = `sql -S RAGUSER/WelcomeRAG123###@129.213.106.172/RAG23ai_PDB1.sub08201532330.philfnvcn.oraclevcn.com @${tempFile}`;
      console.log('🚀 Executing complex query from temp file');
      console.log('📊 Query length:', processedQuery.length);
      
      result = await execAsync(command);
      
      // Clean up temp file
      try {
        unlinkSync(tempFile);
      } catch (err) {
        console.warn('Warning: Could not delete temp file:', err);
      }
    } else {
      // Use SQLclScript.sh for simple queries
      const command = `bash ./SQLclScript.sh "${processedQuery.replace(/"/g, '\\"')}"`;
      console.log('🚀 Executing command (first 200 chars):', command.substring(0, 200));
      console.log('📊 Query length:', processedQuery.length);
      
      result = await execAsync(command);
    }
    
    const stdout = result.stdout;
    const stderr = result.stderr;

if (stderr) {
  console.error('❌ Database query error:', stderr);
  console.error('❌ Failed query (first 500 chars):', processedQuery.substring(0, 500));
  throw new Error(`Database error: ${stderr}`);
}

console.log('✅ Database query executed successfully');
console.log('📤 Output length:', stdout.length);
console.log('📤 Raw output:', truncateJSON(stdout));
    
    // Check if this is an INSERT/UPDATE/DELETE query that doesn't return data
    const isModifyingQuery = /^\s*(INSERT|UPDATE|DELETE|COMMIT|ROLLBACK)/i.test(processedQuery.trim());
    
    if (isModifyingQuery) {
      console.log('🔄 This is a modifying query (INSERT/UPDATE/DELETE), returning success indicator');
      return [{ success: true, operation: 'modify', output: stdout.trim() }];
    }
    
    // Parse JSON response for SELECT queries
    try {
      if (/Error/.test(stdout)) {
        throw new Error('SQL Error: ' + stdout);
      }
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
      console.log('Raw output (truncated):', truncateJSON(stdout));
      
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
      if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
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
      const datePart = date.toISOString().split('T')[0];
      return datePart || oracleDate;
    }
    
    return oracleDate; // Return as-is if we can't parse it
  } catch (error) {
    console.error('Error formatting Oracle date:', error);
    return oracleDate;
  }
}

/**
 * Utility function to truncate JSON for logging purposes
 * @param obj - The object to stringify and truncate
 * @param maxLength - Maximum length of the returned string (default: 1000)
 * @returns Truncated JSON string
 */
export function truncateJSON(obj: any, maxLength: number = 1000): string {
  const jsonStr = JSON.stringify(obj, null, 2);
  if (jsonStr.length <= maxLength) {
    return jsonStr;
  }
  return jsonStr.substring(0, maxLength) + '...[TRUNCATED]';
}
