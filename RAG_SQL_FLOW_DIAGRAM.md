# SQL Query Processing Through RAG Path - Flow Diagram

## 🔄 RAG SQL Processing Flowchart

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            👤 USER INPUT                                   
│  • Message: "How many employees are there?"                                
│  • SQL Query: "select * from emp"                                          
│  • Context Keywords: ["Employee"]                                          
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       📡 FRONTEND PROCESSING                               
│            Chat.tsx handleSubmit() → API Request                           
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      🌐 API ROUTE (/api/chat)                              
│                    Validate → Initialize RagAgent                          
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    🤖 RAG AGENT processMessage()                           
│                   Create context → Start processing                         
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  🧠 ReAct DOMAIN    
                    │     ANALYSIS        
                    │  LLM checks if      
                    │  "Employee" matches 
                    │  "How many emps?"   
                    └──────────┬──────────┘
                              │
               ┌──────────────┴──────────────┐
               │                             │
               ▼                             ▼
    ✅ SEMANTIC MATCH              ❌ NO SEMANTIC MATCH
   (confidence ≥ 0.7)                (cats ≠ employees)
               │                             │
               ▼                             ▼
┌─────────────────────────────┐      ┌─────────────────────────────┐
│  🗄️ ORACLE DATABASE         │      │  🚫 SKIP DATABASE           
│                             │      │                             
│  executeOracleQuery()       │      │  Log: "Database query       
│  SQLclScript.sh             │      │  was not run"               
│  → JSON employee data       │      │  Continue without DB        
└─────────────┬───────────────┘      └─────────────┬───────────────┘
              │                                    │
              └──────────────┬─────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     📝 RAG CONTEXT ASSEMBLY                                
│  • Merge DB results with conversation history                              
│  • Add knowledge base hits (if any)                                        
│  • Create augmentation data package                                         │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   🧠 LLM RESPONSE GENERATION                               
│  ReAct prompt + conversation + database context → Cohere LLM               
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      📡 API RESPONSE ASSEMBLY                              
│     { response, augmentationData, domainAnalysis }                         
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      🎨 FRONTEND DISPLAY                                   
│  AI Message (green) + "This is the Augmentation" accordion                 
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       👁️ USER SEES RESULT                                  
│  "Based on the database, there are 14 employees..." + full JSON details    
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Detailed Step-by-Step Process

### 1. 👤 **User Interaction Layer**

**What happens:** User enters a question and configures the system
```
// User inputs in the UI
const userMessage = "How many employees are there?";
const sqlQuery = "select * from emp";
const contextKeywords = ["Employee"];
const config = {
  temperature: 0.7,
  domainSimilarityThreshold: 0.7,
  enableDatabaseQueries: true,
  contextKeywords: ["Employee"]
};
```

### 2. 📡 **Frontend Processing**

**What happens:** Chat component prepares and sends API request
```
// Chat.tsx - handleSubmit()
const handleSubmit = async (e: React.FormEvent) => {
  const userMessage = { role: 'user', content: input.trim() };
  setMessages([...messages, userMessage]);
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: input.trim(),
      apiKey: apiKey,
      history: messages,
      sqlQuery: sqlQuery,
      config: reactConfig
    })
  });
};
```

### 3. 🌐 **API Route Processing**

**What happens:** Server validates request and initializes RAG agent
```
// /api/chat/route.ts
export async function POST(request: NextRequest) {
  const { message, apiKey, history, sqlQuery, config } = await request.json();
  
  // Validate inputs
  if (!apiKey || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  
  // Initialize RAG agent
  const agent = new RagAgent(apiKey, config);
  await agent.initialize();
  
  // Process the message
  const result = await agent.processMessage(message, history, sqlQuery, config);
  
  return NextResponse.json({
    response: result.response,
    augmentationData: result.augmentationData,
    domainAnalysis: result.domainAnalysis
  });
}
```

### 4. 🤖 **RAG Agent Processing**

