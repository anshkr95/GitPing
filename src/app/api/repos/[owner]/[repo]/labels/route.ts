import { NextRequest, NextResponse } from 'next/server';
import { getRepoLabels } from '@/lib/github';

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  const { owner, repo } = params;

  if (!owner || !repo) {
    return NextResponse.json({ error: 'Owner and repo are required' }, { status: 400 });
  }

  try {
    const labels = await getRepoLabels(owner, repo);
    return NextResponse.json({
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      labels,
      count: labels.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch labels' }, { status: 500 });
  }
}
