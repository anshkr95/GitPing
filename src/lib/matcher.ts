import { GitHubLabel, MatchResult } from './types';

// lowercases and trims label name
export function normalizeLabel(name: string): string {
  return (name || '').trim().toLowerCase();
}

/**
 * Checks if issue labels match tracked labels.
 * @param issueLabels Labels on the issue
 * @param trackedLabels Labels being tracked
 * @param matchMode 'any' (at least 1) or 'all' (all required)
 */
export function matchIssueLabels(
  issueLabels: (GitHubLabel | string)[],
  trackedLabels: string[],
  matchMode: 'any' | 'all' = 'any'
): MatchResult {
  if (!trackedLabels || trackedLabels.length === 0) {
    return {
      isMatch: false,
      matchedLabels: [],
      totalTracked: 0,
      totalMatched: 0,
      matchMode,
      reason: 'No tracked labels configured for this repository',
    };
  }

  // track all mode
  if (trackedLabels.includes('__ALL__')) {
    const allLabelNames = issueLabels.map((l) =>
      typeof l === 'string' ? l : l.name
    );
    return {
      isMatch: true,
      matchedLabels: allLabelNames,
      totalTracked: trackedLabels.length,
      totalMatched: allLabelNames.length,
      matchMode,
      reason: 'Tracking all issues from this repository',
    };
  }

  const issueLabelNames = issueLabels.map((l) =>
    typeof l === 'string' ? normalizeLabel(l) : normalizeLabel(l.name)
  );

  const matchedLabels: string[] = [];

  for (const tracked of trackedLabels) {
    const normTracked = normalizeLabel(tracked);
    const foundIndex = issueLabelNames.indexOf(normTracked);
    if (foundIndex !== -1) {
      // preserve original casing
      const original = typeof issueLabels[foundIndex] === 'string'
        ? (issueLabels[foundIndex] as string)
        : (issueLabels[foundIndex] as GitHubLabel).name;
      matchedLabels.push(original);
    }
  }

  const isMatch =
    matchMode === 'all'
      ? matchedLabels.length === trackedLabels.length
      : matchedLabels.length > 0;

  let reason = '';
  if (isMatch) {
    reason =
      matchMode === 'all'
        ? `Matched all ${trackedLabels.length} tracked labels: ${matchedLabels.join(', ')}`
        : `Matched ${matchedLabels.length} of ${trackedLabels.length} tracked labels: ${matchedLabels.join(', ')}`;
  } else {
    reason =
      matchMode === 'all'
        ? `Missing some required labels (found ${matchedLabels.length}/${trackedLabels.length})`
        : `None of the issue labels matched any of the ${trackedLabels.length} tracked labels`;
  }

  return {
    isMatch,
    matchedLabels,
    totalTracked: trackedLabels.length,
    totalMatched: matchedLabels.length,
    matchMode,
    reason,
  };
}
