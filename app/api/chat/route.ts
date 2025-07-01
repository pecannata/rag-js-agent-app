import { NextRequest, NextResponse } from 'next/server';
import { ChatCohere } from '@langchain/cohere';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { CohereEmbeddings } from '@langchain/cohere';
import { Document } from '@langchain/core/documents';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnablePassthrough, RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';
import { makeReActDecision, formatReActProcess, ReActContext } from '../../lib/react-agent';
import { executeSQLQuery, formatDatabaseResults, validateSQLQuery, DatabaseProgress, processUniqueEmployeeData } from '../../lib/database-utils';

// Sample documents for the RAG system
const sampleDocuments = [
  new Document({
    pageContent: "LangChain is a framework for developing applications powered by language models. It provides tools for connecting language models to other sources of data and allows them to interact with their environment.",
    metadata: { source: "langchain-intro" }
  }),
  new Document({
    pageContent: "LangGraph is a library for building stateful, multi-actor applications with LLMs. It extends the LangChain Expression Language with the ability to coordinate multiple chains across multiple steps of computation.",
    metadata: { source: "langgraph-intro" }
  }),
  new Document({
    pageContent: "Cohere provides state-of-the-art language models via API. Their models can be used for text generation, embeddings, classification, and more. Cohere models are particularly good at following instructions and generating coherent text.",
    metadata: { source: "cohere-intro" }
  }),
  new Document({
    pageContent: "Retrieval Augmented Generation (RAG) is a technique that enhances language model responses by first retrieving relevant information from a knowledge base, then using that information to generate more accurate and contextual responses.",
    metadata: { source: "rag-intro" }
  }),
  new Document({
    pageContent: "ReAct (Reasoning and Acting) is a paradigm that combines reasoning and acting with language models. It allows models to interleave reasoning traces and actions, enabling them to solve complex tasks by breaking them down into steps.",
    metadata: { source: "react-intro" }
  })
];

// Initialize vector store (this would typically be persistent in a real app)
let vectorStore: MemoryVectorStore | null = null;

// Initialize the vector store with sample documents
async function initializeVectorStore(apiKey: string) {
  if (!vectorStore) {
    const embeddings = new CohereEmbeddings({
      apiKey: apiKey,
      model: 'embed-english-v3.0'
    });
    
    vectorStore = await MemoryVectorStore.fromDocuments(
      sampleDocuments,
      embeddings
    );
  }
  return vectorStore;
}

// Create smart RAG chain that falls back to general knowledge
async function createSmartRAGChain(apiKey: string) {
  // Initialize Cohere LLM
  const llm = new ChatCohere({
    apiKey: apiKey,
    model: 'command-r-plus',
    temperature: 0.7
  });

  return { llm };
}

