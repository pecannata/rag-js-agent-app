// Debug script to check what weeks are available
import { executeQuery } from './app/lib/database';

async function debugWeeks() {
  try {
    console.log('🔍 Checking all available weeks in database...\n');
    
    const query = `
      SELECT 
        TO_CHAR(WEEK_START_DATE, 'YYYY-MM-DD') as week_start,
        TO_CHAR(WEEK_START_DATE, 'DD-MON-YY') as formatted_date,
        TO_CHAR(WEEK_START_DATE, 'Day') as day_name,
        LESSON_ID as lesson_id
      FROM STUDIO_PRIVATE_LESSONS
      ORDER BY WEEK_START_DATE
    `;
    
    const result = await executeQuery(query, []);
    
    if (result.length === 0) {
      console.log('❌ No weeks found in STUDIO_PRIVATE_LESSONS table');
      return;
    }
    
    console.log('✅ Available weeks:');
    console.log('Week Start Date | Formatted | Day Name | Lesson ID');
    console.log('----------------|-----------|----------|----------');
    
    result.forEach(row => {
      console.log(`${row.week_start} | ${row.formatted_date} | ${row.day_name.trim()} | ${row.lesson_id}`);
    });
    
    console.log(`\n📊 Total weeks available: ${result.length}`);
    
    // Check specifically for June 2025 weeks
    console.log('\n🔍 Looking for June 2025 weeks specifically...');
    const juneQuery = `
      SELECT 
        TO_CHAR(WEEK_START_DATE, 'YYYY-MM-DD') as week_start,
        TO_CHAR(WEEK_START_DATE, 'DD-MON-YY') as formatted_date,
        TO_CHAR(WEEK_START_DATE, 'Day') as day_name
      FROM STUDIO_PRIVATE_LESSONS
      WHERE EXTRACT(MONTH FROM WEEK_START_DATE) = 6 
      AND EXTRACT(YEAR FROM WEEK_START_DATE) = 2025
      ORDER BY WEEK_START_DATE
    `;
    
    const juneResult = await executeQuery(juneQuery, []);
    
    if (juneResult.length === 0) {
      console.log('❌ No June 2025 weeks found');
    } else {
      console.log('✅ June 2025 weeks:');
      juneResult.forEach(row => {
        console.log(`${row.week_start} | ${row.formatted_date} | ${row.day_name.trim()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugWeeks();
