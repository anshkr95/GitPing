import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const notifications = db.getNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, markAll } = body;

    if (markAll) {
      db.markAllNotificationsRead();
      return NextResponse.json({ success: true, message: 'All marked as read' });
    }

    if (id) {
      db.markNotificationRead(id);
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ error: 'id or markAll required' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update notification' }, { status: 500 });
  }
}

export async function DELETE() {
  db.clearNotifications();
  return NextResponse.json({ success: true, message: 'Notifications cleared' });
}
