import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { ChatCohere } from "@langchain/cohere";
import { HumanMessage } from "@langchain/core/messages";

export async function POST(request: NextRequest) {
  try {
    const { sqlQuery, userContext, apiKey } = await request.json();

    if (!sqlQuery) {
      return NextResponse.json(
        { error: "SQL query is required" },
        { status: 400 }
      );
    }

    // ReAct validation - if userContext and apiKey are provided, validate the query
    if (userContext && apiKey) {
      const model = new ChatCohere({
        apiKey: apiKey,
        model: "command-r-plus",
        temperature: 0.7,
      });

      const reactPrompt = `You are a ReAct (Reasoning and Acting) agent. You must decide whether to execute a SQL query based on context relevance.

USER CONTEXT: "${userContext}"
SQL QUERY: "${sqlQuery}"

EVALUATION CRITERIA:
1. CONTEXT RELEVANCE: Does the SQL query relate to the user's stated context?
   - If context is about "cars" but query is about movies/customers, this is IRRELEVANT
   - If context is about "movies" but query is about cars/vehicles, this is IRRELEVANT
2. SAFETY: Is this a safe read-only query (SELECT only)?
3. SYNTAX: Is the query well-formed?

STRICT RULES:
- If context and query topics don't match, respond "NO"
- If query contains INSERT, UPDATE, DELETE, DROP, ALTER, respond "NO"
- Only respond "YES" if context and query are clearly related

Start your response with either "YES" or "NO" followed by your reasoning.`;

      try {
        const reactResponse = await model.invoke([new HumanMessage(reactPrompt)]);
        const responseText = reactResponse.content.toString().toLowerCase().trim();
        
        if (!responseText.startsWith('yes')) {
          return NextResponse.json({
            error: "ReAct Decision: Query execution DECLINED",
            reactDecision: {
              approved: false,
              explanation: reactResponse.content.toString()
            },
            userContext,
            sqlQuery
          }, { status: 403 });
        }
      } catch (error) {
        console.error("ReAct decision error:", error);
        return NextResponse.json({
          error: "ReAct validation failed",
          details: error.message
        }, { status: 500 });
      }
    }

    // Function to execute SQL using the bash script
    const executeSQL = async (query: string) => {
      const scriptPath = path.join(process.cwd(), "..", "SQLclScript.sh");
      const execPromise = promisify(exec);
      
      // Escape the query to handle special characters and spaces
      const escapedQuery = query.replace(/"/g, '\\"');
      const command = `bash "${scriptPath}" "${escapedQuery}"`;
      
      try {
        const { stdout, stderr } = await execPromise(command, {
          timeout: 30000, // 30 second timeout
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        
        if (stderr) {
          console.error("SQL execution stderr:", stderr);
        }
        
        return stdout;
      } catch (error) {
        console.error("SQL execution error:", error);
        throw new Error(`Database query failed: ${error.message}`);
      }
    };

    // Execute the SQL query
    const result = await executeSQL(sqlQuery);
    
    // Log the result to terminal (server-side console)
    console.log("=== Oracle Database Query Result ===");
    console.log("Query:", sqlQuery);
    console.log("Result:", result);
    console.log("=====================================");

    return NextResponse.json({ 
      result: result,
      query: sqlQuery,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error in Oracle DB API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute database query" },
      { status: 500 }
    );
  }
}
