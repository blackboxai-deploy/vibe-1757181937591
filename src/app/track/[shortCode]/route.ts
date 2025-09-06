import { NextRequest, NextResponse } from 'next/server';
import { getLinkByShortCode, recordClick } from '@/lib/database';
import { getLocationFromIP, getClientIP, sanitizeReferer } from '@/lib/tracking';

export async function GET(
  request: NextRequest,
  { params }: { params: { shortCode: string } }
) {
  try {
    const { shortCode } = params;
    
    // Get the link by short code
    const link = getLinkByShortCode(shortCode);
    
    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }
    
    // Get client information
    const ip = getClientIP(request) || '127.0.0.1';
    const userAgent = request.headers.get('user-agent');
    const referer = sanitizeReferer(request.headers.get('referer'));
    
    // Get location data (don't await to avoid slowing redirect)
    const locationData = await getLocationFromIP(ip);
    
    // Record the click
    recordClick(link.id, ip, locationData, userAgent, referer);
    
    // Redirect to the original URL
    return NextResponse.redirect(link.original_url, 302);
    
  } catch (error) {
    console.error('Error tracking click:', error);
    
    // If there's an error, still try to redirect to avoid broken user experience
    try {
      const { shortCode } = params;
      const link = getLinkByShortCode(shortCode);
      if (link) {
        return NextResponse.redirect(link.original_url, 302);
      }
    } catch {
      // Ignore nested errors
    }
    
    return NextResponse.json(
      { error: 'Tracking failed' },
      { status: 500 }
    );
  }
}