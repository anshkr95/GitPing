import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim() : '';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address required' }, { status: 400 });
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';

    if (!user || !pass) {
      return NextResponse.json({
        error: 'SMTP credentials missing. Please set SMTP_USER and SMTP_PASS in your Vercel Environment Variables.'
      }, { status: 400 });
    }

    const result = await sendWelcomeEmail(email);

    if (result.success) {
      return NextResponse.json({ success: true, message: `Test email dispatched to ${email}` });
    } else {
      return NextResponse.json({
        error: result.error || `Failed to send via ${host}`
      }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error sending test email' }, { status: 500 });
  }
}
