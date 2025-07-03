'use client';

interface MarkdownTableProps {
  content: string;
}

export default function MarkdownTable({ content }: MarkdownTableProps) {
  // Function to detect and parse markdown tables
  const parseMarkdownTables = (text: string) => {
    const parts = [];
    let currentIndex = 0;
    
    // Regex to match markdown tables
    const tableRegex = /\|(.+)\|\n\|[-\s\|:]+\|\n((?:\|.+\|\n?)+)/g;
    let match;
    
    while ((match = tableRegex.exec(text)) !== null) {
      // Add text before the table
      if (match.index > currentIndex) {
        parts.push({
          type: 'text',
          content: text.slice(currentIndex, match.index)
        });
      }
      
      // Parse the table
      const headerRow = match[1];
      const dataRows = match[2].trim();
      
      // Parse headers
      const headers = headerRow.split('|')
        .map(h => h.trim())
        .filter(h => h.length > 0);
      
      // Parse data rows
      const rows = dataRows.split('\n')
        .map(row => row.split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0)
        )
        .filter(row => row.length > 0);
      
      parts.push({
        type: 'table',
        headers,
        rows
      });
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(currentIndex)
      });
    }
    
    return parts;
  };

  const parts = parseMarkdownTables(content);

  return (
    <div>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return (
            <div key={index} className="whitespace-pre-wrap">
              {part.content}
            </div>
          );
        } else if (part.type === 'table') {
          return (
            <div key={index} className="my-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-200">
                      <tr>
                        {part.headers.map((header, headerIndex) => (
                          <th 
                            key={headerIndex}
                            className="px-3 py-2 text-left font-medium text-blue-800 border-r border-blue-300 last:border-r-0"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {part.rows.map((row, rowIndex) => (
                        <tr 
                          key={rowIndex} 
                          className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-blue-25'} hover:bg-blue-100 transition-colors`}
                        >
                          {row.map((cell, cellIndex) => (
                            <td 
                              key={cellIndex}
                              className="px-3 py-2 border-r border-blue-200 last:border-r-0 border-b border-blue-100"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
