import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendWelcomeEmail } from '@/lib/mailer';

export async function GET() {
  const settings = db.getSettings();
  // Mask token for display
  const maskedToken = settings.githubToken
    ? `${settings.githubToken.substring(0, 4)}...${settings.githubToken.substring(settings.githubToken.length - 4)}`
    : '';
  return NextResponse.json({
    settings: {
      ...settings,
      hasToken: Boolean(settings.githubToken),
      maskedToken,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const updates = await request.json();
    const before = db.getSettings();
    const updated = db.updateSettings(updates);

    // Send one-time welcome email on initial email setup
    const email = typeof updates.email === 'string' ? updates.email.trim() : '';
    const wantsEmail = updated.emailEnabled !== false;
    if (email.includes('@') && wantsEmail && !before.welcomeEmailSent) {
      const result = await sendWelcomeEmail(email);
      if (result.success) db.updateSettings({ welcomeEmailSent: true });
    }

    return NextResponse.json({
      settings: db.getSettings(),
      success: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update settings' }, { status: 500 });
  }
}
