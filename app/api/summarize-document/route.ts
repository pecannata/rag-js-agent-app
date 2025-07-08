import { NextRequest, NextResponse } from 'next/server';
import { ChatCohere } from '@langchain/cohere';

export async function POST(request: NextRequest) {
  console.log('=== DOCUMENT SUMMARIZATION API ROUTE CALLED ===');
  
  try {
    const { text, filename, apiKey, documentType, metadata, userMessage } = await request.json();
    
    console.log('Summarization request received for:', filename);
    console.log('Document type:', documentType);
    console.log('Text length:', text?.length || 0);
    console.log('User message:', userMessage);
    
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

    // Initialize LLM for summarization with explicit configuration
    const llm = new ChatCohere({
      apiKey: apiKey,
      model: 'command-r-plus',
      temperature: 0.3, // Lower temperature for more consistent summaries
      streaming: false,
      // maxTokens: 16000, // Commented out due to TypeScript error
    });

    // Create document type-specific prompts focused on essential elements
    /* const _getPromptForDocumentType = (docType: string, filename: string, text: string, metadata?: any, userMessage?: string) => {
      const baseInstructions = `You are an expert document analyst. Your task is to create a focused, strategic summary that captures the essential intelligence and actionable insights of the document. Focus on core elements that directly support decision-making and strategic understanding.${userMessage ? `\n\n🎯 CRITICAL USER REQUIREMENT: The user has specifically requested: "${userMessage}". This is a MANDATORY requirement that must be addressed throughout your entire analysis. Every section of your summary should incorporate this perspective and directly respond to this request. This is not optional - it is the primary focus of your analysis.` : ''}`;
      
      const documentInfo = `Document: ${filename}
Type: ${docType}
Length: ${text.length} characters
${metadata ? `Additional Info: ${JSON.stringify(metadata, null, 2)}` : ''}`;

      switch (docType?.toLowerCase()) {
        case 'pdf':
          return `${baseInstructions}

${documentInfo}

This is a PDF document. Please provide a focused, strategic summary that includes:

1. **Document Purpose and Scope**:
   - Primary purpose, objectives, and strategic importance
   - Target audience and intended outcomes

2. **Primary Themes and Essential Content**:
   - Core topics that directly support the main purpose
   - Critical facts, figures, and key data points
   - Essential findings and conclusions

3. **Key Facts and Authoritative Insights**:
   - Important statistics, metrics, and quantitative information
   - Significant research findings and evidence
   - Expert insights and authoritative perspectives

4. **Business Implications and Strategic Impact**:
   - How the content affects business operations and strategy
   - Financial implications and strategic considerations
   - Impact on decision-making and organizational performance

5. **Strategic Recommendations and Actions**:
   - Specific actionable recommendations with clear rationale
   - Critical decision points and priorities
   - Implementation considerations and next steps

6. **Key Takeaways and Conclusions**:
   - Essential insights for informed decision-making
   - Strategic value and bottom-line impact
   - Most important outcomes and findings

Focus on essential information that directly supports strategic understanding and decision-making. Omit detailed methodological descriptions, extensive stakeholder analysis, and alternative approaches unless directly relevant to core objectives.

Document Text:
${text}

Focused Strategic Summary:`;

        case 'docx':
        case 'word':
          return `${baseInstructions}

${documentInfo}

This is a Word document. Please provide a comprehensive, detailed summary that includes:

1. **Document Purpose & Context**:
   - **Primary Objective**: Detailed explanation of the main purpose, goals, and intended outcomes
   - **Target Audience**: Specific audience identification with their likely interests and expertise levels
   - **Document Type**: Detailed classification (report, proposal, policy, manual, etc.) with context
   - **Creation Context**: Any background on why this document was created and its importance

2. **Comprehensive Content Analysis**:
   - **Major Topics**: Deep exploration of each primary subject with subtopics, relationships, and importance rankings
   - **Key Arguments**: Detailed analysis of main points, supporting evidence, counterarguments, and logical flow
   - **Critical Information**: All significant data, statistics, research findings, case studies, and their implications
   - **Methodological Approaches**: Any research methods, analytical frameworks, or systematic approaches used

3. **Detailed Information Categories**:
   - **Factual Content**: Specific facts, figures, dates, names, locations, and quantitative data with context
   - **Analytical Content**: Interpretations, assessments, evaluations, and analytical conclusions
   - **Prescriptive Content**: Recommendations, guidelines, procedures, and best practices with rationale
   - **Comparative Content**: Benchmarks, comparisons, alternatives, and competitive analysis

4. **Structural & Organizational Analysis**:
   - **Document Architecture**: Detailed breakdown of sections, subsections, and their specific functions
   - **Information Hierarchy**: How information is prioritized and structured throughout the document
   - **Narrative Flow**: Logical progression, transitions, and how arguments build upon each other
   - **Supporting Materials**: Analysis of tables, charts, appendices, and supplementary information

5. **Stakeholder & Impact Analysis**:
   - **Key Players**: Detailed identification of all parties mentioned, their roles, and relationships
   - **Affected Parties**: Who will be impacted by the content and how
   - **Decision Makers**: Key decision points and who needs to act on the information
   - **Implementation Roles**: Specific responsibilities and accountabilities outlined

6. **Strategic Intelligence**:
   - **Business Implications**: How the content affects business operations, strategy, or performance
   - **Risk Analysis**: Detailed assessment of risks, challenges, limitations, and mitigation strategies
   - **Opportunity Identification**: Growth opportunities, advantages, and positive developments
   - **Compliance & Regulatory**: Any regulatory, legal, or compliance considerations

7. **Actionable Intelligence**:
   - **Immediate Action Items**: Specific tasks, deadlines, and responsible parties with priority levels
   - **Strategic Decisions**: Key decisions that need to be made based on the document content
   - **Implementation Planning**: Detailed steps for putting recommendations into practice
   - **Follow-up Requirements**: Additional research, analysis, or documentation needed
   - **Success Metrics**: How to measure successful implementation or achievement of objectives

8. **Critical Analysis**:
   - **Assumptions**: Key assumptions made in the document and their validity
   - **Gaps & Limitations**: What information might be missing or areas needing further exploration
   - **Alternative Perspectives**: Other viewpoints or approaches that could be considered
   - **Quality Assessment**: Credibility, thoroughness, and reliability of the information presented

Provide extensive detail while maintaining clear structure. Include specific examples, data points, and quotes where they add value.

Document Text:
${text}

Comprehensive Detailed Summary:`;

        case 'pptx':
        case 'powerpoint':
          // Check if slide-by-slide mode is enabled
          const isSlideBySlide = metadata?.useSlideBySlide === true;
          
          if (isSlideBySlide) {
            return `${baseInstructions}

${documentInfo}

This is a PowerPoint presentation formatted for slide-by-slide analysis. Please provide an extremely detailed, comprehensive summary that analyzes each slide individually and then provides deep overall synthesis.

Your summary should include:

1. **Detailed Slide-by-Slide Analysis**: For each slide (marked with **Slide X:**), provide:
   - **Slide Purpose & Function**: Specific role this slide plays in the overall narrative and why it's positioned here
   - **Core Content Analysis**: Comprehensive breakdown of all text, bullet points, and key messages with their significance
   - **Visual Elements**: Detailed description of charts, graphs, images, diagrams, and their analytical importance
   - **Data Analysis**: All quantitative information, statistics, trends, and their implications explained
   - **Strategic Content**: Key insights, recommendations, decisions, or strategic directions presented
   - **Audience Engagement**: How this slide is designed to engage, persuade, or inform the audience
   - **Supporting Evidence**: Any research, case studies, examples, or proof points provided
   - **Transition & Flow**: How this slide connects to previous and subsequent slides

2. **Comprehensive Presentation Synthesis**:
   
   **A. Strategic Overview**:
   - **Presentation Purpose**: Detailed analysis of primary objectives, secondary goals, and hidden agendas
   - **Central Message**: Core thesis with supporting arguments and evidence hierarchy
   - **Value Proposition**: What unique value, solution, or opportunity is being presented
   - **Call to Action**: Specific actions the audience should take and decision points

   **B. Content Architecture**:
   - **Narrative Structure**: How the story unfolds, logical progression, and persuasive techniques used
   - **Information Hierarchy**: What information is prioritized and why, key emphasis points
   - **Supporting Framework**: Theoretical models, frameworks, or methodologies underlying the presentation
   - **Evidence Base**: Quality and types of evidence used to support claims

   **C. Audience & Context Analysis**:
   - **Target Audience**: Detailed profiling of intended audience, their expertise, interests, and decision-making authority
   - **Stakeholder Mapping**: All parties mentioned or affected, their relationships and interests
   - **Contextual Setting**: Business environment, market conditions, or situational factors
   - **Timing & Relevance**: Why this presentation is happening now and its urgency

   **D. Strategic Intelligence**:
   - **Business Implications**: Detailed impact on operations, strategy, finances, or competitive position
   - **Risk & Opportunity Matrix**: Comprehensive analysis of risks, challenges, opportunities, and potential outcomes
   - **Implementation Roadmap**: How recommendations or proposals would be executed
   - **Success Metrics**: KPIs, benchmarks, or success criteria for proposed initiatives

   **E. Technical & Analytical Depth**:
   - **Data Analysis**: Comprehensive breakdown of all quantitative information, trends, and projections
   - **Methodological Approach**: Research methods, analytical tools, or systematic approaches used
   - **Competitive Analysis**: Market positioning, competitive advantages, or industry comparisons
   - **Financial Implications**: Cost-benefit analysis, ROI considerations, or budget implications

   **F. Critical Assessment**:
   - **Strengths & Weaknesses**: Objective analysis of the presentation's strong and weak points
   - **Assumptions & Dependencies**: Key assumptions made and critical dependencies identified
   - **Alternative Scenarios**: Different outcomes or approaches that could be considered
   - **Information Gaps**: What additional information might be needed for complete understanding

Provide extensive detail for each slide while maintaining clear organization. Include specific data points, quotes, and examples throughout.

Document Text:
${text}

Comprehensive Slide-by-Slide Analysis:`;
          } else {
            return `${baseInstructions}

${documentInfo}

This is a PowerPoint presentation. Please provide an exceptionally detailed, comprehensive overall summary that captures not just the narrative and themes, but the strategic depth, analytical rigor, and complete intelligence contained within the presentation.

Your summary should include:

1. **Strategic Presentation Analysis**:
   - **Primary Objective**: Detailed explanation of the main purpose, underlying motivations, and intended outcomes
   - **Secondary Goals**: Supporting objectives, hidden agendas, or implicit purposes
   - **Central Thesis**: Core argument or message with its foundational logic and supporting pillars
   - **Value Proposition**: Unique value, solution, opportunity, or competitive advantage being presented
   - **Call to Action**: Specific decisions, actions, or commitments being requested from the audience

2. **Comprehensive Thematic Analysis**:
   - **Primary Themes**: Deep exploration of major topics with their interconnections and relative importance
   - **Supporting Themes**: Secondary topics and how they reinforce or complement the main themes
   - **Thematic Evolution**: How themes develop, build upon each other, and culminate throughout the presentation
   - **Cross-Theme Relationships**: Connections, tensions, or synergies between different thematic elements

3. **Detailed Argumentative Structure**:
   - **Core Arguments**: Each major argument with its logical structure, premises, and conclusions
   - **Evidence Hierarchy**: Types and quality of evidence used, from strongest to weakest support
   - **Logical Flow**: How arguments build sequentially and reinforce each other
   - **Persuasive Techniques**: Rhetorical strategies, emotional appeals, and credibility establishment methods
   - **Counter-Argument Handling**: How potential objections or alternatives are addressed

4. **Comprehensive Data & Information Analysis**:
   - **Quantitative Intelligence**: All numerical data, statistics, financial information, and metrics with context
   - **Qualitative Insights**: Research findings, case studies, expert opinions, and observational data
   - **Trend Analysis**: Patterns, projections, and future implications of data presented
   - **Benchmark Comparisons**: Competitive analysis, industry standards, or performance comparisons
   - **Validation Methods**: How data credibility is established and sources are verified

5. **Strategic Intelligence & Business Implications**:
   - **Market Analysis**: Industry conditions, competitive landscape, and market opportunities
   - **Business Impact**: Effects on operations, strategy, finances, human resources, and organizational capabilities
   - **Risk Assessment**: Comprehensive analysis of potential risks, challenges, and mitigation strategies
   - **Opportunity Matrix**: Growth opportunities, strategic advantages, and potential value creation
   - **Implementation Strategy**: How recommendations would be executed, timelines, and resource requirements

6. **Stakeholder & Audience Analysis**:
   - **Primary Audience**: Detailed profiling of main audience with their expertise, authority, and interests
   - **Secondary Stakeholders**: Other parties affected or involved with their specific concerns
   - **Decision-Making Authority**: Who has power to act on the presentation content
   - **Influence Mapping**: Key influencers, champions, and potential resistance points
   - **Communication Strategy**: How the presentation is tailored to audience needs and preferences

7. **Technical & Methodological Depth**:
   - **Research Foundation**: Methods, sources, and analytical approaches underlying the presentation
   - **Technical Specifications**: Any technical requirements, standards, or detailed criteria
   - **Process Analysis**: Workflows, procedures, or systematic approaches described
   - **Quality Assurance**: Validation methods, testing approaches, or verification processes

8. **Strategic Recommendations & Outcomes**:
   - **Immediate Actions**: Short-term steps with specific timelines and responsibilities
   - **Strategic Initiatives**: Long-term projects or strategic changes with implementation phases
   - **Resource Requirements**: Budget, personnel, technology, or other resources needed
   - **Success Metrics**: KPIs, benchmarks, and measurement criteria for evaluating outcomes
   - **Contingency Planning**: Alternative approaches or fallback strategies

9. **Critical Analysis & Assessment**:
   - **Presentation Strengths**: What makes this presentation compelling and credible
   - **Potential Weaknesses**: Areas where arguments might be challenged or evidence is insufficient
   - **Assumptions Analysis**: Key assumptions made and their validity or risk
   - **Alternative Perspectives**: Other viewpoints or approaches that could be considered
   - **Information Gaps**: What additional information might strengthen the case

10. **Contextual Intelligence**:
    - **Environmental Factors**: External conditions affecting the presentation topic
    - **Timing Considerations**: Why this presentation is happening now and urgency factors
    - **Historical Context**: Background events or trends that inform the current situation
    - **Future Implications**: Long-term consequences and strategic positioning

Treat the presentation as a sophisticated strategic communication with multiple layers of meaning and intelligence. Provide rich detail while maintaining coherent narrative flow.

Document Text:
${text}

Comprehensive Strategic Presentation Analysis:`;
          }

        default:
          return `${baseInstructions}

${documentInfo}

Please provide an exceptionally detailed, comprehensive summary that includes:

1. **Comprehensive Document Analysis**:
   - **Document Classification**: Detailed type identification with purpose, scope, and intended use
   - **Creation Context**: Background on why this document exists and its strategic importance
   - **Authority & Credibility**: Source analysis, authorship credentials, and reliability assessment
   - **Version & Currency**: Document vintage, update status, and relevance timeline

2. **Detailed Content Examination**:
   - **Primary Themes**: Deep exploration of major topics with supporting details and interconnections
   - **Secondary Themes**: Supporting topics and how they complement or reinforce main themes
   - **Content Categories**: Factual information, analytical content, recommendations, procedures, etc.
   - **Information Density**: Assessment of detail level, comprehensiveness, and depth

3. **Critical Information Intelligence**:
   - **Key Facts & Data**: All important statistics, figures, dates, names, and quantitative information
   - **Research Findings**: Analysis of studies, investigations, or systematic research presented
   - **Expert Insights**: Professional opinions, expert analysis, or authoritative perspectives
   - **Case Studies**: Specific examples, scenarios, or real-world applications described

4. **Structural & Organizational Analysis**:
   - **Document Architecture**: Detailed breakdown of sections, subsections, and organizational logic
   - **Information Hierarchy**: How information is prioritized, categorized, and presented
   - **Narrative Flow**: Logical progression, transitions, and how concepts build upon each other
   - **Supporting Elements**: Analysis of appendices, references, tables, charts, and supplementary materials

5. **Strategic Intelligence**:
   - **Business Implications**: Impact on operations, strategy, decision-making, and organizational performance
   - **Stakeholder Analysis**: All parties mentioned, affected, or involved with their specific interests
   - **Risk & Opportunity Assessment**: Comprehensive analysis of challenges and potential benefits
   - **Competitive Intelligence**: Market insights, competitive positioning, or industry analysis

6. **Actionable Intelligence**:
   - **Recommendations**: Specific actions suggested with rationale and implementation considerations
   - **Decision Points**: Key decisions that need to be made based on the document content
   - **Implementation Guidance**: How to put information or recommendations into practice
   - **Success Criteria**: Metrics, benchmarks, or evaluation methods for measuring outcomes

7. **Technical & Methodological Depth**:
   - **Methodologies**: Research methods, analytical approaches, or systematic processes described
   - **Technical Specifications**: Standards, requirements, protocols, or detailed criteria
   - **Quality Controls**: Validation methods, verification processes, or quality assurance measures
   - **Best Practices**: Recommended approaches, proven methods, or industry standards

8. **Critical Analysis**:
   - **Strengths & Limitations**: Objective assessment of the document's strong points and potential weaknesses
   - **Assumptions**: Key assumptions made and their validity or potential risks
   - **Alternative Approaches**: Other methods, perspectives, or solutions that could be considered
   - **Information Gaps**: Areas where additional information might be beneficial

Provide extensive detail while maintaining clear organization and readability. Include specific examples, data points, and quotes where they enhance understanding.

Document Text:
${text}

Detailed Comprehensive Summary:`;
      }
    }; */

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
      // Single chunk - use multi-part strategy to overcome token limits
      console.log('Generating summary for single chunk using multi-part strategy...');
      
      // Check if this is a PowerPoint with slide-by-slide mode enabled
      const isSlideBySlide = (documentType?.toLowerCase() === 'pptx' || documentType?.toLowerCase() === 'powerpoint') && 
                            metadata?.useSlideBySlide === true;
      
      console.log('Slide-by-slide mode enabled:', isSlideBySlide);
      
      // Strategy: Generate summary in multiple focused parts then combine
      const parts = [];
      
      if (isSlideBySlide) {
        // SLIDE-BY-SLIDE MODE: Focus on detailed slide analysis
        
        // Part 1: Slide-by-Slide Content Analysis
        const part1Prompt = `You are an expert presentation analyst. Create the FIRST PART of a comprehensive SLIDE-BY-SLIDE analysis for this PowerPoint presentation. This part should focus on detailed individual slide analysis.

${userMessage ? `🎯 CRITICAL USER REQUIREMENT: "${userMessage}" - This must be the PRIMARY FOCUS throughout your slide-by-slide analysis.\n\n` : ''}
Document: ${filename}
Type: ${documentType}
Length: ${text.length} characters
Mode: SLIDE-BY-SLIDE ANALYSIS

For this FIRST PART, provide detailed SLIDE-BY-SLIDE analysis:

**DETAILED SLIDE-BY-SLIDE BREAKDOWN**:
For each slide (marked with **Slide X:**), provide:
- **Slide Purpose & Function**: Specific role this slide plays in the overall narrative
- **Core Content Analysis**: Comprehensive breakdown of all text, bullet points, and key messages
- **Visual Elements**: Detailed description of charts, graphs, images, and their significance
- **Data Analysis**: All quantitative information, statistics, trends, and implications
- **Strategic Content**: Key insights, recommendations, decisions, or strategic directions
- **Customer Value**: Specific value propositions and benefits highlighted on this slide
- **Competitive Analysis**: Any competitive comparisons or positioning mentioned

Analyze approximately the first half of the slides in detail. This is PART 1 of a slide-by-slide analysis.

Document Text:
${text}

Detailed Slide-by-Slide Analysis (Part 1):`;
        
        console.log('Generating Part 1: Slide-by-Slide Content Analysis...');
        const part1Response = await llm.invoke(part1Prompt);
        parts.push(`**PART 1: SLIDE-BY-SLIDE CONTENT ANALYSIS**\n${part1Response.content as string}`);
        
        console.log('Part 1 length:', (part1Response.content as string).length);
        console.log('Part 1 ends with:', (part1Response.content as string).slice(-150));
        
        // Part 2: Remaining Slides and Strategic Analysis
        const part2Prompt = `You are continuing a comprehensive SLIDE-BY-SLIDE analysis. Create the SECOND PART focusing on remaining slides and strategic insights.

${userMessage ? `🎯 CRITICAL USER REQUIREMENT: "${userMessage}" - Continue addressing this requirement for each remaining slide.\n\n` : ''}
Document: ${filename}
Type: ${documentType}
Mode: SLIDE-BY-SLIDE ANALYSIS (Continuation)

For this SECOND PART, provide:

**REMAINING SLIDE-BY-SLIDE ANALYSIS**:
Continue the detailed slide-by-slide breakdown for remaining slides:
- **Individual Slide Analysis**: Complete analysis of each remaining slide
- **Slide Transitions**: How slides connect and build upon each other
- **Technical Details**: Any technical specifications or implementation details
- **Business Implications**: Operational and strategic impacts from each slide
- **Customer Value Propositions**: Value delivery and benefits for each slide
- **Competitive Positioning**: Market positioning and competitive advantages

Analyze the remaining slides in the same detailed format. This is PART 2 of the slide-by-slide analysis.

Document Text:
${text}

Detailed Slide-by-Slide Analysis (Part 2):`;
        
        console.log('Generating Part 2: Remaining Slides and Strategic Analysis...');
        const part2Response = await llm.invoke(part2Prompt);
        parts.push(`**PART 2: REMAINING SLIDES & STRATEGIC ANALYSIS**\n${part2Response.content as string}`);
        
        console.log('Part 2 length:', (part2Response.content as string).length);
        console.log('Part 2 ends with:', (part2Response.content as string).slice(-150));
        
        // Part 3: Comprehensive Synthesis and Strategic Summary
        const part3Prompt = `You are completing a comprehensive SLIDE-BY-SLIDE analysis. Create the FINAL PART with overall synthesis and strategic conclusions.

${userMessage ? `🎯 CRITICAL USER REQUIREMENT: "${userMessage}" - Provide final comprehensive synthesis addressing this requirement across all slides.\n\n` : ''}
Document: ${filename}
Type: ${documentType}
Mode: SLIDE-BY-SLIDE ANALYSIS (Final Synthesis)

For this FINAL PART, provide comprehensive synthesis:

**PRESENTATION SYNTHESIS**:
- **Overall Narrative Flow**: How all slides work together to tell the complete story
- **Key Themes Across Slides**: Major themes that span multiple slides
- **Strategic Message Architecture**: How arguments build throughout the presentation
- **Comprehensive Customer Value Summary**: All customer values identified across all slides
- **Complete Competitive Analysis Summary**: All competitive comparisons and positioning across slides
- **Implementation Roadmap**: Combined action items and next steps from all slides
- **Strategic Recommendations**: Overall strategic insights and recommendations
- **Final Conclusions**: Key takeaways and most important insights from the entire presentation

Provide a comprehensive synthesis that ties together all slide analyses. This is the FINAL PART of the slide-by-slide analysis.

Document Text:
${text}

Comprehensive Slide-by-Slide Synthesis:`;
        
        console.log('Generating Part 3: Comprehensive Synthesis and Strategic Summary...');
        const part3Response = await llm.invoke(part3Prompt);
        parts.push(`**PART 3: COMPREHENSIVE SYNTHESIS & STRATEGIC SUMMARY**\n${part3Response.content as string}`);
        
        console.log('Part 3 length:', (part3Response.content as string).length);
        console.log('Part 3 ends with:', (part3Response.content as string).slice(-150));
        
      } else {
        // REGULAR MODE: Standard document analysis
        
        // Part 1: Executive Summary and Main Content
        const part1Prompt = `You are an expert document analyst. Create the FIRST PART of a comprehensive summary for this ${documentType} document. This part should focus on executive summary and main content analysis.

${userMessage ? `🎯 CRITICAL USER REQUIREMENT: "${userMessage}" - This must be the PRIMARY FOCUS throughout your analysis.\n\n` : ''}
Document: ${filename}
Type: ${documentType}
Length: ${text.length} characters

For this FIRST PART, provide detailed analysis of:

**1. Executive Summary & Overview**:
- Document purpose, scope, and strategic importance
- Primary objectives and intended outcomes
- Target audience and stakeholder analysis
- Overall value proposition and key messages

**2. Main Content Analysis**:
- Primary themes and core topics with detailed exploration
- Key arguments, findings, and conclusions
- Critical information including facts, figures, and data
- Important methodologies, processes, or frameworks

**3. Strategic Intelligence**:
- Business implications and operational impacts
- Stakeholder roles and responsibilities
- Risk assessments and opportunity identification
- Competitive positioning and market insights

Provide extensive detail for these sections. This is PART 1 of a multi-part summary.

Document Text:
${text}

Detailed Part 1 Analysis:`;
      
        console.log('Generating Part 1: Executive Summary and Main Content...');
        const part1Response = await llm.invoke(part1Prompt);
        parts.push(`**PART 1: EXECUTIVE SUMMARY & MAIN CONTENT**\n${part1Response.content as string}`);
        
        console.log('Part 1 length:', (part1Response.content as string).length);
        console.log('Part 1 ends with:', (part1Response.content as string).slice(-150));
        
        // Part 2: Technical Details and Implementation
        const part2Prompt = `You are continuing a comprehensive summary analysis. Create the SECOND PART focusing on technical details and implementation aspects.

${userMessage ? `🎯 CRITICAL USER REQUIREMENT: "${userMessage}" - Continue addressing this requirement in this section.\n\n` : ''}
Document: ${filename}
Type: ${documentType}

For this SECOND PART, provide detailed analysis of:

**4. Technical & Methodological Analysis**:
- Detailed technical specifications and requirements
- Research methods and analytical approaches
- Quality controls and validation processes
- Best practices and proven methodologies

**5. Implementation & Action Items**:
- Specific recommendations with implementation steps
- Decision points and required actions
- Resource requirements and timelines
- Success metrics and evaluation criteria

**6. Supporting Evidence & Data**:
- Quantitative analysis and statistical information
- Case studies and real-world applications
- Expert insights and authoritative perspectives
- Benchmark comparisons and industry standards

Provide extensive detail for these sections. This is PART 2 of a multi-part summary.

Document Text:
${text}

Detailed Part 2 Analysis:`;
        
        console.log('Generating Part 2: Technical Details and Implementation...');
        const part2Response = await llm.invoke(part2Prompt);
        parts.push(`**PART 2: TECHNICAL DETAILS & IMPLEMENTATION**\n${part2Response.content as string}`);
        
        console.log('Part 2 length:', (part2Response.content as string).length);
        console.log('Part 2 ends with:', (part2Response.content as string).slice(-150));
        
        // Part 3: Strategic Insights and Future Considerations
        const part3Prompt = `You are completing a comprehensive summary analysis. Create the FINAL PART focusing on strategic insights and future considerations.

${userMessage ? `🎯 CRITICAL USER REQUIREMENT: "${userMessage}" - Provide final comprehensive analysis addressing this requirement.\n\n` : ''}
Document: ${filename}
Type: ${documentType}

For this FINAL PART, provide detailed analysis of:

**7. Strategic Assessment & Critical Analysis**:
- Document strengths and potential limitations
- Assumptions analysis and validity assessment
- Alternative approaches and competitive considerations
- Information gaps and areas for further development

**8. Future Implications & Long-term Considerations**:
- Strategic positioning and competitive advantages
- Long-term trends and market evolution
- Scalability and sustainability factors
- Innovation opportunities and emerging technologies

**9. Comprehensive Conclusions & Summary**:
- Key takeaways and most important insights
- Final recommendations and strategic priorities
- Integration opportunities and synergy potential
- Next steps and follow-up requirements

Provide extensive detail for these sections. This is the FINAL PART of the comprehensive summary.

Document Text:
${text}

Detailed Final Part Analysis:`;
        
        console.log('Generating Part 3: Strategic Insights and Conclusions...');
        const part3Response = await llm.invoke(part3Prompt);
        parts.push(`**PART 3: STRATEGIC INSIGHTS & CONCLUSIONS**\n${part3Response.content as string}`);
        
        console.log('Part 3 length:', (part3Response.content as string).length);
        console.log('Part 3 ends with:', (part3Response.content as string).slice(-150));
      }
      
      // Combine all parts
      finalSummary = parts.join('\n\n' + '='.repeat(80) + '\n\n');
      
      console.log('=== MULTI-PART RESPONSE DETAILS ===');
      console.log('Total parts generated:', parts.length);
      console.log('Combined final length:', finalSummary.length);
      console.log('Final response ends with:', finalSummary.slice(-100));
      console.log('Mode used:', isSlideBySlide ? 'SLIDE-BY-SLIDE' : 'REGULAR');
      console.log('=====================================');
    } else {
      // Multiple chunks - summarize each chunk then combine
      console.log('Processing multiple chunks...');
      const chunkSummaries = [];

      for (let i = 0; i < chunks.length; i++) {
        console.log(`Summarizing chunk ${i + 1}/${chunks.length}...`);
        
        const chunkPrompt = `You are creating a detailed analysis of part ${i + 1} of ${chunks.length} of a ${documentType} document named "${filename}". This section analysis will be combined with other sections to create a comprehensive document summary.${userMessage ? `\n\n🎯 CRITICAL USER REQUIREMENT: The user has specifically requested: "${userMessage}". This is a MANDATORY requirement that must be the PRIMARY FOCUS of your analysis. Every aspect of your section analysis must directly address this requirement. Do not treat this as optional context - it is the main directive for your analysis.` : ''}

Please provide a thorough, detailed analysis of this section, focusing on:

**Content Analysis:**
- Key topics, themes, and main points with supporting details
- Critical information including facts, figures, statistics, and specific data
- Important arguments, conclusions, or findings with their significance
- Any methodologies, processes, or technical information described

**Strategic Information:**
- Recommendations, action items, or strategic directions mentioned
- Stakeholders, parties, or entities discussed and their roles
- Risks, challenges, opportunities, or benefits identified
- Business implications or operational impacts described

**Detailed Elements:**
- Specific examples, case studies, or real-world applications
- Important quotes, definitions, or key statements
- Quantitative data with context and implications
- Relationships to other concepts or sections (if apparent)

**Structure & Flow:**
- How this section is organized and its internal logic
- Transition elements or connections to broader document themes
- Relative importance of information within this section

Provide comprehensive detail while maintaining clear organization. This detailed section analysis will help create a more thorough final summary.

Document Section ${i + 1}:
${chunks[i]}

Detailed Section Analysis:`;

        const chunkResponse = await llm.invoke(chunkPrompt);
        const chunkContent = chunkResponse.content as string;
        
        console.log(`=== CHUNK ${i + 1} RESPONSE DETAILS ===`);
        console.log('Chunk response length:', chunkContent.length);
        console.log('Chunk response ends with:', chunkContent.slice(-50));
        console.log('=======================================');
        
        chunkSummaries.push(`**Section ${i + 1} (Detailed Analysis):**\n${chunkContent}`);
      }

      // Combine chunk summaries into final summary
      console.log('Combining chunk summaries into final summary...');
      const combinedSummaries = chunkSummaries.join('\n\n');
      
      // Create document type-specific final prompt
      let finalPrompt;
      if (documentType?.toLowerCase() === 'pptx' || documentType?.toLowerCase() === 'powerpoint') {
        const isSlideBySlide = metadata?.useSlideBySlide === true;
        
        if (isSlideBySlide) {
          finalPrompt = `You are creating an exceptionally detailed, comprehensive final summary from multiple section analyses of a PowerPoint presentation processed in slide-by-slide mode.

Document: ${filename}
Type: ${documentType}
Total sections processed: ${chunks.length}
Mode: Slide-by-slide analysis${userMessage ? `\n\n🎯 CRITICAL USER REQUIREMENT: The user has specifically requested: "${userMessage}". This is a MANDATORY requirement that must be the PRIMARY FOCUS of your final summary. Every section, every slide analysis, and every insight must directly address this requirement. This is not optional context - it is the main directive that should drive your entire analysis.` : ''}

Detailed Section Analyses:
${combinedSummaries}

Please create a unified, highly detailed final summary that provides comprehensive slide-by-slide insights and strategic synthesis:

1. **Comprehensive Slide-by-Slide Intelligence**: 
   - Detailed synthesis of key findings from each slide analysis
   - Specific content, data, and strategic elements from individual slides
   - Visual elements, charts, and supporting materials analysis
   - Slide-specific recommendations and action items

2. **Advanced Narrative Architecture**:
   - How slides connect, build upon each other, and create compelling flow
   - Persuasive techniques and presentation strategies employed
   - Information hierarchy and emphasis patterns throughout
   - Transition strategies and logical progression analysis

3. **Deep Thematic Analysis**:
   - Primary and secondary themes with detailed exploration
   - Cross-slide thematic connections and reinforcement patterns
   - Thematic evolution and development throughout presentation
   - Supporting evidence and data for each major theme

4. **Strategic Communication Analysis**:
   - Core messages with supporting pillars and evidence hierarchy
   - Value propositions and competitive advantages presented
   - Calls to action with specific requests and expected outcomes
   - Audience engagement strategies and persuasion techniques

5. **Comprehensive Strategic Intelligence**:
   - Business implications and operational impacts detailed
   - Risk assessments and opportunity matrices from all slides
   - Implementation roadmaps and resource requirements
   - Success metrics and evaluation criteria across presentation

6. **Stakeholder & Audience Deep Dive**:
   - Target audience profiling with expertise and authority levels
   - Stakeholder mapping and influence analysis
   - Decision-making authority and implementation responsibilities
   - Communication strategy and audience-specific messaging

7. **Technical & Analytical Depth**:
   - All quantitative data, metrics, and statistical information
   - Research methodologies and analytical frameworks used
   - Technical specifications and detailed requirements
   - Quality validation and credibility assessment

8. **Critical Assessment & Analysis**:
   - Presentation strengths and potential areas for improvement
   - Assumptions analysis and dependency identification
   - Alternative approaches and competitive considerations
   - Information gaps and areas for further development

Provide extensive detail while maintaining clear organization and strategic focus. Create a comprehensive resource that captures the full intelligence and strategic value of the presentation.

Comprehensive Final Slide-by-Slide Analysis:`;
        } else {
          finalPrompt = `You are creating an exceptionally detailed, comprehensive final summary from multiple section analyses of a PowerPoint presentation.

Document: ${filename}
Type: ${documentType}
Total sections processed: ${chunks.length}${userMessage ? `\n\n🎯 CRITICAL USER REQUIREMENT: The user has specifically requested: "${userMessage}". This is a MANDATORY requirement that must be the PRIMARY FOCUS of your final summary. Every section and every analysis must directly address this requirement. This is not optional context - it is the main directive that should drive your entire analysis.` : ''}

Detailed Section Analyses:
${combinedSummaries}

Please create a unified, highly detailed final summary that captures the complete strategic intelligence, narrative depth, and comprehensive themes of the presentation:

1. **Strategic Presentation Intelligence**:
   - Primary and secondary objectives with underlying motivations
   - Central thesis with foundational logic and supporting pillars
   - Value propositions and competitive advantages detailed
   - Calls to action with specific decisions and commitments requested

2. **Comprehensive Thematic Architecture**:
   - Primary themes with deep exploration and supporting evidence
   - Secondary themes and their reinforcement of main concepts
   - Thematic evolution and development throughout presentation
   - Cross-thematic relationships and strategic connections

3. **Advanced Argumentative Analysis**:
   - Core arguments with logical structure and evidence hierarchy
   - Supporting data, research, and credibility establishment
   - Persuasive techniques and rhetorical strategies employed
   - Counter-argument handling and alternative consideration

4. **Detailed Information & Data Intelligence**:
   - All quantitative data, statistics, and financial information
   - Qualitative insights, research findings, and expert opinions
   - Trend analysis, projections, and future implications
   - Benchmark comparisons and competitive intelligence

5. **Strategic Business Analysis**:
   - Market conditions and competitive landscape assessment
   - Business impact on operations, strategy, and performance
   - Risk assessment with mitigation strategies identified
   - Opportunity matrix and value creation potential
   - Implementation strategy with timelines and resources

6. **Comprehensive Stakeholder Intelligence**:
   - Primary audience profiling with authority and expertise levels
   - Secondary stakeholders and their specific interests
   - Decision-making authority and influence mapping
   - Communication strategy and audience-tailored messaging

7. **Technical & Methodological Depth**:
   - Research foundation and analytical approaches
   - Technical specifications and detailed requirements
   - Process analysis and systematic approaches
   - Quality assurance and validation methods

8. **Strategic Outcomes & Recommendations**:
   - Immediate actions with timelines and responsibilities
   - Strategic initiatives and long-term implementation
   - Resource requirements and budget considerations
   - Success metrics and evaluation criteria
   - Contingency planning and alternative strategies

9. **Critical Assessment & Analysis**:
   - Presentation strengths and credibility factors
   - Potential weaknesses and areas for challenge
   - Assumptions analysis and validity assessment
   - Alternative perspectives and approaches
   - Information gaps and additional research needs

10. **Contextual & Future Intelligence**:
    - Environmental factors and market conditions
    - Timing considerations and urgency factors
    - Historical context and background trends
    - Future implications and strategic positioning

Treat the presentation as sophisticated strategic communication with multiple intelligence layers. Provide rich detail while maintaining coherent narrative flow and strategic focus.

Comprehensive Strategic Presentation Analysis:`;
        }
      } else {
        finalPrompt = `You are creating an exceptionally detailed, comprehensive final summary from multiple section analyses of a ${documentType} document.

Document: ${filename}
Type: ${documentType}
Total sections processed: ${chunks.length}${userMessage ? `\n\n🎯 CRITICAL USER REQUIREMENT: The user has specifically requested: "${userMessage}". This is a MANDATORY requirement that must be the PRIMARY FOCUS of your final summary. Every section and every analysis must directly address this requirement. This is not optional context - it is the main directive that should drive your entire analysis.` : ''}

Detailed Section Analyses:
${combinedSummaries}

Please create a unified, highly detailed final summary that provides comprehensive intelligence and strategic depth:

1. **Comprehensive Document Intelligence**:
   - Document purpose, scope, and strategic importance with context
   - Authority, credibility, and reliability assessment
   - Creation context and intended use with background
   - Version currency and relevance timeline

2. **Advanced Content Integration**:
   - Primary themes with deep exploration and interconnections
   - Secondary themes and supporting concept relationships
   - Content categorization with factual, analytical, and prescriptive elements
   - Information density and comprehensiveness assessment

3. **Critical Information Synthesis**:
   - All key facts, data, statistics, and quantitative information
   - Research findings and systematic analysis results
   - Expert insights and authoritative perspectives
   - Case studies and real-world applications detailed

4. **Structural & Organizational Intelligence**:
   - Document architecture and organizational logic
   - Information hierarchy and prioritization patterns
   - Narrative flow and conceptual progression
   - Supporting elements and supplementary material analysis

5. **Strategic Business Analysis**:
   - Business implications and operational impacts
   - Stakeholder analysis with roles and interests
   - Risk and opportunity assessment comprehensive
   - Competitive intelligence and market insights

6. **Actionable Intelligence Framework**:
   - Specific recommendations with implementation considerations
   - Decision points and required actions detailed
   - Implementation guidance and practical steps
   - Success criteria and measurement methods

7. **Technical & Methodological Analysis**:
   - Research methods and analytical approaches
   - Technical specifications and detailed criteria
   - Quality controls and validation processes
   - Best practices and proven methodologies

8. **Critical Assessment & Evaluation**:
   - Document strengths and potential limitations
   - Assumptions analysis and validity assessment
   - Alternative approaches and perspective considerations
   - Information gaps and additional research needs

9. **Strategic Integration & Insights**:
   - Cross-section themes and relationship mapping
   - Strategic implications and long-term considerations
   - Integration opportunities and synergy identification
   - Future research and development directions

Provide extensive detail while maintaining clear organization and strategic focus. Create a comprehensive resource that captures the full intelligence value of the complete document.

Detailed Comprehensive Final Summary:`;
      }

      const finalResponse = await llm.invoke(finalPrompt);
      finalSummary = finalResponse.content as string;
      
      console.log('=== FINAL MULTI-CHUNK RESPONSE DETAILS ===');
      console.log('Combined summaries length:', combinedSummaries.length);
      console.log('Final response length:', finalSummary.length);
      console.log('Final response ends with:', finalSummary.slice(-100));
      console.log('==========================================');
    }

    console.log('Summary generation completed successfully');
    console.log('Final summary length:', finalSummary.length);
    console.log('Final summary character count (detailed):', finalSummary.split('').length);

    // Extract key topics using enhanced analysis
    const keyTopicsPrompt = `Based on this comprehensive document summary, extract 8-12 key topics, themes, and strategic elements that represent the most important aspects of the document. Include both primary themes and important secondary topics.

Provide a comma-separated list that includes:
- Major themes and primary topics
- Important strategic concepts
- Key stakeholders or entities
- Critical findings or conclusions
- Technical or methodological elements
- Business or operational areas

Make topics specific and actionable rather than generic. Only return the topics as a comma-separated list, nothing else.

Comprehensive Summary:
${finalSummary}

Key Topics and Themes:`;

    const topicsResponse = await llm.invoke(keyTopicsPrompt);
    const keyTopics = (topicsResponse.content as string)
      .split(',')
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0)
      .slice(0, 12); // Limit to 12 topics for more comprehensive coverage

    console.log('Extracted key topics:', keyTopics);

    console.log('=== FINAL RESPONSE TO FRONTEND ===');
    console.log('Summary being sent length:', finalSummary.length);
    console.log('Summary being sent ends with:', finalSummary.slice(-200));
    console.log('Is summary complete?', !finalSummary.endsWith('...') && !finalSummary.slice(-50).includes('ity,'));
    console.log('===================================');
    
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
