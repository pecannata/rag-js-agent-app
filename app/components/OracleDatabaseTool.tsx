"use client";

import { useState } from "react";

interface OracleDatabaseToolProps {
  cohereApiKey: string;
  onSqlResult: (result: string) => void;
}

export default function OracleDatabaseTool({ cohereApiKey, onSqlResult }: OracleDatabaseToolProps) {
  const [sqlQuery, setSqlQuery] = useState("");
  const [userContext, setUserContext] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [queryResult, setQueryResult] = useState("");
  const [shouldExecute, setShouldExecute] = useState<boolean | null>(null);
  const [reactExplanation, setReactExplanation] = useState<string>("");

  const handleReActDecision = async () => {
    if (!sqlQuery.trim() || !cohereApiKey) return;

    setIsExecuting(true);
    setProgress(10);

    // Pre-filter for obvious context mismatches
    const contextKeywords = userContext.toLowerCase().split(/\s+/);
    const queryKeywords = sqlQuery.toLowerCase();
    
    const obviousMismatch = (
      (contextKeywords.includes('car') || contextKeywords.includes('cars') || contextKeywords.includes('vehicle')) &&
      (queryKeywords.includes('movie') || queryKeywords.includes('customer') || queryKeywords.includes('film'))
    ) || (
      (contextKeywords.includes('movie') || contextKeywords.includes('film')) &&
      (queryKeywords.includes('car') || queryKeywords.includes('vehicle'))
    );

    if (obviousMismatch) {
      console.log("🚫 PRE-FILTER: Context mismatch detected, blocking execution");
      setProgress(100);
      setShouldExecute(false);
      setReactExplanation(`NO - Clear context mismatch detected: User context is about "${userContext}" but SQL query appears to be about different subject matter.`);
      setQueryResult(`ReAct Decision: Query execution declined due to context mismatch.`);
      setIsExecuting(false);
      return; // This should prevent further execution
    }

    try {
      // Use ReAct to decide whether to execute the SQL query
      const reactPrompt = `
        You are a ReAct (Reasoning and Acting) agent. Analyze whether it's appropriate to execute this SQL query.

        USER CONTEXT: "${userContext}"
        SQL QUERY: "${sqlQuery}"

        CRITICAL EVALUATION CRITERIA:
        1. CONTEXT MATCH: Does the SQL query directly relate to the user context? If the context is about "cars" but the query is about "movies", this is a MISMATCH.
        2. SAFETY: Is this a safe SELECT-only query with no destructive operations (no INSERT, UPDATE, DELETE, DROP, ALTER)?
        3. QUERY STRUCTURE: Is the SQL query well-formed and syntactically correct?
        4. RELEVANCE: Would executing this query actually help achieve what the user stated in their context?

        DECISION RULES:
        - If there's a context mismatch (e.g., context about cars but query about movies), respond "NO"
        - If the query contains destructive operations, respond "NO"
        - If the query is malformed, respond "NO"
        - Only respond "YES" if ALL criteria are satisfied

        Respond with ONLY "YES" or "NO" followed by a brief explanation focusing on context relevance.
      `;

      setProgress(30);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: reactPrompt,
          apiKey: cohereApiKey,
        }),
      });

      const data = await response.json();
      setProgress(50);

      // Debug logging
      console.log("ReAct Response:", data.response);
      console.log("User Context:", userContext);
      console.log("SQL Query:", sqlQuery);

      // More robust decision parsing
      const responseText = data.response.toLowerCase();
      const startsWithYes = responseText.trim().startsWith('yes');
      const containsYes = responseText.includes('yes') && !responseText.includes('no');
      const decision = startsWithYes || (containsYes && !responseText.includes('context mismatch'));
      
      console.log("Decision breakdown:", {
        startsWithYes,
        containsYes,
        finalDecision: decision,
        responseText: responseText.substring(0, 100)
      });

      setShouldExecute(decision);
      setReactExplanation(data.response);

      if (decision) {
        // Execute the SQL query
        await executeSqlQuery();
      } else {
        setProgress(100);
        setQueryResult(`ReAct Decision: Query execution declined. Reason: ${data.response}`);
      }
    } catch (error) {
      console.error("ReAct decision error:", error);
      setQueryResult("Error in ReAct decision making.");
      setProgress(100);
    }

    setIsExecuting(false);
  };

  const executeSqlQuery = async () => {
    console.log("🔄 EXECUTING SQL QUERY - This should NOT happen if declined!");
    try {
      setProgress(70);
      
      const response = await fetch("/api/oracle-db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sqlQuery: sqlQuery,
        }),
      });

      const data = await response.json();
      setProgress(90);

      if (response.ok) {
        const formattedResult = formatJsonResult(data.result);
        setQueryResult(formattedResult);
        onSqlResult(data.result); // Pass raw result for RAG context
      } else {
        setQueryResult(`Error: ${data.error}`);
      }

      setProgress(100);
    } catch (error) {
      console.error("SQL execution error:", error);
      setQueryResult("Error executing SQL query.");
      setProgress(100);
    }
  };

  const formatJsonResult = (result: string) => {
    try {
      // Parse and format JSON for display
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        // Abbreviate if too many rows
        const displayData = parsed.slice(0, 5);
        const abbreviated = parsed.length > 5 ? `... and ${parsed.length - 5} more rows` : "";
        
        return JSON.stringify(displayData, null, 2) + (abbreviated ? `\n${abbreviated}` : "");
      }
      return JSON.stringify(parsed, null, 2);
    } catch {
      return result; // Return as-is if not valid JSON
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-6 mb-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Oracle Database Tool</h3>
      
      {/* User Context Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Context for ReAct Decision (What do you want to achieve?)
        </label>
        <textarea
          value={userContext}
          onChange={(e) => setUserContext(e.target.value)}
          placeholder="Describe what you're trying to accomplish..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      {/* SQL Query Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SQL Query
        </label>
        <textarea
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          placeholder="Enter your SQL query here..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          rows={4}
        />
      </div>

      {/* Execute Button */}
      <button
        onClick={handleReActDecision}
        disabled={!sqlQuery.trim() || !cohereApiKey || isExecuting}
        className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isExecuting ? "Processing..." : "Execute with ReAct"}
      </button>

      {/* Progress Bar */}
      {isExecuting && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Database Query Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Query Result */}
      {queryResult && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Query Result (Terminal Output)
          </label>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-md text-sm overflow-x-auto max-h-64 overflow-y-auto">
            {queryResult}
          </pre>
        </div>
      )}

      {/* ReAct Decision Display */}
      {shouldExecute !== null && (
        <div className={`mt-4 p-3 rounded-md ${shouldExecute ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <div className="font-semibold mb-2">ReAct Decision: {shouldExecute ? "✅ Approved" : "❌ Declined"}</div>
          <div className="text-sm">{reactExplanation}</div>
        </div>
      )}
    </div>
  );
}
