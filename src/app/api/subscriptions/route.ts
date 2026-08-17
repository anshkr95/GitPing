import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const subscriptions = db.getSubscriptions();
  return NextResponse.json({ subscriptions });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      repoFullName,
      repoOwner,
      repoName,
      repoUrl,
      repoAvatar,
      repoStars,
      repoDescription,
      repoLanguage,
      trackedLabels,
      matchMode,
      isActive,
    } = body;

    if (!repoFullName || !trackedLabels || !Array.isArray(trackedLabels) || trackedLabels.length === 0) {
      return NextResponse.json(
        { error: 'Repository and at least one tracked label are required' },
        { status: 400 }
      );
    }

    const [owner, name] = repoFullName.split('/');

    const subscription = db.addSubscription({
      repoFullName,
      repoOwner: repoOwner || owner || '',
      repoName: repoName || name || '',
      repoUrl: repoUrl || `https://github.com/${repoFullName}`,
      repoAvatar: repoAvatar || `https://avatars.githubusercontent.com/u/0`,
      repoStars: repoStars || 0,
      repoDescription: repoDescription || '',
      repoLanguage: repoLanguage || '',
      trackedLabels,
      matchMode: matchMode === 'all' ? 'all' : 'any',
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json({ subscription, success: true }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save subscription' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    const updated = db.updateSubscription(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    return NextResponse.json({ subscription: updated, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update subscription' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
  }

  const success = db.deleteSubscription(id);
  return NextResponse.json({ success, deletedId: id });
}