// Process question with ReAct decision-making
async function processQuestionWithReAct(
  question: string, 
  apiKey: string,
  databaseContext?: string,
  sqlQuery?: string,
  onProgress?: (progress: DatabaseProgress) => void
) {
  const { llm } = await createSmartRAGChain(apiKey);
  
  // Make ReAct decision with database context and SQL query
  const reactContext: ReActContext = {
    userQuery: question,
    databaseContext: databaseContext || 'No context provided',
    sqlQuery: sqlQuery || 'No SQL query provided'
  };
  
  const decision = await makeReActDecision(reactContext, apiKey);
  
  // Log ReAct decision to console
  console.log('\n=== ReAct Decision Process ===');
  console.log(`User Query: ${question}`);
  console.log(`\n--- ReAct Process ---`);
  console.log(`Thought: ${decision.thought}`);
  console.log(`Action: ${decision.action}`);
  console.log(`Reasoning: ${decision.reasoning}`);
  console.log(`Should Use Database: ${decision.shouldUseDatabase}`);
  console.log(`Should Use RAG: ${decision.shouldUseRAG}`);
  
  let ragContext = '';
let databaseResults = '';
let databaseExecuted = false;
let uniqueEmpNos;

// Execute based on ReAct decision
if (decision.shouldUseRAG) {
  // Use RAG for knowledge base questions
  console.log('\n=== RAG System Execution ===');
  const store = await initializeVectorStore(apiKey);
  const retriever = store.asRetriever({ k: 3 });
const docs = await retriever.invoke(question);
  // Filter out irrelevant RAG context
  const filteredDocs = docs.filter(doc => !(
    doc.pageContent.includes('Cohere provides state-of-the-art language models') ||
    doc.pageContent.includes('Retrieval Augmented Generation (RAG) is a technique') ||
    doc.pageContent.includes('LangGraph is a library for building stateful, multi-actor applications') ||
    doc.pageContent.includes('LangChain is a framework for developing applications powered by language models')
  ));
  ragContext = filteredDocs.map(doc => doc.pageContent).join('\n\n');
  console.log(`Retrieved RAG Context: ${ragContext.substring(0, 200)}...`);
}

if (decision.shouldUseDatabase) {
  // For this implementation, we'll use a default query when database is needed
  // In practice, this would be determined by ReAct reasoning
  const defaultQuery = 'select * from emp';

  console.log('\n=== Database Query Execution ===');
  console.log(`Executing SQL Query: ${defaultQuery}`);

  const dbResult = await executeSQLQuery(defaultQuery, onProgress);
  if (dbResult.success) {
    // Send the full results to LLM, but ensure clean JSON structure
    try {
      // Parse and re-stringify to ensure clean JSON without duplication
      let cleanData;
      if (dbResult.data && dbResult.data.results && dbResult.data.results[0]) {
        // Take only the first result set to avoid duplication
        cleanData = {
          columns: dbResult.data.results[0].columns,
          items: dbResult.data.results[0].items
        };
      } else if (dbResult.data && dbResult.data.columns && dbResult.data.items) {
        cleanData = {
          columns: dbResult.data.columns,
          items: dbResult.data.items
        };
      } else {
        cleanData = dbResult.data;
      }
      
      databaseResults = JSON.stringify(cleanData, null, 2);
      databaseExecuted = true;
      console.log('Database query executed successfully');
      console.log('Clean database results prepared for LLM');
      console.log('Data structure:', typeof cleanData, Object.keys(cleanData || {}));
      console.log('Number of employee records:', cleanData?.items?.length || 0);
      
    } catch (processingError) {
      databaseResults = `Error processing database results: ${processingError.message}`;
      databaseExecuted = false;
      console.log('Error processing database results:', processingError);
    }
  } else {
    databaseResults = `Database error: ${dbResult.error}`;
    databaseExecuted = false;
    console.log('Database query was not run');
    console.log(`Error: ${dbResult.error}`);
  }
} else {
  console.log('\n=== Database Query Skipped ===');
  console.log('ReAct decision determined database query is not needed');
}
  
  // Generate final response
  let finalPrompt;
  let context = '';
  
  console.log('\n=== Final Response Generation ===');
  console.log(`RAG Context available: ${!!ragContext}`);
  console.log(`Database Results available: ${!!databaseResults}`);
  
  if (ragContext && databaseResults) {
    context = `RAG Context: ${ragContext}\n\nDatabase Results: ${databaseResults}`;
    console.log('Using both RAG and Database context');
    finalPrompt = PromptTemplate.fromTemplate(
      `You are a helpful AI assistant. Use the following context to provide a comprehensive answer to the question.
      
      Context: {context}
      
      Question: {question}
      
      Answer:`
    );
  } else if (ragContext) {
    context = ragContext;
    console.log('Using only RAG context');
    finalPrompt = PromptTemplate.fromTemplate(
      `You are a helpful AI assistant. Use the following context to provide a comprehensive answer to the question.
      
      Context: {context}
      
      Question: {question}
      
      Answer:`
    );
  } else if (databaseResults) {
    context = databaseResults;
    console.log('Using only Database context');
    finalPrompt = PromptTemplate.fromTemplate(
      `You are a helpful AI assistant. Use the following database information to answer the question.
      
      Database Information: {context}
      
      Question: {question}
      
      Answer:`
    );
  } else {
    // Use general knowledge
    console.log('Using general knowledge only');
    finalPrompt = PromptTemplate.fromTemplate(
      `You are a helpful AI assistant. Answer the following question using your general knowledge. Be informative and accurate.
      
      Question: {question}
      
      Answer:`
    );
  }
  
  console.log(`Final context length: ${context.length}`);
  
  console.log('\n=== Calling LLM ===');
  
  // Debug: Show the exact prompt being sent to the LLM
  const promptInput = {
    context,
    question
  };
  
  console.log('Prompt input prepared.');
  console.log('Question:', question);
  console.log('Context length:', context.length);
  
  const response = await finalPrompt.pipe(llm).pipe(new StringOutputParser()).invoke(promptInput);
  
  // Prepare debug information (raw prompt context only)
  let debugInfo = {};
  if (context.length > 0) {
    debugInfo = {
      promptContext: context
    };
  }
  
  return {
    response,
    decision,
    databaseExecuted,
    databaseResults,
    ragContext,
    debugInfo
  };
}

