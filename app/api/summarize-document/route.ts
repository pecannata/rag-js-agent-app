import { NextRequest, NextResponse } from 'next/server';
import { ChatCohere } from '@langchain/cohere';

export async function POST(request: NextRequest) {
  console.log('=== DOCUMENT SUMMARIZATION API ROUTE CALLED ===');
  
  try {
    const { text, filename, apiKey, documentType, metadata } = await request.json();
    
    console.log('Summarization request received for:', filename);
    console.log('Document type:', documentType);
    console.log('Text length:', text?.length || 0);
    
    if (!apiKey) {
      console.log('No API key provided, returning error');
      return NextResponse.json({ 
        success: false,
        error: 'API key is required for document summarization' 
      }, { status: 400 });
    }

    if (!text) {
      console.log('No text provided, returning error');
      return NextResponse.json({ 
        success: false,
        error: 'Text content is required for summarization' 
      }, { status: 400 });
    }

    // Initialize LLM for summarization
    const llm = new ChatCohere({
      apiKey: apiKey,
      model: 'command-r-plus',
      temperature: 0.3, // Lower temperature for more consistent summaries
    });

    // Create document type-specific prompts
    const getPromptForDocumentType = (docType: string, filename: string, text: string, metadata?: any) => {
      const baseInstructions = `You are an expert document analyst. Your task is to create a comprehensive yet concise summary of the following document.`;
      
      const documentInfo = `Document: ${filename}
Type: ${docType}
Length: ${text.length} characters
${metadata ? `Additional Info: ${JSON.stringify(metadata, null, 2)}` : ''}`;

      switch (docType?.toLowerCase()) {
        case 'pdf':
          return `${baseInstructions}

${documentInfo}

This is a PDF document. Please provide a structured summary that includes:

1. **Document Overview**: What type of document this is and its primary purpose
2. **Key Topics**: Main subjects and themes covered
3. **Important Information**: Critical facts, figures, or findings
4. **Structure**: How the document is organized (sections, chapters, etc.)
5. **Key Takeaways**: Most important points for someone who needs to understand this document quickly

Focus on extracting actionable insights and important details while maintaining readability.

Document Text:
${text}

Summary:`;

        case 'docx':
        case 'word':
          return `${baseInstructions}

${documentInfo}

This is a Word document. Please provide a structured summary that includes:

1. **Document Purpose**: The main objective and intended audience
2. **Key Content**: Primary topics and discussions
3. **Important Details**: Significant data, conclusions, or recommendations
4. **Document Structure**: Organization and flow of information
5. **Action Items**: Any tasks, decisions, or next steps mentioned

Ensure the summary captures both the content and context of the document.

Document Text:
${text}

Summary:`;

        case 'pptx':
        case 'powerpoint':
          return `${baseInstructions}

${documentInfo}

This is a PowerPoint presentation. Please provide a structured summary that includes:

1. **Presentation Overview**: Main topic and presentation purpose
2. **Key Messages**: Primary points and value propositions presented
3. **Slide Breakdown**: Main sections and their key content
4. **Visual Elements**: Important charts, images, or data mentioned
5. **Conclusions**: Final recommendations, calls to action, or takeaways
6. **Audience**: Intended audience and context if apparent

Focus on the narrative flow and key business messages.

Document Text:
${text}

Summary:`;

        default:
          return `${baseInstructions}

${documentInfo}

Please provide a comprehensive summary that includes:

1. **Document Overview**: Type and purpose
2. **Main Content**: Key topics and themes
3. **Important Information**: Critical details and insights
4. **Structure**: Organization of the content
5. **Key Points**: Most important takeaways

Document Text:
${text}

Summary:`;
      }
    };

    // Chunk text if it's too long (Cohere has token limits)
    const maxChunkSize = 120000; // Conservative limit for Cohere
    const chunks = [];
    
    if (text.length > maxChunkSize) {
      console.log('Text is long, chunking for summarization...');
      for (let i = 0; i < text.length; i += maxChunkSize) {
        chunks.push(text.slice(i, i + maxChunkSize));
      }
    } else {
      chunks.push(text);
    }

    console.log(`Processing document in ${chunks.length} chunk(s)`);

    let finalSummary = '';

    if (chunks.length === 1) {
      // Single chunk - direct summarization
      console.log('Generating summary for single chunk...');
      const prompt = getPromptForDocumentType(documentType, filename, text, metadata);
      const response = await llm.invoke(prompt);
      finalSummary = response.content as string;
    } else {
      // Multiple chunks - summarize each chunk then combine
      console.log('Processing multiple chunks...');
      const chunkSummaries = [];

      for (let i = 0; i < chunks.length; i++) {
        console.log(`Summarizing chunk ${i + 1}/${chunks.length}...`);
        
        const chunkPrompt = `You are summarizing part ${i + 1} of ${chunks.length} of a ${documentType} document named "${filename}".

Please provide a concise summary of this section, focusing on:
- Key topics and main points
- Important data or findings
- Relevant details for the overall document understanding

Document Section ${i + 1}:
${chunks[i]}

Section Summary:`;

        const chunkResponse = await llm.invoke(chunkPrompt);
        chunkSummaries.push(`**Section ${i + 1}:**\n${chunkResponse.content as string}`);
      }

      // Combine chunk summaries into final summary
      console.log('Combining chunk summaries into final summary...');
      const combinedSummaries = chunkSummaries.join('\n\n');
      
      const finalPrompt = `You are creating a final comprehensive summary from multiple section summaries of a ${documentType} document.

Document: ${filename}
Type: ${documentType}
Total sections processed: ${chunks.length}

Section Summaries:
${combinedSummaries}

Please create a unified, well-structured final summary that:
1. **Integrates all sections** into a coherent overview
2. **Identifies main themes** across the entire document
3. **Highlights key findings** and important information
4. **Maintains logical flow** and readability
5. **Provides actionable insights** from the complete document

Final Comprehensive Summary:`;

      const finalResponse = await llm.invoke(finalPrompt);
      finalSummary = finalResponse.content as string;
    }

    console.log('Summary generation completed successfully');
    console.log('Summary length:', finalSummary.length);

    // Extract key topics using a simple approach
    const keyTopicsPrompt = `Based on this document summary, extract 5-8 key topics or themes as a comma-separated list. Only return the topics, nothing else.

Summary:
${finalSummary}

Key Topics:`;

    const topicsResponse = await llm.invoke(keyTopicsPrompt);
    const keyTopics = (topicsResponse.content as string)
      .split(',')
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0)
      .slice(0, 8); // Limit to 8 topics

    console.log('Extracted key topics:', keyTopics);

    return NextResponse.json({
      success: true,
      summary: finalSummary,
      keyTopics: keyTopics,
      documentInfo: {
        filename,
        documentType,
        originalLength: text.length,
        summaryLength: finalSummary.length,
        chunksProcessed: chunks.length,
        metadata
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in document summarization:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json({
      success: false,
      error: 'Failed to summarize document: ' + errorMessage
    }, { status: 500 });
  }
}
