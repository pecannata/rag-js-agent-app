import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyUser } from '../../../lib/users';

const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Verify user using shared user storage
        const user = await verifyUser(credentials.email, credentials.password)
        
        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.email.split('@')[0] ?? 'User'
          }
        }

        return null
      }
    })
  ],
  pages: {
    signIn: '/auth/signin'
  },
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    }
  },
  secret: process.env.NEXTAUTH_SECRET ?? 'development-secret-change-in-production'
} as any;

const DIMENSIONS_DIR = path.join(process.cwd(), 'data', 'image-dimensions');

// Ensure the dimensions directory exists
async function ensureDimensionsDir() {
  try {
    await fs.mkdir(DIMENSIONS_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

// Generate a safe filename from user email
function getSafeFilename(email: string): string {
  return email.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
}

// GET: Load image dimensions for current user
export async function GET(_request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureDimensionsDir();
    
    const filename = getSafeFilename(session.user.email);
    const filePath = path.join(DIMENSIONS_DIR, filename);
    
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const imageDimensions = JSON.parse(data);
      
      return NextResponse.json({ imageDimensions });
    } catch (error) {
      // File doesn't exist or is invalid, return empty dimensions
      return NextResponse.json({ imageDimensions: {} });
    }
  } catch (error) {
    console.error('Error loading image dimensions:', error);
    return NextResponse.json({ error: 'Failed to load image dimensions' }, { status: 500 });
  }
}

// POST: Save image dimensions for current user
export async function POST(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageDimensions } = await request.json();
    
    if (!imageDimensions || typeof imageDimensions !== 'object') {
      return NextResponse.json({ error: 'Invalid image dimensions data' }, { status: 400 });
    }

    await ensureDimensionsDir();
    
    const filename = getSafeFilename(session.user.email);
    const filePath = path.join(DIMENSIONS_DIR, filename);
    
    await fs.writeFile(filePath, JSON.stringify(imageDimensions, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving image dimensions:', error);
    return NextResponse.json({ error: 'Failed to save image dimensions' }, { status: 500 });
  }
}

// DELETE: Clear image dimensions for current user
export async function DELETE(_request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filename = getSafeFilename(session.user.email);
    const filePath = path.join(DIMENSIONS_DIR, filename);
    
    try {
      await fs.unlink(filePath);
      return NextResponse.json({ success: true });
    } catch (error) {
      // File doesn't exist, which is fine
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Error clearing image dimensions:', error);
    return NextResponse.json({ error: 'Failed to clear image dimensions' }, { status: 500 });
  }
}
