import { NextRequest, NextResponse } from 'next/server';
import { createLink, getAllLinks, deleteLink } from '@/lib/database';
import { z } from 'zod';

// Schema for link creation
const createLinkSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  originalUrl: z.string().url('Invalid URL format')
});

export async function GET() {
  try {
    const links = getAllLinks();
    return NextResponse.json({ success: true, data: links });
  } catch (error) {
    console.error('Error fetching links:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch links' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = createLinkSchema.parse(body);
    
    // Create the link
    const link = createLink(validatedData.name, validatedData.originalUrl);
    
    return NextResponse.json({ 
      success: true, 
      data: link,
      trackingUrl: `${request.nextUrl.origin}/track/${link.short_code}`
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create link' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('id');
    
    if (!linkId) {
      return NextResponse.json(
        { success: false, error: 'Link ID is required' },
        { status: 400 }
      );
    }
    
    const success = deleteLink(linkId);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Link not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting link:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete link' },
      { status: 500 }
    );
  }
}