import { GitHubRepo, GitHubLabel, GitHubIssue } from './types';
import { db } from './db';
import { CURATED_REPOSITORIES } from './constants';

const GITHUB_API_BASE = 'https://api.github.com';

function getAuthHeaders(overrideToken?: string): HeadersInit {
  const token = overrideToken || db.getSettings().githubToken || process.env.GITHUB_TOKEN || '';
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'GitPing/1.0',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}



export async function searchRepositories(query: string, token?: string): Promise<GitHubRepo[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const cleanQuery = query.trim();

  // If query is an exact owner/repo format, try direct fetch first
  if (cleanQuery.includes('/') && !cleanQuery.includes(' ')) {
    const parts = cleanQuery.replace('https://github.com/', '').split('/');
    if (parts.length >= 2 && parts[0] && parts[1]) {
      try {
        const direct = await getRepoDetails(parts[0], parts[1], token);
        if (direct) return [direct];
      } catch {
        // Fallback to general search
      }
    }
  }

  const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(cleanQuery)}&sort=stars&order=desc&per_page=10`;
  try {
    const res = await fetch(url, {
      headers: getAuthHeaders(token),
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      // If rate limited or error, filter curated repos that match query
      console.warn(`GitHub search API returned ${res.status}: ${res.statusText}`);
      return getCuratedRepoFallback(cleanQuery);
    }

    const data = await res.json();
    return (data.items || []).map((item: any): GitHubRepo => ({
      id: item.id,
      full_name: item.full_name,
      name: item.name,
      owner: {
        login: item.owner?.login || '',
        avatar_url: item.owner?.avatar_url || '',
        html_url: item.owner?.html_url,
      },
      description: item.description,
      stargazers_count: item.stargazers_count || 0,
      forks_count: item.forks_count || 0,
      open_issues_count: item.open_issues_count || 0,
      language: item.language,
      topics: item.topics || [],
      html_url: item.html_url,
      updated_at: item.updated_at,
    }));
  } catch (err) {
    console.error('Failed to fetch from GitHub search API:', err);
    return getCuratedRepoFallback(cleanQuery);
  }
}

function getCuratedRepoFallback(query: string): GitHubRepo[] {
  const q = query.toLowerCase();
  return CURATED_REPOSITORIES.filter(
    (r) =>
      r.fullName.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      (r.language && r.language.toLowerCase().includes(q))
  ).map((r, i) => ({
    id: 1000 + i,
    full_name: r.fullName,
    name: r.repo,
    owner: {
      login: r.owner,
      avatar_url: r.avatar,
      html_url: `https://github.com/${r.owner}`,
    },
    description: r.description,
    stargazers_count: r.stars,
    forks_count: Math.round(r.stars * 0.2),
    open_issues_count: 140,
    language: r.language,
    topics: ['open-source', r.language.toLowerCase()],
    html_url: `https://github.com/${r.fullName}`,
    updated_at: new Date().toISOString(),
  }));
}

export async function getRepoDetails(owner: string, repo: string, token?: string): Promise<GitHubRepo | null> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
  try {
    const res = await fetch(url, {
      headers: getAuthHeaders(token),
      next: { revalidate: 120 },
    });

    if (!res.ok) {
      // Check curated
      const match = CURATED_REPOSITORIES.find(
        (r) => r.owner.toLowerCase() === owner.toLowerCase() && r.repo.toLowerCase() === repo.toLowerCase()
      );
      if (match) {
        return {
          id: 1001,
          full_name: match.fullName,
          name: match.repo,
          owner: { login: match.owner, avatar_url: match.avatar },
          description: match.description,
          stargazers_count: match.stars,
          forks_count: Math.round(match.stars * 0.2),
          open_issues_count: 142,
          language: match.language,
          topics: ['open-source'],
          html_url: `https://github.com/${match.fullName}`,
          updated_at: new Date().toISOString(),
        };
      }
      return null;
    }

    const item = await res.json();
    return {
      id: item.id,
      full_name: item.full_name,
      name: item.name,
      owner: {
        login: item.owner?.login || '',
        avatar_url: item.owner?.avatar_url || '',
        html_url: item.owner?.html_url,
      },
      description: item.description,
      stargazers_count: item.stargazers_count || 0,
      forks_count: item.forks_count || 0,
      open_issues_count: item.open_issues_count || 0,
      language: item.language,
      topics: item.topics || [],
      html_url: item.html_url,
      updated_at: item.updated_at,
    };
  } catch (err) {
    console.error(`Failed to get repo details for ${owner}/${repo}:`, err);
    return null;
  }
}

