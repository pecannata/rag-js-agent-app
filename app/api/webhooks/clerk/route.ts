import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { UserDatabase } from '@/lib/auth/user-db-sqlcl';

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to your environment variables');
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as any;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  const { id, email_addresses, first_name, last_name } = evt.data;

  console.log(`Webhook received: ${eventType} for user ${id}`);

  try {
    switch (eventType) {
      case 'user.created':
        // Create user in Oracle database
        await UserDatabase.createUser({
          clerkUserId: id,
          email: email_addresses[0]?.email_address || '',
          firstName: first_name || '',
          lastName: last_name || '',
        });
        
        // Log activity
        await UserDatabase.logUserActivity(id, {
          type: 'user_created',
          details: { eventType },
        });
        
        console.log(`User created in database: ${id}`);
        break;

      case 'user.updated':
        // Update user in Oracle database
        await UserDatabase.updateUser(id, {
          email: email_addresses[0]?.email_address,
          firstName: first_name,
          lastName: last_name,
        });
        
        // Log activity
        await UserDatabase.logUserActivity(id, {
          type: 'user_updated',
          details: { eventType },
        });
        
        console.log(`User updated in database: ${id}`);
        break;

      case 'session.created':
        // Update last login
        await UserDatabase.updateLastLogin(id);
        
        // Log activity
        await UserDatabase.logUserActivity(id, {
          type: 'login',
          details: { eventType },
        });
        
        console.log(`User login recorded: ${id}`);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Error processing webhook', {
      status: 500,
    });
  }

  return NextResponse.json({ received: true });
}
