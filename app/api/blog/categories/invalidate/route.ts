import { NextRequest, NextResponse } from 'next/server';

// Declare global type
declare global {
  var invalidateCategorizedCache: (() => void) | undefined;
}

// POST endpoint for cache invalidation
export async function POST(_request: NextRequest) {
  try {
    if (global.invalidateCategorizedCache) {
      global.invalidateCategorizedCache();
      console.log('🧹 Categorized posts cache invalidated via dedicated endpoint');
    } else {
      console.warn('⚠️ Categorized cache invalidation function not available');
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Categorized posts cache invalidated successfully' 
    });
    
  } catch (error) {
    console.error('❌ Error in categorized posts cache invalidation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
