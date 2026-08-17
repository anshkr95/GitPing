import { NextRequest, NextResponse } from 'next/server';
import { scanAllSubscriptions, scanSingleSubscription } from '@/lib/monitor';

// POST: manual scan from UI (optional subscriptionId limits scan to single repo)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { subscriptionId, subscriptions } = body;

    if (subscriptionId) {
      const newlyDetected = await scanSingleSubscription(subscriptionId);
      return NextResponse.json({
        success: true,
        type: 'single',
        matchesFound: newlyDetected.length,
        newDetectedIssues: newlyDetected,
      });
    }

    const report = await scanAllSubscriptions(Array.isArray(subscriptions) ? subscriptions : undefined);
    return NextResponse.json({
      success: true,
      type: 'all',
      report,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scan failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const report = await scanAllSubscriptions();
    return NextResponse.json({
      success: true,
      type: 'all',
      report,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Scan failed' }, { status: 500 });
  }
}
