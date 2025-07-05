import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export interface DocumentSection {
  title: string;
  content: string;
  isHeading?: boolean;
}

/**
 * Create and save a DOCX document with sections
 */
export async function saveAsDocx(
  fileName: string,
  sections: DocumentSection[],
  metadata?: {
    title?: string;
    subject?: string;
    creator?: string;
    description?: string;
  }
): Promise<void> {
  // Input validation
  if (typeof fileName !== 'string' || !fileName.trim()) {
    console.error('fileName is not a valid string:', typeof fileName, fileName);
    throw new Error('Invalid fileName provided');
  }
  
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error('No sections provided for document creation');
  }

  try {
    console.log('📄 Starting DOCX creation for:', fileName);
    console.log('📊 Processing', sections.length, 'sections');
    
    // Create paragraphs from sections with progress tracking
    const paragraphs: Paragraph[] = [];
    let totalContentLength = 0;

    // Add document title if provided
    if (metadata?.title) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: metadata.title,
              bold: true,
              size: 32, // 16pt font
            }),
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }

    // Process each section with optimization
    sections.forEach((section, sectionIndex) => {
      console.log(`📝 Processing section ${sectionIndex + 1}/${sections.length}: ${section.title}`);
      
      // Add section title
      if (section.title) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.title,
                bold: true,
                size: 28, // 14pt font
              }),
            ],
            heading: section.isHeading ? HeadingLevel.HEADING_1 : undefined,
            spacing: { before: 300, after: 200 },
          })
        );
      }

      // Optimize content processing for large sections
      if (section.content) {
        totalContentLength += section.content.length;
        
        // For very large content, split into smaller chunks to avoid memory issues
        const maxChunkSize = 50000; // 50KB chunks
        if (section.content.length > maxChunkSize) {
          console.log(`⚠️ Large section detected (${section.content.length} chars), chunking...`);
          
          const chunks = splitLargeContent(section.content, maxChunkSize);
          chunks.forEach((chunk, chunkIndex) => {
            console.log(`  📦 Processing chunk ${chunkIndex + 1}/${chunks.length}`);
            processSectionContent(chunk, paragraphs);
          });
        } else {
          processSectionContent(section.content, paragraphs);
        }
      }

      // Add spacing after section (but not after the last section)
      if (sectionIndex < sections.length - 1) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: '' })],
            spacing: { after: 200 },
          })
        );
      }
    });

    console.log(`📊 Total content processed: ${totalContentLength.toLocaleString()} characters`);
    console.log(`📄 Total paragraphs created: ${paragraphs.length}`);
    console.log('🏗️ Creating document...');

    // Create the document
    const doc = new Document({
      properties: {
        title: metadata?.title || fileName,
        subject: metadata?.subject,
        creator: metadata?.creator || 'RAG JS Agent App',
        description: metadata?.description,
      },
      sections: [
        {
          children: paragraphs,
        },
      ],
    });

    console.log('📦 Generating document buffer...');
    
    // Generate and save the document with timeout protection
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Document generation timed out after 30 seconds')), 30000);
    });
    
    const buffer = await Promise.race([
      Packer.toBuffer(doc),
      timeoutPromise
    ]);
    
    console.log(`✅ Document buffer generated (${buffer.byteLength.toLocaleString()} bytes)`);
    
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    // Clean the fileName and save
    const cleanFileName = sanitizeFileName(fileName);
    console.log('💾 Downloading file:', `${cleanFileName}.docx`);
    
    saveAs(blob, `${cleanFileName}.docx`);
    
    console.log('✅ DOCX file download initiated successfully');
    
  } catch (error) {
    console.error('❌ Error creating DOCX file:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('timed out')) {
        throw new Error('Document generation timed out. The document may be too large. Please try again.');
      } else if (error.message.includes('memory')) {
        throw new Error('Insufficient memory to generate document. Please try with smaller content.');
      } else {
        throw new Error(`Failed to create DOCX file: ${error.message}`);
      }
    } else {
      throw new Error('Failed to create DOCX file due to unknown error');
    }
  }
}