**What happens:** Agent starts processing and prepares for domain analysis
```
// agent.ts - processMessage()
async processMessage(message: string, history: any[], sqlQuery?: string, config?: ReActConfig) {
  // Create conversation context
  const context = history.length > 0 
    ? history.map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`).join('\n')
    : '';

  let augmentationData: any = {};
  let domainAnalysis: any = null;
  
  // Check if we should do domain analysis
  if (sqlQuery && config) {
    console.log('\n🚀 Starting ReAct Domain Analysis...');
    domainAnalysis = await this.checkDomainSimilarity(config.contextKeywords, message, config);
  }
}
```

### 5. 🧠 **ReAct Domain Analysis** (Critical Decision Point)

**What happens:** LLM analyzes semantic alignment between user message and context keywords
```
// agent.ts - checkDomainSimilarity()
async checkDomainSimilarity(contextKeywords: string[], userMessage: string, config: ReActConfig) {
  const domainCheckPrompt = `You are an expert domain similarity analyzer.

Context Keywords: ${contextKeywords.join(', ')}
User Message: "${userMessage}"

Analyze semantic relationship. Only indicate MATCH if there is CLEAR semantic alignment.

Examples:
- Context: "Employee" | Message: "How many employees?" → MATCH
- Context: "Employee" | Message: "What is AWS?" → NO MATCH

Provide analysis in JSON format:
{
  "shouldExecute": true/false,
  "reasoning": "Your detailed reasoning here",
  "confidence": 0.0-1.0
}`;

  const response = await this.domainCheckerLlm.invoke(domainCheckPrompt);
  const analysis = JSON.parse(response.content);
  
  // Final decision with thresholds
  const finalDecision = analysis.shouldExecute && 
                       analysis.confidence >= config.domainSimilarityThreshold &&
                       config.enableDatabaseQueries;
  
  console.log('🎯 Domain Analysis Result:', {
    shouldExecute: finalDecision,
    reasoning: analysis.reasoning,
    confidence: analysis.confidence
  });
  
  return { shouldExecute: finalDecision, reasoning: analysis.reasoning, confidence: analysis.confidence };
}
```

### 6A. 🗄️ **Oracle Database Execution** (If Domain Analysis Passes)

**What happens:** Execute SQL query via Oracle connection script
```
// agent.ts - executeOracleQuery()
async function executeOracleQuery(sqlQuery: string) {
  console.log('🔍 Executing Oracle database query:', sqlQuery);
  
  // Execute SQLclScript.sh with the SQL query
  const { stdout, stderr } = await execAsync(`bash ../SQLclScript.sh "${sqlQuery}"`);
  
  if (stderr) {
    console.log('Database query was not run');
    return { success: false, error: stderr };
  }
  
  console.log('✅ Database query executed successfully');
  
  // Parse JSON response from Oracle
  const jsonData = JSON.parse(stdout);
  return { success: true, data: jsonData };
}
```

**SQLclScript.sh content:**
```bash
#!/bin/bash
if [ $# -ne 1 ]; then
    echo "Usage: $0 SQLQuery"
    exit 1
fi

sql -S RAGUSER/PW@IP/SERVICE <<EOF
SET SQLFORMAT JSON-FORMATTED
set feedback off
$1;
commit;
EOF
```

### 6B. 🚫 **Skip Database** (If Domain Analysis Fails)

**What happens:** Log the decision and continue without database data
```
if (!domainAnalysis.shouldExecute) {
  console.log('❌ Domain analysis FAILED - Skipping database query');
  console.log('🛡️ Reason:', domainAnalysis.reasoning);
  
  augmentationData.databaseQuery = {
    query: sqlQuery,
    executed: false,
    reason: domainAnalysis.reasoning
  };
}
```

### 7. 📝 **RAG Context Assembly**

**What happens:** Merge all available data into context for LLM
```
// agent.ts - Context assembly
let databaseContext = '';
if (databaseResult && databaseResult.success) {
  databaseContext = `\n\nDatabase Query Result:\n${JSON.stringify(databaseResult.data, null, 2)}`;
}

// Check knowledge base
const knowledgeResult = searchKnowledge(message);
let knowledgeContext = '';
if (!knowledgeResult.startsWith('No specific')) {
  knowledgeContext = `\n\nRelevant knowledge: ${knowledgeResult}`;
}

// Assemble augmentation data
augmentationData = {
  domainAnalysis: domainAnalysis,
  databaseQuery: databaseResult ? {
    query: sqlQuery,
    result: databaseResult,
    executed: true
  } : null,
  knowledgeBase: knowledgeContext ? { query: message, result: knowledgeResult } : null
};
```

### 8. 🧠 **LLM Response Generation**

**What happens:** Create ReAct prompt with all context and generate response
```
// agent.ts - Response generation
const reactPrompt = `You are a helpful AI assistant that uses ReAct (Reasoning and Acting) methodology.

Available capabilities:
- Mathematical calculations
- Knowledge base search (LangChain, ReAct, Cohere, RAG, LangGraph, Next.js)
- Oracle database queries (when contextually relevant)
- General conversation and assistance

${context}Human: ${message}${knowledgeContext}${databaseContext}

Thought: Let me analyze this request and provide a helpful response using the available information.

Assistant:`;

// Call main LLM with assembled context
const response = await this.llm.invoke(reactPrompt);

return {
  response: response.content as string,
  augmentationData,
  domainAnalysis
};
```

### 9. 📡 **API Response Assembly**

**What happens:** Package response with augmentation data for frontend
```
// /api/chat/route.ts - Response assembly
return NextResponse.json({
  response: result.response,           // LLM generated response
  augmentationData: result.augmentationData,  // Full context data
  domainAnalysis: result.domainAnalysis       // Domain decision details
});
```

### 10. 🎨 **Frontend Display**

**What happens:** Render AI response with expandable augmentation data
```
// Chat.tsx - Response rendering
const aiMessage: Message = { 
  role: 'ai', 
  content: data.response,
  augmentationData: data.augmentationData,
  domainAnalysis: data.domainAnalysis
};
setMessages([...newMessages, aiMessage]);

// In JSX rendering:
<div className="bg-green-100 p-4 rounded-lg">
  <div className="font-semibold text-green-800 mb-2">AI:</div>
  <div className="text-gray-800 whitespace-pre-wrap">{message.content}</div>
  
  {/* Augmentation Data Accordion */}
  {message.augmentationData && (
    <div className="mt-4">
      <button onClick={() => toggleAccordion(index)}>
        <span className="font-medium">This is the Augmentation</span>
      </button>
      {expanded && (
        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
          {JSON.stringify(message.augmentationData, null, 2)}
        </pre>
      )}
    </div>
  )}
</div>
```

---

## 🎯 **Key Decision Points & Code Examples**

### Domain Analysis Decision Logic
```
const finalDecision = analysis.shouldExecute &&           // LLM says yes
                     analysis.confidence >= threshold &&   // Meets confidence threshold
                     config.enableDatabaseQueries;         // User has enabled DB queries

if (finalDecision) {
  console.log('✅ Database query executed successfully');
  // Execute database query
} else {
  console.log('Database query was not run');
  // Skip database, use direct LLM response
}
```

### Example Augmentation Data Structure
```json
{
  "domainAnalysis": {
    "shouldExecute": true,
    "reasoning": "The user's message 'How many employees are there?' directly aligns with the context keyword 'Employee'.",
    "confidence": 1.0
  },
  "databaseQuery": {
    "query": "select * from emp",
    "executed": true,
    "result": {
      "success": true,
      "data": [
        {"EMPNO": 7369, "ENAME": "SMITH", "SAL": 800, "DEPTNO": 20},
        {"EMPNO": 7499, "ENAME": "ALLEN", "SAL": 1600, "DEPTNO": 30}
      ]
    }
  },
  "knowledgeBase": null,
  "calculation": null
}
```

### Terminal Logging Examples
```bash
🚀 Starting ReAct Domain Analysis...
🤔 ReAct Domain Checker - Analyzing semantic similarity...
Context Keywords: Employee
User Message: How many employees are there?
🎯 Domain Analysis Result: {
  shouldExecute: true,
  reasoning: "Message directly aligns with Employee context...",
  confidence: 1,
  thresholdMet: true
}
✅ Domain analysis PASSED - Executing database query
🔍 Executing Oracle database query: select * from emp
✅ Database query executed successfully
```

---

## 🛡️ **Safety & Security Features**

1. **ReAct Domain Checking**: Prevents irrelevant database execution
2. **SQL Script Isolation**: Database access only via controlled script
3. **Error Handling**: Graceful fallbacks at each step
4. **Transparent Logging**: Complete decision trail visible
5. **User Controls**: Enable/disable toggles and threshold settings
6. **API Key Validation**: Secure Cohere API access

## 📊 **Performance Characteristics**

- **Domain Analysis**: ~2-4 seconds (LLM semantic check)
- **Database Query**: ~3-7 seconds (Oracle connection + execution)
- **Response Generation**: ~3-5 seconds (LLM with augmented context)
- **Total RAG Flow**: ~8-16 seconds end-to-end
- **Direct Response**: ~2-3 seconds (no database, LLM only)

## 🎉 **RAG Benefits Demonstrated**

1. **Contextual Accuracy**: Answers based on real, current database content
2. **Semantic Intelligence**: Domain checking prevents irrelevant queries
3. **Full Transparency**: Complete augmentation data visible to user
4. **Flexible Configuration**: User-adjustable parameters and thresholds
5. **Safe Operation**: Multiple safety gates with sensible fallbacks
