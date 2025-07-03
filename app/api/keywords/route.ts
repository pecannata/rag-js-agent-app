import { NextRequest, NextResponse } from 'next/server';
import { ChatCohere } from '@langchain/cohere';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Execute Oracle query and return results
async function executeOracleQuery(sqlQuery: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    console.log('🔍 Executing Oracle query for analysis:', sqlQuery);
    
    // Execute the SQLclScript.sh with the SQL query
    const { stdout, stderr } = await execAsync(`bash ../SQLclScript.sh "${sqlQuery.replace(/"/g, '\\"')}"`);
    
    if (stderr) {
      console.error('❌ Database query error:', stderr);
      return { success: false, error: stderr };
    }
    
    console.log('✅ Database query executed successfully');
    
    // Parse JSON response
    try {
      const jsonData = JSON.parse(stdout);
      return { success: true, data: jsonData };
    } catch (parseError) {
      // If not JSON, return raw output
      return { success: true, data: stdout };
    }
  } catch (error) {
    console.error('❌ Database execution error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Get table schema information
async function getTableSchema(tableName: string): Promise<{ success: boolean; schema?: any; error?: string }> {
  try {
    console.log('🔍 Getting schema for table:', tableName);
    
    // Query to get column information
    const schemaQuery = `SELECT column_name, data_type, nullable, data_default 
                        FROM user_tab_columns 
                        WHERE table_name = UPPER('${tableName}') 
                        ORDER BY column_id`;
    
    const result = await executeOracleQuery(schemaQuery);
    return result;
  } catch (error) {
    console.error('❌ Schema query error:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Extract table names from SQL query
function extractTableNames(sqlQuery: string): string[] {
  try {
    // Simple regex to extract table names from FROM, JOIN clauses
    const fromMatch = sqlQuery.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    const joinMatch = sqlQuery.match(/JOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    
    const tables = [];
    
    if (fromMatch) {
      tables.push(...fromMatch.map(match => match.replace(/FROM\s+/i, '').trim()));
    }
    
    if (joinMatch) {
      tables.push(...joinMatch.map(match => match.replace(/JOIN\s+/i, '').trim()));
    }
    
    // Remove aliases (words after space)
    return tables.map(table => table.split(/\s+/)[0]).filter(table => table && table.length > 0);
  } catch (error) {
    console.error('Error extracting table names:', error);
    return [];
  }
}

// POST /api/keywords - Generate keywords from SQL query
export async function POST(request: NextRequest) {
  try {
    const { sqlQuery, apiKey } = await request.json();

    if (!sqlQuery) {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    // Step 1: Extract table names from the SQL query
    const tableNames = extractTableNames(sqlQuery);
    console.log('📋 Extracted tables:', tableNames);
    
    // Step 2: Get schema information for each table
    let schemaInfo = '';
    let sampleData = '';
    
    for (const tableName of tableNames.slice(0, 3)) { // Limit to first 3 tables
      try {
        // Get schema information
        const schemaResult = await getTableSchema(tableName);
        if (schemaResult.success && schemaResult.data) {
          schemaInfo += `\n\nTable: ${tableName}\nColumns: ${JSON.stringify(schemaResult.data, null, 2)}`;
        }
        
        // Get sample data (limit to 3 rows)
        const sampleQuery = `SELECT * FROM ${tableName} WHERE ROWNUM <= 3`;
        const sampleResult = await executeOracleQuery(sampleQuery);
        if (sampleResult.success && sampleResult.data) {
          sampleData += `\n\nSample data from ${tableName}:\n${JSON.stringify(sampleResult.data, null, 2)}`;
        }
      } catch (error) {
        console.warn(`Could not analyze table ${tableName}:`, error);
      }
    }
    
    const llm = new ChatCohere({
      apiKey: apiKey,
      model: 'command-r-plus',
      temperature: 0.3, // Lower temperature for more consistent keyword extraction
    });

    const prompt = `Extract and expand database column names as keywords.

SQL Query: ${sqlQuery}

Database Schema Information:${schemaInfo}

Sample Data:${sampleData}

Expand abbreviations (empno → employee number, mgr → manager, sal → salary, comm → commission, deptno → department number, hiredate → hire date, ename → employee name).

Return ONLY comma-separated keywords. No other text.`;

    console.log('🔍 Generating keywords from SQL:', sqlQuery);
    const response = await llm.invoke(prompt);
    
    // Clean up the response and extract keywords
    let keywords = [];
    try {
      // Remove extra text and extract only the comma-separated keywords
      const content = response.content as string;
      const cleanContent = content
        .replace(/^.*?based on.*?:/gi, '')
        .replace(/Here is a list of.*?:/gi, '')
        .replace(/These keywords.*$/gi, '')
        .replace(/^.*?keywords.*?:/gi, '')
        .replace(/\n/g, ' ')
        .trim();
      
      keywords = cleanContent
        .split(',')
        .map(k => k.trim())
        .filter(k => k && k.length > 1 && k.length < 50); // Filter out very long strings but no limit on count
    } catch (error) {
      console.error('Error parsing keywords:', error);
      keywords = [];
    }
    
    console.log('🎯 Generated keywords:', keywords);

    return NextResponse.json({
      success: true,
      keywords: keywords
    });
    
  } catch (error) {
    console.error('❌ Error generating keywords from SQL:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate keywords',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
