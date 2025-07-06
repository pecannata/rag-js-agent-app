/**
 * Performance monitoring utilities for document processing
 */

export interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: number;
  documentSize: number;
  operationType: string;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;

  constructor(operationType: string, documentSize: number) {
    this.metrics = {
      startTime: performance.now(),
      documentSize,
      operationType,
    };
    
    // Log initial memory usage if available
    if ((performance as any).memory) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }
    
    console.log(`🚀 Starting ${operationType} (${documentSize.toLocaleString()} chars)`);
  }

  finish(): PerformanceMetrics {
    this.metrics.endTime = performance.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;

    console.log(`✅ ${this.metrics.operationType} completed in ${this.metrics.duration.toFixed(2)}ms`);
    
    if (this.metrics.duration > 10000) { // > 10 seconds
      console.warn(`⚠️ Slow operation detected: ${this.metrics.operationType} took ${(this.metrics.duration / 1000).toFixed(1)}s`);
    }
    
    return { ...this.metrics };
  }

  getEstimatedTimeRemaining(progressPercent: number): number | null {
    if (progressPercent <= 0 || progressPercent >= 100) return null;
    
    const elapsed = performance.now() - this.metrics.startTime;
    const estimatedTotal = elapsed / (progressPercent / 100);
    const remaining = estimatedTotal - elapsed;
    
    return Math.max(0, remaining);
  }
}

/**
 * Check if the document size might cause performance issues
 */
export function assessDocumentPerformance(contentLength: number): {
  level: 'fast' | 'medium' | 'slow' | 'very-slow';
  estimatedTime: string;
  warning?: string;
} {
  if (contentLength < 50000) {
    return {
      level: 'fast',
      estimatedTime: '< 5 seconds',
    };
  } else if (contentLength < 200000) {
    return {
      level: 'medium',
      estimatedTime: '5-15 seconds',
    };
  } else if (contentLength < 500000) {
    return {
      level: 'slow',
      estimatedTime: '15-45 seconds',
      warning: 'Large document detected. Processing may take some time.',
    };
  } else {
    return {
      level: 'very-slow',
      estimatedTime: '45+ seconds',
      warning: 'Very large document detected. Processing may take significant time and use considerable memory.',
    };
  }
}

/**
 * Create a performance-aware delay that scales with document size
 */
export function createAdaptiveDelay(contentLength: number): number {
  if (contentLength < 100000) return 5; // 5ms for small docs
  if (contentLength < 300000) return 10; // 10ms for medium docs
  if (contentLength < 500000) return 15; // 15ms for large docs
  return 25; // 25ms for very large docs
}

/**
 * Estimate memory usage for document processing
 */
export function estimateMemoryUsage(contentLength: number): {
  estimated: number;
  unit: string;
  warning?: string;
} {
  // Rough estimate: DOCX processing uses about 8-12x the original text size in memory
  const estimatedBytes = contentLength * 10;
  
  if (estimatedBytes < 1024 * 1024) {
    return {
      estimated: Math.round(estimatedBytes / 1024),
      unit: 'KB',
    };
  } else if (estimatedBytes < 1024 * 1024 * 100) {
    return {
      estimated: Math.round(estimatedBytes / (1024 * 1024) * 10) / 10,
      unit: 'MB',
    };
  } else {
    return {
      estimated: Math.round(estimatedBytes / (1024 * 1024) * 10) / 10,
      unit: 'MB',
      warning: 'High memory usage expected. Consider breaking down the document.',
    };
  }
}
