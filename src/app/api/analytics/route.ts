import { NextResponse } from 'next/server';
import { getGlobalAnalytics } from '@/lib/database';

export async function GET() {
  try {
    const analytics = getGlobalAnalytics();
    
    return NextResponse.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    console.error('Error fetching global analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}