import { NextRequest, NextResponse } from 'next/server';

// Declare global types
declare global {
  var invalidateCategorizedCache: (() => void) | undefined;
  var invalidateAndReprimeCategorizedCache: (() => Promise<{success: boolean, message: string, error?: string}>) | undefined;
}

// POST endpoint for cache invalidation with optional re-priming
export async function POST(request: NextRequest) {
  try {
    // Parse request body to check for re-prime option
    const { reprime = false } = await request.json().catch(() => ({}));
    
    if (reprime) {
      // Invalidate + Immediate Re-prime
      if (global.invalidateAndReprimeCategorizedCache) {
        console.log('🔄 Starting cache invalidation with immediate re-prime...');
        const result = await global.invalidateAndReprimeCategorizedCache();
        console.log('✅ Cache invalidation with re-prime completed');
        return NextResponse.json(result);
      } else {
        console.warn('⚠️ Re-prime function not available, falling back to simple invalidation');
        if (global.invalidateCategorizedCache) {
          global.invalidateCategorizedCache();
          return NextResponse.json({ 
            success: true, 
            message: 'Cache invalidated (re-prime function not available)' 
          });
        }
      }
    } else {
      // Simple invalidation (original behavior)
      if (global.invalidateCategorizedCache) {
        global.invalidateCategorizedCache();
        console.log('🧹 Categorized posts cache invalidated via dedicated endpoint');
        return NextResponse.json({ 
          success: true, 
          message: 'Categorized posts cache invalidated successfully' 
        });
      }
    }
    
    // If no invalidation function is available
    console.warn('⚠️ Categorized cache invalidation function not available');
    return NextResponse.json({ 
      success: false, 
      message: 'Cache invalidation function not available' 
    }, { status: 500 });
    
  } catch (error) {
    console.error('❌ Error in categorized posts cache invalidation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
