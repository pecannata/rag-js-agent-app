import { NextRequest, NextResponse } from "next/server";
import { ChatCohere } from "@langchain/cohere";
import { HumanMessage } from "@langchain/core/messages";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey, sqlContext, userContext } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }


    // Create Cohere model
    const model = new ChatCohere({
      apiKey: apiKey,
      model: "command-r-plus",
      temperature: 0.7,
    });

    // Simple tools simulation for ReAct-like behavior
    const getToolResponse = (query: string) => {
      const lowerQuery = query.toLowerCase();
      
      // AWS-specific knowledge
      if (lowerQuery.includes('aws') || lowerQuery.includes('amazon web services')) {
        return `AWS (Amazon Web Services) is a comprehensive cloud computing platform provided by Amazon. It offers over 200 services including:

• **Compute**: EC2 (virtual servers), Lambda (serverless), ECS (containers)
• **Storage**: S3 (object storage), EBS (block storage), EFS (file storage)
• **Database**: RDS (relational), DynamoDB (NoSQL), Redshift (data warehouse)
• **Networking**: VPC (virtual private cloud), CloudFront (CDN), Route 53 (DNS)
• **Security**: IAM (identity management), KMS (key management), WAF (web firewall)
• **Analytics**: EMR (big data), Athena (query service), QuickSight (business intelligence)

AWS serves millions of customers worldwide and is the leading cloud platform, offering pay-as-you-go pricing and global infrastructure across multiple regions.`;
      }
      
      // Math calculations
      if (lowerQuery.includes('calculate') || lowerQuery.includes('math') || /\d+\s*[+\-*/]\s*\d+/.test(lowerQuery)) {
        try {
          const mathExpression = lowerQuery.match(/\d+\s*[+\-*/]\s*\d+/)?.[0];
          if (mathExpression) {
            const result = Function(`"use strict"; return (${mathExpression})`)();
            return `I calculated ${mathExpression} = ${result}`;
          }
        } catch (error) {
          return "I couldn't perform that calculation. Please provide a simpler math expression.";
        }
      }
      
      return null;
    };

    // ReAct Decision Logic: Check if this is a SQL-related query that needs context validation
    const isSqlRelatedQuery = (query: string) => {
      const lowerQuery = query.toLowerCase();
      return lowerQuery.includes('sql') || 
             lowerQuery.includes('query') || 
             lowerQuery.includes('database') || 
             lowerQuery.includes('select') || 
             lowerQuery.includes('from') || 
             lowerQuery.includes('where') || 
             lowerQuery.includes('join') || 
             lowerQuery.includes('table') || 
             lowerQuery.includes('customer') || 
             lowerQuery.includes('movie') || 
             lowerQuery.includes('data') || 
             lowerQuery.includes('find') || 
             lowerQuery.includes('show') || 
             lowerQuery.includes('list') || 
             lowerQuery.includes('count') || 
             lowerQuery.includes('how many');
    };

    // If this is a SQL-related query and we have userContext, validate context relevance
    if (isSqlRelatedQuery(message) && userContext && sqlContext) {
      const reactPrompt = `You are a ReAct (Reasoning and Acting) agent. You must decide whether to answer a question based on context relevance.

USER CONTEXT: "${userContext}"
USER QUESTION: "${message}"
AVAILABLE DATA: "${sqlContext}"

EVALUATION CRITERIA:
1. CONTEXT RELEVANCE: Does the user's question relate to their stated context?
   - If context is about "cars" but question is about movies/customers, this is IRRELEVANT
   - If context is about "movies" but question is about cars/vehicles, this is IRRELEVANT
2. DATA ALIGNMENT: Does the available data match both the context and question?

STRICT RULES:
- If context and question topics don't match, respond "NO"
- Only respond "YES" if context, question, and available data are clearly related

Start your response with either "YES" or "NO" followed by your reasoning.`;

      try {
        const reactResponse = await model.invoke([new HumanMessage(reactPrompt)]);
        const responseText = reactResponse.content.toString().toLowerCase().trim();
        
        if (!responseText.startsWith('yes')) {
          return NextResponse.json({ 
            response: `ReAct Decision: I cannot answer this question because it doesn't match your specified context.\n\nYour Context: "${userContext}"\nYour Question: "${message}"\n\nThe question and context don't align. Please either:\n1. Update your context to match your question, or\n2. Ask a question that relates to your specified context.\n\nReAct Reasoning: ${reactResponse.content}` 
          });
        }
      } catch (error) {
        console.error("ReAct decision error:", error);
        return NextResponse.json({ 
          response: "I encountered an error while validating your question against the context. Please try again." 
        });
      }
    }

    // Check if we can provide a direct tool response
    const toolResponse = getToolResponse(message);
    
    if (toolResponse) {
      // Return the tool response directly for specific queries
      return NextResponse.json({ response: toolResponse });
    } else {
      // Use Cohere for general queries with SQL context if available
      const enhancedPrompt = sqlContext 
        ? `You are a helpful AI assistant with access to Oracle database query results. Use the following database context to provide a comprehensive answer:

Database Query Results: ${sqlContext}

Question: ${message}

Please provide a detailed and informative response using the database information when relevant.`
        : `You are a helpful AI assistant. Please provide a comprehensive and accurate answer to the following question:

Question: ${message}

Please provide a detailed and informative response.`;
      
      const response = await model.invoke([new HumanMessage(enhancedPrompt)]);
      return NextResponse.json({ response: response.content });
    }

  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to process the request. Please check your API key and try again." },
      { status: 500 }
    );
  }
}
