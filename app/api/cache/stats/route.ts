import { NextResponse } from 'next/server';
import { appCache } from '../../../../lib/cache';

export async function GET() {
  try {
    // Get cache statistics
    const stats = appCache.getStats();
    const keys = appCache.keys();
    
    // Get blog post cache stats if available
    let blogPostStats = null;
    if (global.getBlogPostCacheStats) {
      try {
        blogPostStats = global.getBlogPostCacheStats();
      } catch (error) {
        console.error('Error getting blog post cache stats:', error);
      }
    }
    
    // Get TTL info for each key
    const keyDetails = keys.map(key => {
      const ttl = appCache.getTtl(key);
      const now = Date.now();
      const remainingTime = ttl ? Math.max(0, ttl - now) : 0;
      const remainingMinutes = Math.round(remainingTime / 60000);
      
      return {
        key,
        ttl: ttl ? new Date(ttl).toISOString() : null,
        remainingMinutes,
        hasData: appCache.has(key)
      };
    });
    
    // Calculate more accurate memory usage
    const calculateMemoryUsage = () => {
      let totalMemory = 0;
      const keys = appCache.keys();
      
      keys.forEach(key => {
        const value = appCache.get(key);
        if (value) {
          // Estimate memory usage by JSON string length
          const jsonString = JSON.stringify(value);
          totalMemory += Buffer.byteLength(jsonString, 'utf8');
          totalMemory += Buffer.byteLength(key, 'utf8'); // Add key size
        }
      });
      
      return {
        estimatedBytes: totalMemory,
        keyCount: keys.length,
        nodeCacheStats: { ksize: stats.ksize, vsize: stats.vsize }
      };
    };
    
    const memoryInfo = calculateMemoryUsage();
    
    const cacheStats = {
      // Basic stats
      totalKeys: stats.keys,
      cacheHits: stats.hits,
      cacheMisses: stats.misses,
      hitRate: stats.hits > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%' : '0%',
      
      // Memory usage (more accurate estimate)
      keySize: stats.ksize,
      valueSize: stats.vsize,
      nodeCacheMemory: stats.ksize + stats.vsize, // Original NodeCache calculation
      estimatedMemory: memoryInfo.estimatedBytes,  // More accurate calculation
      totalMemory: memoryInfo.estimatedBytes,      // Use the better estimate
      
      // Key details
      keys: keyDetails,
      
      // Blog post LRU cache stats
      blogPostCache: blogPostStats ? {
        size: blogPostStats.size,
        maxSize: blogPostStats.maxSize,
        utilization: blogPostStats.maxSize > 0 ? Math.round((blogPostStats.size / blogPostStats.maxSize) * 100) + '%' : '0%',
        keys: blogPostStats.keys
      } : null,
      
      // Auto re-prime status
      autoReprimeEnabled: true,
      checkPeriod: '12 minutes',
      defaultTTL: '12 hours'
    };
    
    console.log('📊 Cache stats requested:', {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: cacheStats.hitRate
    });
    
    return NextResponse.json({
      success: true,
      stats: cacheStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error retrieving cache stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve cache statistics',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}