/**
 * Split large content into manageable chunks
 */
function splitLargeContent(content: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  
  // Try to split on paragraph boundaries first
  const paragraphs = content.split(/\n\s*\n/);
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Process section content and add paragraphs
 */
function processSectionContent(content: string, paragraphs: Paragraph[]): void {
  // Split content by paragraphs (double newlines or single newlines)
  const contentParagraphs = content.split(/\n\s*\n|\n/);
  
  contentParagraphs.forEach((paragraph) => {
    if (paragraph.trim()) {
      try {
        const textRuns = parseMarkdownBold(paragraph);
        paragraphs.push(
          new Paragraph({
            children: textRuns,
            spacing: { after: 200 },
          })
        );
      } catch (error) {
        console.warn('Warning: Failed to parse paragraph, adding as plain text:', error);
        // Fallback to plain text if parsing fails
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: paragraph.trim() })],
            spacing: { after: 200 },
          })
        );
      }
    }
  });
}

/**
 * Sanitize filename for safe file system use
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-z0-9\-_.\s]/gi, '_') // Replace invalid chars with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .slice(0, 100); // Limit length to 100 chars
}

/**
 * Parse markdown-style bold formatting (**text**) and return TextRun array
 */
function parseMarkdownBold(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let currentIndex = 0;
  
  // Regex to match **bold text** patterns
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the bold text
    if (match.index > currentIndex) {
      const beforeText = text.slice(currentIndex, match.index);
      if (beforeText) {
        runs.push(new TextRun({ text: beforeText }));
      }
    }
    
    // Add bold text
    runs.push(
      new TextRun({
        text: match[1],
        bold: true,
      })
    );
    
    currentIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex);
    if (remainingText) {
      runs.push(new TextRun({ text: remainingText }));
    }
  }
  
  // If no bold formatting was found, return the original text
  if (runs.length === 0) {
    runs.push(new TextRun({ text: text }));
  }
  
  return runs;
}

/**
 * Save summary results as DOCX
 */
export async function saveSummaryAsDocx(
  summaryResult: {
    summary: string;
    keyTopics: string[];
    timestamp: string;
    documentInfo?: {
      summaryLength: number;
      chunksProcessed: number;
    };
  },
  documentName: string,
  summaryMode: 'standard' | 'slide-by-slide' = 'standard'
): Promise<void> {
  console.log('📄 Saving summary as DOCX for document:', documentName);
  console.log('📝 Summary mode:', summaryMode);
  
  // Input validation
  if (!summaryResult || typeof summaryResult !== 'object') {
    throw new Error('Invalid summary result provided');
  }
  
  if (typeof documentName !== 'string' || !documentName.trim()) {
    throw new Error('Invalid document name provided');
  }

  const sections: DocumentSection[] = [
    {
      title: 'Document Summary',
      content: summaryResult.summary,
      isHeading: true,
    },
  ];

  // Add key topics if available
  if (summaryResult.keyTopics && summaryResult.keyTopics.length > 0) {
    sections.push({
      title: 'Key Topics',
      content: summaryResult.keyTopics.map(topic => `• ${topic}`).join('\n'),
      isHeading: true,
    });
  }

  // Add metadata section
  const metadataLines: string[] = [
    `Generated: ${new Date(summaryResult.timestamp).toLocaleString()}`,
    `Document: ${documentName}`,
    `Summary Type: ${summaryMode === 'slide-by-slide' ? 'Slide-by-Slide Analysis' : 'Standard Summary'}`,
  ];

  if (summaryResult.documentInfo) {
    metadataLines.push(
      `Summary Length: ${summaryResult.documentInfo.summaryLength.toLocaleString()} characters`,
      `Chunks Processed: ${summaryResult.documentInfo.chunksProcessed}`
    );
  }

  sections.push({
    title: 'Summary Information',
    content: metadataLines.join('\n'),
    isHeading: true,
  });

  // Create filename with mode indicator
  const date = new Date().toISOString().split('T')[0];
  const modeIndicator = summaryMode === 'slide-by-slide' ? '_slide-by-slide' : '';
  const fileName = `${documentName}_summary${modeIndicator}_${date}`;
  
  console.log('📊 Summary sections prepared:', sections.length);
  console.log('📝 Total summary length:', summaryResult.summary?.length || 0, 'characters');
  
  try {
    await saveAsDocx(
      fileName,
      sections,
      {
        title: `AI Summary${summaryMode === 'slide-by-slide' ? ' (Slide-by-Slide)' : ''}: ${documentName}`,
        subject: `Document Summary Generated by RAG JS Agent App${summaryMode === 'slide-by-slide' ? ' - Slide-by-Slide Analysis' : ''}`,
        creator: 'RAG JS Agent App',
        description: `AI-generated ${summaryMode} summary for document: ${documentName}`,
      }
    );
    console.log('✅ Summary DOCX saved successfully');
  } catch (error) {
    console.error('❌ Failed to save summary DOCX:', error);
    throw error;
  }
}

