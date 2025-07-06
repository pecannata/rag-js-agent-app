import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { PerformanceMonitor, assessDocumentPerformance, estimateMemoryUsage } from './performance-utils';

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
    
    // Estimate document size and warn user
    const totalContentLength = sections.reduce((total, section) => total + (section.content?.length || 0), 0);
    console.log(`📊 Estimated content size: ${totalContentLength.toLocaleString()} characters`);
    
    // Performance assessment
    const perfAssessment = assessDocumentPerformance(totalContentLength);
    const memoryEstimate = estimateMemoryUsage(totalContentLength);
    
    console.log(`📈 Performance level: ${perfAssessment.level} (${perfAssessment.estimatedTime})`);
    console.log(`💾 Estimated memory usage: ${memoryEstimate.estimated}${memoryEstimate.unit}`);
    
    if (perfAssessment.warning) {
      console.warn(`⚠️ ${perfAssessment.warning}`);
    }
    if (memoryEstimate.warning) {
      console.warn(`⚠️ ${memoryEstimate.warning}`);
    }
    
    // Start performance monitoring
    const monitor = new PerformanceMonitor('DOCX Generation', totalContentLength);
    
    // Create paragraphs from sections with progress tracking
    const paragraphs: Paragraph[] = [];

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

    // Process each section with optimization and async yielding
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      const section = sections[sectionIndex];
      if (!section) {
        console.warn(`Section at index ${sectionIndex} is undefined, skipping`);
        continue;
      }
      console.log(`📝 Processing section ${sectionIndex + 1}/${sections.length}: ${section.title}`);
      
      // Add section title
      if (section.title) {
        const paragraphOptions: any = {
          children: [
            new TextRun({
              text: section.title,
              bold: true,
              size: 28, // 14pt font
            }),
          ],
          spacing: { before: 300, after: 200 },
        };
        
        if (section.isHeading) {
          paragraphOptions.heading = HeadingLevel.HEADING_1;
        }
        
        paragraphs.push(new Paragraph(paragraphOptions));
      }

      // Optimize content processing for large sections
      if (section.content) {
        // For very large content, split into smaller chunks to avoid memory issues
        const maxChunkSize = 30000; // Reduced to 30KB chunks for better performance
        if (section.content.length > maxChunkSize) {
          console.log(`⚠️ Large section detected (${section.content.length} chars), chunking for performance...`);
          
          const chunks = splitLargeContent(section.content, maxChunkSize);
          for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const chunk = chunks[chunkIndex];
            if (!chunk) {
              console.warn(`Chunk at index ${chunkIndex} is undefined, skipping`);
              continue;
            }
            console.log(`  📦 Processing chunk ${chunkIndex + 1}/${chunks.length}`);
            await processSectionContentAsync(chunk, paragraphs);
            
            // Add yield point for very large documents to prevent browser freeze
            if (chunkIndex % 5 === 0 && chunks.length > 10) {
              await new Promise(resolve => setTimeout(resolve, 10)); // Small yield
            }
          }
        } else {
          await processSectionContentAsync(section.content, paragraphs);
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
      
      // Yield control occasionally for large documents
      if (sectionIndex % 3 === 0 && sections.length > 5) {
        await new Promise(resolve => setTimeout(resolve, 5)); // Small yield
      }
    }
    console.log('📄 Total paragraphs created:', paragraphs.length);
    console.log('🏗️ Creating document...');

    // Create the document
    const docOptions: any = {
      creator: metadata?.creator || 'RAG JS Agent App',
      title: metadata?.title || fileName,
      sections: [
        {
          children: paragraphs,
        },
      ],
    };
    
    if (metadata?.description) {
      docOptions.description = metadata.description;
    }
    
    const doc = new Document(docOptions);

    console.log('📦 Generating document buffer...');
    
    // Generate and save the document with timeout protection and progress indication
    const timeoutDuration = perfAssessment.level === 'very-slow' ? 120000 : 60000; // 2 minutes for very large docs
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Document generation timed out after ${timeoutDuration / 1000} seconds`)), timeoutDuration);
    });
    
    console.log('⏳ Generating document buffer (this may take a moment for large documents)...');
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
    
    // Finish performance monitoring
    const metrics = monitor.finish();
    
    // Log final performance metrics
    if (metrics.duration && metrics.duration > 5000) {
      console.log(`📈 Performance summary: ${(metrics.duration / 1000).toFixed(1)}s for ${totalContentLength.toLocaleString()} characters`);
    }
    
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
 * Async version of processSectionContent with yield points for better performance
 */
async function processSectionContentAsync(content: string, paragraphs: Paragraph[]): Promise<void> {
  // Performance optimization: limit paragraph splitting for very large content
  const maxParagraphs = 1000; // Limit to 1000 paragraphs to prevent browser freeze
  
  // Split content by paragraphs (double newlines or single newlines)
  const contentParagraphs = content.split(/\n\s*\n|\n/);
  
  // If we have too many paragraphs, merge some together
  let processedParagraphs = contentParagraphs;
  if (contentParagraphs.length > maxParagraphs) {
    console.log(`⚠️ Large paragraph count detected (${contentParagraphs.length}), merging to improve performance...`);
    processedParagraphs = [];
    const mergeSize = Math.ceil(contentParagraphs.length / maxParagraphs);
    
    for (let i = 0; i < contentParagraphs.length; i += mergeSize) {
      const merged = contentParagraphs.slice(i, i + mergeSize).join('\n');
      if (merged.trim()) {
        processedParagraphs.push(merged);
      }
    }
  }
  
  // Process paragraphs in batches to avoid blocking the main thread
  const batchSize = 25; // Smaller batches for async processing
  for (let i = 0; i < processedParagraphs.length; i += batchSize) {
    const batch = processedParagraphs.slice(i, i + batchSize);
    
    batch.forEach((paragraph) => {
      if (paragraph.trim()) {
        try {
          // For very long paragraphs, use plain text to improve performance
          if (paragraph.length > 10000) {
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text: paragraph.trim() })],
                spacing: { after: 200 },
              })
            );
          } else {
            const textRuns = parseMarkdownBold(paragraph);
            paragraphs.push(
              new Paragraph({
                children: textRuns,
                spacing: { after: 200 },
              })
            );
          }
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
    
    // Yield control after each batch to prevent browser freeze
    if (i + batchSize < processedParagraphs.length) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
  }
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
    
    // Add bold text - check for undefined capture group
    const boldText = match[1];
    if (boldText) {
      runs.push(
        new TextRun({
          text: boldText,
          bold: true,
        })
      );
    }
    
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
