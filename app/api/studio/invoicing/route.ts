import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { executeQuery } from '@/app/lib/database';
import Stripe from 'stripe';

// Initialize Stripe only when needed
function getStripeClient(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set. Please add it to your .env.local file.');
  }
  
  return new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  });
}

interface LessonData {
  student_name: string;
  student_email: string;
  teacher_name: string;
  lesson_count: number;
  teacher_price: number;
  total_cost: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { weekStartDate } = await request.json();
    
    if (!weekStartDate) {
      return NextResponse.json({ error: 'Week start date is required' }, { status: 400 });
    }

    // Get lesson data and teacher color mapping from database
    const lessonData = await getLessonDataForWeek(weekStartDate);
    
    if (!lessonData || lessonData.length === 0) {
      return NextResponse.json({ error: 'No lesson data found for the specified week' }, { status: 404 });
    }

    // Process invoices through Stripe
    const invoiceResults = await processInvoices(lessonData);

    return NextResponse.json({
      success: true,
      weekStartDate,
      processedInvoices: invoiceResults.length,
      invoices: invoiceResults
    });

  } catch (error) {
    console.error('Error processing invoices:', error);
    return NextResponse.json({ 
      error: 'Failed to process invoices',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function getLessonDataForWeek(weekStartDate: string): Promise<LessonData[]> {
  try {
    // Simple query to get the CLOB data, just like the schedule route
    const query = `
      SELECT 
        TO_CHAR(WEEK_START_DATE, 'YYYY-MM-DD') as weekOf,
        LESSON_ID as lessonId,
        FULL_WEEK_JSON as weekData
      FROM STUDIO_PRIVATE_LESSONS
      WHERE WEEK_START_DATE = TO_DATE(?, 'YYYY-MM-DD')
    `;

    const result = await executeQuery(query, [weekStartDate]);
    
    if (result.length === 0) {
      return [];
    }

    // Get additional data we need
    const studentsQuery = `SELECT STUDENT_NAME, CONTACT_EMAIL FROM STUDIO_STUDENTS`;
    const teachersQuery = `SELECT TEACHER_NAME, PRICE FROM STUDIO_TEACHERS`;
    
    const [students, teachers] = await Promise.all([
      executeQuery(studentsQuery, []),
      executeQuery(teachersQuery, [])
    ]);

    // Create lookup maps
    const studentEmailMap = new Map();
    students.forEach((student: any) => {
      studentEmailMap.set(student.student_name?.toLowerCase(), student.contact_email);
    });

    const teacherPriceMap = new Map();
    teachers.forEach((teacher: any) => {
      teacherPriceMap.set(teacher.teacher_name?.toLowerCase(), teacher.price || 40);
    });

    // Parse the CLOB data
    const row = result[0];
    const weekData: any = typeof row.weekdata === 'string' 
      ? JSON.parse(row.weekdata) 
      : row.weekdata;

    // Extract teacher color mappings
    const teacherColors = weekData.teachers || {};
    const colorToTeacherMap = new Map();
    Object.entries(teacherColors).forEach(([teacherName, color]) => {
      colorToTeacherMap.set(color, teacherName);
    });

    // Process lessons and aggregate by student/teacher
    const lessonMap = new Map();
    
    weekData.schedule?.forEach((timeSlot: any) => {
      timeSlot.lessons?.forEach((lesson: any) => {
        if (lesson.student_info && lesson.color) {
          const studentName = lesson.student_info.split('-')[0]?.split('(')[0]?.trim();
          const teacherName = colorToTeacherMap.get(lesson.color);
          
          if (studentName && teacherName) {
            const key = `${studentName}|${teacherName}`;
            const existing = lessonMap.get(key);
            
            if (existing) {
              existing.lesson_count += 1;
              existing.total_cost = existing.lesson_count * existing.teacher_price;
            } else {
              const studentEmail = studentEmailMap.get(studentName.toLowerCase()) || 'no-email@example.com';
              const teacherPrice = teacherPriceMap.get(teacherName.toLowerCase()) || 40;
              
              lessonMap.set(key, {
                student_name: studentName,
                student_email: studentEmail,
                teacher_name: teacherName,
                lesson_count: 1,
                teacher_price: teacherPrice,
                total_cost: 1 * teacherPrice
              });
            }
          }
        }
      });
    });

    return Array.from(lessonMap.values());
  } catch (error) {
    console.error('Error getting lesson data for week:', error);
    throw new Error('Failed to retrieve lesson data');
  }
}

async function processInvoices(lessonData: LessonData[]): Promise<any[]> {
  const invoiceResults = [];
  const stripe = getStripeClient();

  for (const lesson of lessonData) {
    try {
      // Create or retrieve customer
      let customer;
      try {
        const customers = await stripe.customers.search({
          query: `email:"${lesson.student_email}"`,
          limit: 1,
        });
        
        if (customers.data.length > 0) {
          customer = customers.data[0];
        } else {
          customer = await stripe.customers.create({
            email: lesson.student_email,
            name: lesson.student_name,
          });
        }
      } catch (error) {
        console.error('Error creating/retrieving customer:', error);
        continue;
      }

      // Create invoice
      const invoice = await stripe.invoices.create({
        customer: customer.id,
        description: `Private Dance Lessons - Week of ${lesson.teacher_name}`,
        metadata: {
          student_name: lesson.student_name,
          teacher_name: lesson.teacher_name,
          lesson_count: lesson.lesson_count.toString(),
          teacher_price: lesson.teacher_price.toString(),
        },
        auto_advance: false, // Don't automatically finalize
      });

      // Add line item to invoice
      await stripe.invoiceItems.create({
        customer: customer.id,
        invoice: invoice.id,
        amount: Math.round(lesson.total_cost * 100), // Convert to cents
        currency: 'usd',
        description: `${lesson.lesson_count} lessons with ${lesson.teacher_name} (${lesson.lesson_count} × $${lesson.teacher_price})`,
      });

      // Finalize the invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

      invoiceResults.push({
        student_name: lesson.student_name,
        student_email: lesson.student_email,
        teacher_name: lesson.teacher_name,
        lesson_count: lesson.lesson_count,
        total_cost: lesson.total_cost,
        stripe_invoice_id: finalizedInvoice.id,
        stripe_invoice_url: finalizedInvoice.hosted_invoice_url,
        stripe_payment_url: finalizedInvoice.invoice_pdf,
        status: finalizedInvoice.status,
      });

    } catch (error) {
      console.error(`Error processing invoice for ${lesson.student_name}:`, error);
      invoiceResults.push({
        student_name: lesson.student_name,
        student_email: lesson.student_email,
        teacher_name: lesson.teacher_name,
        lesson_count: lesson.lesson_count,
        total_cost: lesson.total_cost,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return invoiceResults;
}
