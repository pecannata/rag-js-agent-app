import { NextRequest, NextResponse } from "next/server";
import { ChatCohere } from "@langchain/cohere";
import { HumanMessage } from "@langchain/core/messages";

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey } = await request.json();

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

    // Check if we can provide a direct tool response
    const toolResponse = getToolResponse(message);
    
    if (toolResponse) {
      // Return the tool response directly for specific queries
      return NextResponse.json({ response: toolResponse });
    } else {
      // Use Cohere for general queries
      const enhancedPrompt = `You are a helpful AI assistant. Please provide a comprehensive and accurate answer to the following question:

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
