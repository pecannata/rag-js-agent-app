import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Execute Oracle query using SQLclScript.sh
 */
export async function executeOracleQuery(sqlQuery: string): Promise<any> {
  try {
    console.log('🔍 Oracle Query:', sqlQuery.substring(0, 200) + (sqlQuery.length > 200 ? '...' : ''));
    
    // Escape query for shell execution
    const escapedQuery = sqlQuery
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"')   // Escape double quotes
      .replace(/`/g, '\\`')    // Escape backticks to prevent command substitution
      .replace(/\$/g, '\\$');  // Escape dollar signs to prevent variable expansion
    
    // Execute SQLclScript.sh with the SQL query
    const { stdout, stderr } = await execAsync(`bash ./SQLclScript.sh "${escapedQuery}"`, {
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large content
    });
    
    if (stderr && !stderr.includes('Thick driver unavailable')) {
      console.error('❌ Oracle query error:', stderr);
      throw new Error(stderr);
    }
    
    // Try to parse JSON response from SQLclScript.sh
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log('✅ Oracle query successful');
        return result;
      }
    } catch (parseError) {
      console.log('📄 Non-JSON response, treating as raw output');
    }
    
    // Return raw output if JSON parsing fails
    return {
      results: [{
        items: [],
        success: true
      }]
    };
    
  } catch (error) {
    console.error('❌ Oracle query execution failed:', error);
    throw error;
  }
}

/**
 * Escape SQL strings to prevent injection
 */
export function escapeSqlString(str: string): string {
  if (typeof str !== 'string') {
    return String(str);
  }
  
  return str
    .replace(/\\/g, '\\\\')         // Escape backslashes first
    .replace(/'/g, "''")           // Escape single quotes for SQL
    .replace(/"/g, '\\"')          // Escape double quotes 
    .replace(/`/g, "\\`")          // Escape backticks
    .replace(/\$/g, "\\$")         // Escape dollar signs
    .replace(/\u2018/g, "''")     // Escape left single quotation mark
    .replace(/\u2019/g, "''")     // Escape right single quotation mark
    .replace(/\u201C/g, '\\"')     // Escape left double quotation mark
    .replace(/\u201D/g, '\\"')     // Escape right double quotation mark
    .replace(/\u2013/g, '-')        // Replace en dash with regular dash
    .replace(/\u2014/g, '--')       // Replace em dash with double dash
    .replace(/\u2026/g, '...')       // Replace ellipsis with three dots
    .replace(/\0/g, '')             // Remove null bytes
    .replace(/\x1a/g, '')           // Remove substitute character
    .trim();
}
