import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface DatabaseResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
  formattedJson?: string;
}

export interface DatabaseProgress {
  stage: string;
  progress: number;
  message: string;
}

/**
 * Execute SQL query using the SQLclScript.sh script
 */
export async function executeSQLQuery(
  sqlQuery: string, 
  onProgress?: (progress: DatabaseProgress) => void
): Promise<DatabaseResult> {
  const startTime = Date.now();
  
  try {
    // Report progress - preparation
    onProgress?.({
      stage: 'preparation',
      progress: 10,
      message: 'Preparing SQL query...'
    });

    // Validate SQL query
    if (!sqlQuery || sqlQuery.trim().length === 0) {
      throw new Error('SQL query cannot be empty');
    }

    // Clean up the SQL query - remove trailing semicolons and normalize
    const cleanQuery = sqlQuery.trim().replace(/;+$/, '');
    
    // Report progress - connection
    onProgress?.({
      stage: 'connection',
      progress: 30,
      message: 'Connecting to Oracle database...'
    });

    // Path to the SQLclScript.sh (assuming it's in the parent directory)
    const scriptPath = path.resolve(process.cwd(), '..', 'SQLclScript.sh');
    
    // Report progress - execution
    onProgress?.({
      stage: 'execution',
      progress: 60,
      message: 'Executing SQL query...'
    });

    // Execute the script with the SQL query
    // Note: We need to properly escape the query for shell execution
    const { stdout, stderr } = await execAsync(`bash "${scriptPath}" "${cleanQuery}"`);

    // Report progress - processing
    onProgress?.({
      stage: 'processing',
      progress: 80,
      message: 'Processing results...'
    });

    if (stderr && stderr.trim().length > 0) {
      console.warn('SQL execution warning:', stderr);
    }

    // Parse the JSON output
    let parsedData;
    let formattedJson = '';
    
    try {
      // The script returns JSON-formatted output
      if (stdout && stdout.trim().length > 0) {
        parsedData = JSON.parse(stdout);
        formattedJson = JSON.stringify(parsedData, null, 2);
      } else {
        parsedData = { message: 'Query executed successfully but returned no data' };
        formattedJson = JSON.stringify(parsedData, null, 2);
      }
    } catch (parseError) {
      // If parsing fails, treat the raw output as the result
      parsedData = { raw_output: stdout };
      formattedJson = JSON.stringify(parsedData, null, 2);
    }

    const executionTime = Date.now() - startTime;

    // Report progress - completion
    onProgress?.({
      stage: 'completion',
      progress: 100,
      message: 'Query completed successfully'
    });

    return {
      success: true,
      data: parsedData,
      formattedJson,
      executionTime
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    
    // Report error progress
    onProgress?.({
      stage: 'error',
      progress: 100,
      message: `Database error: ${errorMessage}`
    });

    return {
      success: false,
      error: errorMessage,
      executionTime
    };
  }
}

/**
 * Format database results for terminal display
 */
export function formatDatabaseResults(result: DatabaseResult): string {
  const timestamp = new Date().toLocaleTimeString();
  
  if (result.success) {
    const successMessage = `[${timestamp}] Database query executed successfully`;
    const dataSection = result.formattedJson ? 
      `\n\n--- Query Results (JSON) ---\n${result.formattedJson}` : 
      '\n\nNo data returned';
    const timingInfo = result.executionTime ? 
      `\n\n--- Execution Time ---\n${result.executionTime}ms` : '';
    
    return `${successMessage}${dataSection}${timingInfo}`;
  } else {
    return `[${timestamp}] Database query was not run\nError: ${result.error || 'Unknown error'}`;
  }
}

/**
 * Validate SQL query for basic safety
 */
export function validateSQLQuery(query: string): { valid: boolean; message: string } {
  if (!query || query.trim().length === 0) {
    return { valid: false, message: 'SQL query cannot be empty' };
  }

  const normalizedQuery = query.trim().toLowerCase();
  
  // Basic validation - allow SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER
  const allowedStartingKeywords = [
    'select', 'insert', 'update', 'delete', 
    'create', 'drop', 'alter', 'grant', 'revoke',
    'with', 'explain', 'describe', 'show'
  ];
  
  const startsWithAllowed = allowedStartingKeywords.some(keyword => 
    normalizedQuery.startsWith(keyword)
  );
  
  if (!startsWithAllowed) {
    return { 
      valid: false, 
      message: `Query must start with one of: ${allowedStartingKeywords.join(', ')}` 
    };
  }
  
  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    /\bdrop\s+database\b/i,
    /\bshutdown\b/i,
    /\btruncate\s+table\s+(?!.*where)/i, // TRUNCATE without WHERE is dangerous
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      return { 
        valid: false, 
        message: 'Query contains potentially dangerous operations' 
      };
    }
  }
  
  return { valid: true, message: 'Query appears valid' };
}

/**
 * Extract table names from SQL query for context relevance
 */
export function extractTableNames(query: string): string[] {
  const normalizedQuery = query.toLowerCase();
  const tableNames: string[] = [];
  
  // Simple regex patterns to extract table names
  const patterns = [
    /from\s+([a-z_][a-z0-9_]*)/gi,
    /join\s+([a-z_][a-z0-9_]*)/gi,
    /update\s+([a-z_][a-z0-9_]*)/gi,
    /insert\s+into\s+([a-z_][a-z0-9_]*)/gi,
    /delete\s+from\s+([a-z_][a-z0-9_]*)/gi,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(normalizedQuery)) !== null) {
      const tableName = match[1];
      if (tableName && !tableNames.includes(tableName)) {
        tableNames.push(tableName);
      }
    }
  });
  
  return tableNames;
}

/**
 * Process database results to remove duplicates and create clean JSON structure for LLM
 */
export function processUniqueEmployeeData(dbResult: any): any {
  try {
    // Handle different possible data structures
    let items = [];
    let columns = [];
    
    if (dbResult.data && dbResult.data.results && dbResult.data.results[0]) {
      items = dbResult.data.results[0].items || [];
      columns = dbResult.data.results[0].columns || [];
    } else if (dbResult.data && dbResult.data.items) {
      items = dbResult.data.items || [];
      columns = dbResult.data.columns || [];
    } else if (Array.isArray(dbResult.data)) {
      items = dbResult.data;
    }
    
    // Extract unique employee numbers
    const empNos = items
      .map(item => item.empno)
      .filter(empno => empno !== undefined && empno !== null);
    
    const uniqueEmpNos = [...new Set(empNos)].sort((a, b) => a - b);
    
    // Create clean data structure for LLM
    return {
      total_unique_employees: uniqueEmpNos.length,
      unique_employee_numbers: uniqueEmpNos,
      table_columns: columns.map(col => typeof col === 'string' ? col : col.name),
      data_summary: `Found ${uniqueEmpNos.length} unique employees in the database`
    };
    
  } catch (error) {
    console.error('Error processing employee data:', error);
    return {
      error: 'Failed to process employee data',
      message: error.message
    };
  }
}
