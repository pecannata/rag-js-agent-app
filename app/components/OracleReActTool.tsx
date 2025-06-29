"use client";

import { useState } from "react";

interface OracleReActToolProps {
  cohereApiKey: string;
  onSqlResult: (result: string) => void;
  onUserContext?: (context: string) => void;
}

export default function OracleReActTool({ cohereApiKey, onSqlResult, onUserContext }: OracleReActToolProps) {
  const [sqlQuery, setSqlQuery] = useState("");
  const [userContext, setUserContext] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [queryResult, setQueryResult] = useState("");
  const [reactDecision, setReactDecision] = useState<{
    approved: boolean;
    explanation: string;
  } | null>(null);

  const executeReActDecision = async () => {
    if (!sqlQuery.trim() || !userContext.trim() || !cohereApiKey) {
      alert("Please provide both context and SQL query, and ensure API key is configured.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setQueryResult("");
    setReactDecision(null);

    try {
      // Step 1: Ask ReAct to make the decision
      setProgress(20);

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

      const reactResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: reactPrompt,
          apiKey: cohereApiKey,
        }),
      });

      if (!reactResponse.ok) {
        throw new Error("Failed to get ReAct decision");
      }

      const reactData = await reactResponse.json();
      const responseText = reactData.response.toLowerCase().trim();

      const isApproved = responseText.startsWith('yes');
      setReactDecision({
        approved: isApproved,
        explanation: reactData.response
      });

      setProgress(50);

      // Step 2: Execute query ONLY if approved
      if (isApproved) {
        await executeDatabaseQuery();
      } else {
        setProgress(100);
        setQueryResult("ReAct Decision: Query execution DECLINED due to context mismatch or safety concerns.");
      }

    } catch (error) {
      setQueryResult(`Error in ReAct decision: ${error.message}`);
      setProgress(100);
    }

    setIsProcessing(false);
  };

  const executeDatabaseQuery = async () => {
    try {
      setProgress(70);

      const dbResponse = await fetch("/api/oracle-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sqlQuery,
          userContext,
          apiKey: cohereApiKey
        }),
      });

      const dbData = await dbResponse.json();
      setProgress(90);

      if (dbResponse.ok) {
        const formattedResult = formatJsonResult(dbData.result);
        setQueryResult(formattedResult);
        onSqlResult(dbData.result);
      } else if (dbResponse.status === 403 && dbData.reactDecision) {
        setQueryResult(`ReAct Decision at API Level: Query execution DECLINED\n\nReason: ${dbData.reactDecision.explanation}`);
        setReactDecision({
          approved: false,
          explanation: dbData.reactDecision.explanation
        });
      } else {
        setQueryResult(`Database Error: ${dbData.error}`);
      }

      setProgress(100);
    } catch (error) {
      setQueryResult(`Database execution error: ${error.message}`);
      setProgress(100);
    }
  };

  const formatJsonResult = (result: string) => {
    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        const displayData = parsed.slice(0, 5);
        const remaining = parsed.length > 5 ? `\n... and ${parsed.length - 5} more rows` : "";
        return JSON.stringify(displayData, null, 2) + remaining;
      }
      return JSON.stringify(parsed, null, 2);
    } catch {
      return result;
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-6 mb-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Oracle Database Tool (ReAct)</h3>

      {/* Context Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Context for ReAct Decision (Required)
        </label>
        <textarea
          value={userContext}
          onChange={(e) => {
            setUserContext(e.target.value);
            onUserContext?.(e.target.value);
          }}
          placeholder="Describe what you want to accomplish (e.g., 'Find information about cars', 'Analyze movie data')"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      {/* SQL Query Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SQL Query (Required)
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
        onClick={executeReActDecision}
        disabled={!sqlQuery.trim() || !userContext.trim() || !cohereApiKey || isProcessing}
        className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? "Processing ReAct Decision..." : "Execute with ReAct"}
      </button>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>ReAct Decision & Query Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ReAct Decision Display */}
      {reactDecision && (
        <div className={`mt-4 p-3 rounded-md ${reactDecision.approved ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'} border`}>
          <div className="font-semibold mb-2">
            ReAct Decision: {reactDecision.approved ? "✅ APPROVED" : "❌ DECLINED"}
          </div>
          <div className="text-sm whitespace-pre-wrap">{reactDecision.explanation}</div>
        </div>
      )}

      {/* Query Result */}
      {queryResult && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {reactDecision?.approved ? "Database Query Result" : "Execution Status"}
          </label>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-md text-sm overflow-x-auto max-h-64 overflow-y-auto">
            {queryResult}
          </pre>
        </div>
      )}
    </div>
  );
}
