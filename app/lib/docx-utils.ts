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
  try {
    // Create paragraphs from sections
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

    // Process each section
    sections.forEach((section) => {
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

      // Process content - handle markdown-style bold formatting
      const contentParts = parseMarkdownBold(section.content);
      
      // Split content by paragraphs (double newlines or single newlines)
      const contentParagraphs = section.content.split(/\n\s*\n|\n/);
      
      contentParagraphs.forEach((paragraph) => {
        if (paragraph.trim()) {
          const textRuns = parseMarkdownBold(paragraph);
          paragraphs.push(
            new Paragraph({
              children: textRuns,
              spacing: { after: 200 },
            })
          );
        }
      });

      // Add spacing after section
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: { after: 200 },
        })
      );
    });

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

    // Generate and save the document
    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    
    // Clean the fileName and save
    const cleanFileName = fileName.replace(/[^a-z0-9\-_.]/gi, '_');
    saveAs(blob, `${cleanFileName}.docx`);
    
  } catch (error) {
    console.error('Error creating DOCX file:', error);
    throw new Error('Failed to create DOCX file');
  }
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
  documentName: string
): Promise<void> {
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

  const fileName = `${documentName}_summary_${new Date().toISOString().split('T')[0]}`;
  
  await saveAsDocx(
    fileName,
    sections,
    {
      title: `AI Summary: ${documentName}`,
      subject: 'Document Summary Generated by RAG JS Agent App',
      creator: 'RAG JS Agent App',
      description: `AI-generated summary for document: ${documentName}`,
    }
  );
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

  const fileName = `${documentName}_vector_search_${new Date().toISOString().split('T')[0]}`;
  
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
}
