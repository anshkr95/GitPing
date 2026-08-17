'use client';

import React, { useState, useEffect } from 'react';
import { Search, Star, X } from 'lucide-react';
import { GitHubRepo } from '@/lib/types';

interface RepoSearchProps {
  onSelectRepo: (repo: GitHubRepo) => void;
  trackedRepoNames: string[];
}

const LANGUAGES = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust',
  'C', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart',
  'Shell', 'HTML', 'CSS',
];

const SUGGESTED_TAGS = [
  'machine-learning', 'web', 'cli', 'api', 'react', 'nextjs',
  'typescript', 'docker', 'kubernetes', 'security', 'game', 'data-science',
];

const selectStyle: React.CSSProperties = {
  background: 'var(--field)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '5px 12px',
  color: 'var(--fg-default)',
  fontSize: 12,
  cursor: 'pointer',
};

const clearBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--field)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '5px 6px',
  color: 'var(--fg-muted)',
  cursor: 'pointer',
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: 'var(--neutral-muted)',
  border: '1px solid var(--border)',
  borderRadius: 9999,
  padding: '3px 6px 3px 10px',
  color: 'var(--fg-default)',
  fontSize: 12,
};

const chipCloseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  color: 'var(--fg-muted)',
  cursor: 'pointer',
  padding: 0,
  lineHeight: 0,
};

const suggestionChipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  background: 'transparent',
  border: '1px dashed var(--border)',
  borderRadius: 9999,
  padding: '3px 10px',
  color: 'var(--fg-muted)',
  fontSize: 12,
  cursor: 'pointer',
};

export function RepoSearch({ onSelectRepo, trackedRepoNames }: RepoSearchProps) {
  const [query, setQuery] = useState('');
  const [sortOption, setSortOption] = useState('best-match_desc');
  const [languages, setLanguages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [results, setResults] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const addLanguage = (lang: string) => {
    if (lang && !languages.includes(lang)) setLanguages((prev) => [...prev, lang]);
  };
  const removeLanguage = (lang: string) => setLanguages((prev) => prev.filter((l) => l !== lang));

  const normalizeTag = (t: string) => t.trim().toLowerCase().replace(/\s+/g, '-');
  const addTag = (raw: string) => {
    const t = normalizeTag(raw);
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
  };
  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  useEffect(() => {
    const hasCriteria = query.trim() || languages.length > 0 || tags.length > 0;
    if (!hasCriteria) {
      setResults([]);
      setPage(1);
      setHasMore(false);
      return;
    }

    setPage(1);
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [sort, order] = sortOption.split('_');
        const url = `/api/repos/search?q=${encodeURIComponent(query)}&sort=${sort}&order=${order}&language=${encodeURIComponent(languages.join(','))}&topics=${encodeURIComponent(tags.join(','))}&page=1`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.items) setResults(data.items);
        setHasMore(data.hasMore || false);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, sortOption, languages, tags]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const [sort, order] = sortOption.split('_');
      const url = `/api/repos/search?q=${encodeURIComponent(query)}&sort=${sort}&order=${order}&language=${encodeURIComponent(languages.join(','))}&topics=${encodeURIComponent(tags.join(','))}&page=${nextPage}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.items) setResults((prev) => [...prev, ...data.items]);
      setHasMore(data.hasMore || false);
      setPage(nextPage);
    } catch (err) {
      console.error('Load more failed:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const availableLanguages = LANGUAGES.filter((l) => !languages.includes(l));
  const availableSuggestions = SUGGESTED_TAGS.filter((t) => !tags.includes(t));

  return (
    <div>
      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GitHub repositories..."
          style={{
            width: '100%',
            background: 'var(--field)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '9px 14px 9px 36px',
            color: 'var(--fg-default)',
            fontSize: 14,
          }}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--fg-muted)' }}>
            Searching...
          </span>
        )}
      </div>

      {/* Sort + Filter controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {/* Sort + add-language row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              style={selectStyle}
            >
              <option value="best-match_desc">Best Match</option>
              <option value="stars_desc">Most Stars</option>
              <option value="stars_asc">Fewest Stars</option>
              <option value="forks_desc">Most Forks</option>
              <option value="forks_asc">Fewest Forks</option>
              <option value="updated_desc">Recently Updated</option>
              <option value="updated_asc">Least Recently Updated</option>
            </select>
            {sortOption !== 'best-match_desc' && (
              <button
                type="button"
                onClick={() => setSortOption('best-match_desc')}
                title="Reset sort to Best Match"
                aria-label="Reset sort"
                style={clearBtnStyle}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <select
            value=""
            onChange={(e) => addLanguage(e.target.value)}
            title="Add one or more languages"
            style={selectStyle}
          >
            <option value="">+ Add language</option>
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>

        {/* Selected languages */}
        {languages.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {languages.map((lang) => (
              <span key={lang} style={chipStyle}>
                {lang}
                <button
                  type="button"
                  onClick={() => removeLanguage(lang)}
                  aria-label={`Remove ${lang}`}
                  title={`Remove ${lang}`}
                  style={chipCloseStyle}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Tag input */}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && tagInput.trim()) {
              e.preventDefault();
              addTag(tagInput);
              setTagInput('');
            }
          }}
          placeholder="Add a tag and press Enter (e.g. cli, machine-learning)"
          style={{
            background: 'var(--field)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '5px 12px',
            color: 'var(--fg-default)',
            fontSize: 12,
            width: '100%',
          }}
        />

        {/* Suggested tags */}
        {availableSuggestions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>Suggested:</span>
            {availableSuggestions.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addTag(t)}
                title={`Add ${t}`}
                style={suggestionChipStyle}
              >
                + {t}
              </button>
            ))}
          </div>
        )}

        {/* Selected tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((t) => (
              <span key={t} style={chipStyle}>
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  aria-label={`Remove ${t}`}
                  title={`Remove ${t}`}
                  style={chipCloseStyle}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hint text */}
      {!query.trim() && languages.length === 0 && tags.length === 0 && results.length === 0 && (
        <div style={{ color: 'var(--fg-muted)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>
          Search by repository name, or filter by language / tags above (e.g. <code style={{ color: 'var(--fg-default)' }}>facebook/react</code>, or just pick <code style={{ color: 'var(--fg-default)' }}>Python</code>)
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          {results.map((repo) => {
            const isTracked = trackedRepoNames.includes(repo.full_name.toLowerCase());
            return (
              <div
                key={repo.full_name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-muted)',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <img
                    src={repo.owner?.avatar_url || 'https://avatars.githubusercontent.com/u/0'}
                    alt=""
                    style={{ width: 24, height: 24, borderRadius: 4, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--accent-fg)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
                      >
                        {repo.full_name}
                      </a>
                      {repo.language && (
                        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{repo.language}</span>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Star size={12} style={{ color: 'var(--attention-fg)' }} />
                        {repo.stargazers_count.toLocaleString()}
                      </span>
                    </div>
                    {repo.description && (
                      <p style={{
                        fontSize: 12,
                        color: 'var(--fg-muted)',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {repo.description}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onSelectRepo(repo)}
                  className={isTracked ? 'btn-secondary' : 'btn-primary'}
                  style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }}
                >
                  {isTracked ? 'Edit Labels' : 'Track'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {hasMore && results.length > 0 && (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-secondary"
            style={{ fontSize: 13, padding: '7px 20px' }}
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
