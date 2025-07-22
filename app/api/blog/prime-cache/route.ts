import { NextResponse } from 'next/server';
// Import to ensure the blog post route initializes and sets up global functions
import '../[id]/route';

export async function POST() {
  try {
    console.log('🔥 Blog post cache priming requested...');
    
    // Call the global priming function if available
    if (global.primeBlogPostCache) {
      const result = await global.primeBlogPostCache();
      
      if (result.success) {
        console.log(`✅ Blog post cache primed successfully: ${result.count} posts`);
        
        return NextResponse.json({
          success: true,
          message: `Successfully primed blog post cache with ${result.count} recent posts`,
          count: result.count
        });
      } else {
        console.error('❌ Blog post cache priming failed:', result.error);
        
        return NextResponse.json({
          success: false,
          message: 'Failed to prime blog post cache',
          error: result.error
        }, { status: 500 });
      }
    } else {
      console.error('❌ Blog post cache priming function not available');
      
      return NextResponse.json({
        success: false,
        message: 'Blog post cache priming function not available',
        error: 'Priming function not initialized'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Error in blog post cache priming endpoint:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error during cache priming',
      error: (error as Error).message
    }, { status: 500 });
  }
}
