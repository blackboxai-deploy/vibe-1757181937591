import { NextRequest, NextResponse } from 'next/server';
import { getLinkAnalytics, getLinkById } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    const { linkId } = params;
    
    // Verify the link exists
    const link = getLinkById(linkId);
    if (!link) {
      return NextResponse.json(
        { success: false, error: 'Link not found' },
        { status: 404 }
      );
    }
    
    // Get analytics data
    const analytics = getLinkAnalytics(linkId);
    
    return NextResponse.json({
      success: true,
      data: {
        link,
        analytics
      }
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}