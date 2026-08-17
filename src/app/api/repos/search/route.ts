import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const GITHUB_API = 'https://api.github.com';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || '';
  const order = searchParams.get('order') || 'desc';
  const language = searchParams.get('language') || '';
  const topics = searchParams.get('topics') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Parse tag filters into GitHub topic qualifiers
  const topicList = topics
    .split(',')
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean);

  // Support multiple languages
  const languageList = language
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

  if (!q.trim() && languageList.length === 0 && topicList.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const parts: string[] = [];
  if (q.trim()) parts.push(q.trim());
  for (const lang of languageList) {
    parts.push(`language:"${lang}"`);
  }
  for (const topic of topicList) {
    parts.push(`topic:${topic}`);
  }

  // Filter out 0-star repos when sorting by fewest stars
  if (sort === 'stars' && order === 'asc') {
    parts.push('stars:>=1000');
  }

  const searchQuery = parts.join(' ');

  let url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(searchQuery)}&order=${order}&per_page=30&page=${page}`;
  if (sort && sort !== 'best-match') {
    url += `&sort=${sort}`;
  }

  const token = db.getSettings().githubToken || process.env.GITHUB_TOKEN || '';
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'GitPing/1.0',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(url, { headers, next: { revalidate: 60 } });
    if (!res.ok) {
      return NextResponse.json({ items: [], error: `GitHub API: ${res.status}` });
    }
    const data = await res.json();
    const items = (data.items || []).map((item: any) => ({
      id: item.id,
      full_name: item.full_name,
      name: item.name,
      owner: { login: item.owner?.login || '', avatar_url: item.owner?.avatar_url || '' },
      description: item.description,
      stargazers_count: item.stargazers_count || 0,
      forks_count: item.forks_count || 0,
      open_issues_count: item.open_issues_count || 0,
      language: item.language,
      topics: item.topics || [],
      html_url: item.html_url,
      updated_at: item.updated_at,
    }));
    const totalCount = data.total_count || 0;
    const hasMore = page * 30 < totalCount;
    return NextResponse.json({ items, totalCount, hasMore, page });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