// Process database query with ReAct decision
async function processDatabaseQueryWithReAct(
  userQuery: string,
  databaseContext: string,
  sqlQuery: string,
  apiKey: string,
  onProgress?: (progress: DatabaseProgress) => void
) {
  // Validate SQL query first
  const validation = validateSQLQuery(sqlQuery);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.message,
      databaseExecuted: false
    };
  }
  
  // Make ReAct decision for database query
  const reactContext: ReActContext = {
    userQuery,
    databaseContext,
    sqlQuery
  };
  
  const decision = await makeReActDecision(reactContext, apiKey);
  
  let result;
  if (decision.shouldUseDatabase) {
    result = await executeSQLQuery(sqlQuery, onProgress);
    return {
      success: result.success,
      data: result.data,
      formattedResults: formatDatabaseResults(result),
      decision,
      databaseExecuted: result.success,
      error: result.error
    };
  } else {
    return {
      success: false,
      error: 'ReAct decision determined database query is not relevant',
      decision,
      databaseExecuted: false
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      message, 
      apiKey, 
      type = 'chat',
      databaseContext,
      sqlQuery 
    } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (type === 'react-only') {
      // Handle ReAct decision only, don't execute database query
      if (!sqlQuery) {
        return NextResponse.json(
          { error: 'SQL query is required for ReAct decision' },
          { status: 400 }
        );
      }

      // Make ReAct decision without executing the query
      const reactContext: ReActContext = {
        userQuery: message,
        databaseContext: databaseContext || '',
        sqlQuery
      };
      
      const decision = await makeReActDecision(reactContext, apiKey);
      const reactProcess = formatReActProcess(decision);
      
      return NextResponse.json({
        success: true,
        reactProcess,
        shouldUseDatabase: decision.shouldUseDatabase,
        shouldUseRAG: decision.shouldUseRAG
      });
    } else if (type === 'database') {
      // Handle database query with ReAct
      if (!sqlQuery) {
        return NextResponse.json(
          { error: 'SQL query is required for database operations' },
          { status: 400 }
        );
      }

      const result = await processDatabaseQueryWithReAct(
        message,
        databaseContext || '',
        sqlQuery,
        apiKey
      );

      const reactProcess = result.decision ? formatReActProcess(result.decision) : '';
      
      return NextResponse.json({
        success: result.success,
        response: result.formattedResults || result.error,
        databaseExecuted: result.databaseExecuted,
        reactProcess,
        data: result.data
      });
    } else {
      // Handle regular chat with ReAct
      const result = await processQuestionWithReAct(message, apiKey, databaseContext, sqlQuery);
      const reactProcess = formatReActProcess(result.decision);
      
      // Only show the AI response and ReAct process, not database results
      let finalResponse = result.response;
      finalResponse += `\n\n${reactProcess}`;

      return NextResponse.json({ 
        response: finalResponse,
        success: true,
        databaseExecuted: result.databaseExecuted,
        debugInfo: result.debugInfo
      });
    }

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process your request',
        response: 'I apologize, but I encountered an error processing your request. Please check your API key and try again.'
      },
      { status: 500 }
    );
  }
}