export async function getRepoLabels(owner: string, repo: string, token?: string): Promise<GitHubLabel[]> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/labels?per_page=100`;
  try {
    const res = await fetch(url, {
      headers: getAuthHeaders(token),
      next: { revalidate: 300 }, // Cache labels for 5 mins
    });

    if (!res.ok) {
      console.warn(`GitHub labels API returned ${res.status} for ${owner}/${repo}`);
      return getFallbackLabels(owner, repo);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      return getFallbackLabels(owner, repo);
    }

    return data.map((l: any): GitHubLabel => ({
      id: l.id,
      name: l.name,
      color: l.color.replace(/^#/, ''),
      description: l.description || '',
      default: l.default,
    }));
  } catch (err) {
    console.error(`Failed to fetch labels for ${owner}/${repo}:`, err);
    return getFallbackLabels(owner, repo);
  }
}

function getFallbackLabels(owner: string, repo: string): GitHubLabel[] {
  // Common standard GitHub labels fallback
  return [
    { name: 'good first issue', color: '7057ff', description: 'Good for newcomers' },
    { name: 'help wanted', color: '008672', description: 'Extra attention is needed' },
    { name: 'Documentation', color: '0075ca', description: 'Improvements or additions to documentation' },
    { name: 'bug', color: 'd73a4a', description: "Something isn't working" },
    { name: 'enhancement', color: 'a2eeef', description: 'New feature or request' },
    { name: 'duplicate', color: 'cfd3d7', description: 'This issue or pull request already exists' },
    { name: 'invalid', color: 'e4e669', description: "This doesn't seem right" },
    { name: 'question', color: 'd876e3', description: 'Further information is requested' },
    { name: 'wontfix', color: 'ffffff', description: 'This will not be worked on' },
    { name: 'needs reproduction', color: 'fbca04', description: 'Needs reproduction steps or minimal repo' },
    { name: 'difficulty: easy', color: 'c2e0c6', description: 'Estimated time: 1-2 hours' },
    { name: 'difficulty: medium', color: 'fef2c0', description: 'Estimated time: 1 day' },
  ];
}

export async function getRecentIssues(
  owner: string,
  repo: string,
  sinceIso?: string,
  token?: string
): Promise<GitHubIssue[]> {
  let url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=open&sort=created&direction=desc&per_page=15`;
  if (sinceIso) {
    url += `&since=${encodeURIComponent(sinceIso)}`;
  }

  try {
    const res = await fetch(url, {
      headers: getAuthHeaders(token),
      cache: 'no-store', // Always fresh for monitoring
    });

    if (!res.ok) {
      console.warn(`GitHub issues API returned ${res.status} for ${owner}/${repo}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    // Filter out pull requests (GitHub API returns pull requests as issues too, identified by pull_request key)
    const issuesOnly = data.filter((item: any) => !item.pull_request);

    return issuesOnly.map((item: any): GitHubIssue => ({
      id: item.id,
      number: item.number,
      title: item.title,
      body: item.body || '',
      state: item.state,
      html_url: item.html_url,
      user: {
        login: item.user?.login || 'unknown',
        avatar_url: item.user?.avatar_url || 'https://avatars.githubusercontent.com/u/0',
        html_url: item.user?.html_url,
      },
      labels: (item.labels || []).map((l: any): GitHubLabel => ({
        id: l.id,
        name: l.name,
        color: (l.color || 'cccccc').replace(/^#/, ''),
        description: l.description || '',
      })),
      created_at: item.created_at,
      updated_at: item.updated_at,
      repository_url: item.repository_url,
    }));
  } catch (err) {
    console.error(`Failed to fetch recent issues for ${owner}/${repo}:`, err);
    return [];
  }
}
