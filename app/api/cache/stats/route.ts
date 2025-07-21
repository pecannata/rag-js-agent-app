import { NextResponse } from 'next/server';
import { appCache } from '../../../../lib/cache';

export async function GET() {
  try {
    // Get cache statistics
    const stats = appCache.getStats();
    const keys = appCache.keys();
    
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
    
    const cacheStats = {
      // Basic stats
      totalKeys: stats.keys,
      cacheHits: stats.hits,
      cacheMisses: stats.misses,
      hitRate: stats.hits > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%' : '0%',
      
      // Memory usage (approximate)
      keySize: stats.ksize,
      valueSize: stats.vsize,
      totalMemory: stats.ksize + stats.vsize,
      
      // Key details
      keys: keyDetails,
      
      // Auto re-prime status
      autoReprimeEnabled: true,
      checkPeriod: '2 minutes',
      defaultTTL: '30 minutes'
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