/**
 * Save vector query results as DOCX
 */
export async function saveVectorQueryAsDocx(
  queryResult: any,
  userMessage: string,
  documentName: string
): Promise<void> {
  const sections: DocumentSection[] = [
    {
      title: 'AI Vector Search Results',
      content: '',
      isHeading: true,
    },
    {
      title: 'Query Information',
      content: [
        `**Query:** ${userMessage}`,
        `**Document:** ${documentName}`,
        `**Generated:** ${new Date().toLocaleString()}`,
      ].join('\n'),
    },
  ];

  // Add AI Response
  if (queryResult.response) {
    sections.push({
      title: 'AI Response',
      content: queryResult.response,
      isHeading: true,
    });
  }

  // Add Database Results
  if (queryResult.augmentationData && queryResult.augmentationData.length > 0) {
    let dbContent = 'Retrieved document segments:\n\n';
    queryResult.augmentationData.forEach((row: any, index: number) => {
      if (row.SEG) {
        dbContent += `**Segment ${index + 1}:**\n${row.SEG}\n\n`;
      }
    });
    
    sections.push({
      title: 'Database Query Results',
      content: dbContent,
      isHeading: true,
    });
  }

  // Add Domain Analysis if available
  if (queryResult.domainAnalysis) {
    const analysis = queryResult.domainAnalysis;
    const analysisContent = [
      `**Should Execute:** ${analysis.shouldExecute ? 'Yes' : 'No'}`,
      `**Confidence:** ${analysis.confidence}`,
      `**Reasoning:** ${analysis.reasoning}`,
    ].join('\n\n');

    sections.push({
      title: 'Domain Analysis',
      content: analysisContent,
      isHeading: true,
    });
  }

  // Create a clean version of the user message for filename
  const cleanUserMessage = userMessage
    .slice(0, 30) // Limit length to keep filename reasonable
    .replace(/[^a-z0-9\s]/gi, '') // Remove special characters except spaces
    .trim()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase();
  
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${documentName}_${date}_${cleanUserMessage}`;
  
  console.log('📊 Vector query sections prepared:', sections.length);
  console.log('📄 Filename will be:', `${fileName}.docx`);
  
  try {
    await saveAsDocx(
      fileName,
      sections,
      {
        title: `Vector Search Results: ${documentName}`,
        subject: 'Vector Search Results from RAG JS Agent App',
        creator: 'RAG JS Agent App',
        description: `Vector search results for query "${userMessage}" on document: ${documentName}`,
      }
    );
    console.log('✅ Vector query DOCX saved successfully');
  } catch (error) {
    console.error('❌ Failed to save vector query DOCX:', error);
    throw error;
  }
}
