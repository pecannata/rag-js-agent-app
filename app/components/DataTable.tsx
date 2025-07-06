'use client';

import { useState } from 'react';

interface DataTableProps {
  data: any;
  title?: string;
}

export default function DataTable({ data, title = "Database Results" }: DataTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper function to detect if data is tabular
  const isTabularData = (data: any): boolean => {
    return Array.isArray(data) && 
           data.length > 0 && 
           typeof data[0] === 'object' && 
           data[0] !== null;
  };

  // Helper function to get column headers
  const getHeaders = (data: any[]): string[] => {
    if (data.length === 0) return [];
    const firstRow = data[0];
    return Object.keys(firstRow);
  };

  // Helper function to format cell values
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  // If data is not tabular, show as JSON
  if (!isTabularData(data)) {
    return (
      <div className="mt-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-2 bg-blue-200 border border-blue-300 rounded-md hover:bg-blue-300 text-blue-800"
        >
          <span className="font-medium">{title}</span>
          <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
        
        {isExpanded && (
          <div className="mt-2 p-3 bg-white border border-blue-300 rounded-md">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  const headers = getHeaders(data);
  const maxRowsToShow = 10; // Limit initial display
  const displayData = isExpanded ? data : data.slice(0, maxRowsToShow);

  return (
    <div className="mt-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-100 px-4 py-2 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-blue-800">{title}</h3>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <span>{data.length} row{data.length !== 1 ? 's' : ''}</span>
              {data.length > maxRowsToShow && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-blue-700 hover:text-blue-900 font-medium"
                >
                  {isExpanded ? 'Show Less' : 'Show All'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-200">
              <tr>
                {headers.map((header, index) => (
                  <th 
                    key={index}
                    className="px-3 py-2 text-left font-medium text-blue-800 border-r border-blue-300 last:border-r-0"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row: any, rowIndex: number) => (
                <tr 
                  key={rowIndex} 
                  className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-blue-25'} hover:bg-blue-100 transition-colors`}
                >
                  {headers.map((header, cellIndex) => (
                    <td 
                      key={cellIndex}
                      className="px-3 py-2 border-r border-blue-200 last:border-r-0 border-b border-blue-100"
                    >
                      <div className="max-w-xs truncate" title={formatCellValue(row[header])}>
                        {formatCellValue(row[header])}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer for truncated data */}
        {!isExpanded && data.length > maxRowsToShow && (
          <div className="bg-blue-50 px-4 py-2 border-t border-blue-200 text-center">
            <button
              onClick={() => setIsExpanded(true)}
              className="text-blue-700 hover:text-blue-900 font-medium text-sm"
            >
              + Show {data.length - maxRowsToShow} more rows
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
