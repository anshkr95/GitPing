

const state = {
  subscriptions: [],
  issues: [],
  notifications: [],
  unreadNotifCount: 0,
  settings: {
    email: '', emailEnabled: true, soundEnabled: true,
    browserNotifyEnabled: false, pollingIntervalSeconds: 60,
    githubToken: '', maskedToken: '', hasToken: false,
  },
  activeTab: 'tracked',
  countdown: 60,
  // Label-selector state
  selectedRepo: null,
  editingSub: null,       // null = new, dict = editing existing
  repoLabels: [],
  selectedLabels: [],
  isSearching: false,
  searchPage: 1,
  searchHasMore: false,
  lastSearchQuery: '',
};

let scanTimer = null;
let searchDebounce = null;

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || data.message || `HTTP ${res.status}`);
  return data;
}

function $(id) { return document.getElementById(id); }
function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n || 0);
}

const LANG_COLORS = {
  javascript:'#f1e05a',typescript:'#3178c6',python:'#3572a5',java:'#b07219',
  go:'#00add8',rust:'#dea584',ruby:'#701516',php:'#4f5d95',swift:'#f05138',
  kotlin:'#a97bff','c#':'#178600','c++':'#f34b7d',c:'#555555',html:'#e34c26',
  css:'#563d7c',shell:'#89e051',dart:'#00b4ab',lua:'#000080',scala:'#c22d40',
  r:'#198ce7',vue:'#41b883',elixir:'#6e4a7e',haskell:'#5e5086',
};
function langColor(lang) {
  return LANG_COLORS[(lang || '').toLowerCase()] || '#8b949e';
}
function getContrastColor(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.substr(0,2),16), g = parseInt(hex.substr(2,2),16), b = parseInt(hex.substr(4,2),16);
  return (r*299+g*587+b*114)/1000 > 140 ? '#000' : '#fff';
}

document.addEventListener('DOMContentLoaded', () => {
  $('search-input').addEventListener('input', e => {
    clearTimeout(searchDebounce);
    const q = e.target.value.trim();
    state.searchPage = 1;
    searchDebounce = setTimeout(() => handleSearch(q), 350);
  });
  if (!localStorage.getItem('gitping_setup_done')) {
    $('setup-modal').classList.add('open');
  }
  fetchAllData();
});

async function fetchAllData() {
  try {
    const [subs, issues, notifs, settings] = await Promise.all([
      api('/api/subscriptions').catch(() => ({ subscriptions: [] })),
      api('/api/issues').catch(() => ({ issues: [] })),
      api('/api/notifications').catch(() => ({ notifications: [], unreadCount: 0 })),
      api('/api/settings').catch(() => ({ settings: {} })),
    ]);
    state.subscriptions = subs.subscriptions || [];
    state.issues = issues.issues || [];
    state.notifications = notifs.notifications || [];
    state.unreadNotifCount = notifs.unreadCount || 0;
    if (settings.settings) {
      state.settings = { ...state.settings, ...settings.settings };
    }
    startCountdown();
    render();
  } catch {
    toast('Failed to load data', 'Please try again.', 'error');
  }
}

function startCountdown() {
  clearInterval(scanTimer);
  state.countdown = state.settings.pollingIntervalSeconds || 60;
  $('countdown').textContent = state.countdown;
  scanTimer = setInterval(() => {
    state.countdown--;
    if (state.countdown <= 0) {
      handleManualScan();
      state.countdown = state.settings.pollingIntervalSeconds || 60;
    }
    $('countdown').textContent = state.countdown;
  }, 1000);
}

function render() {
  const activeSubs = state.subscriptions.filter(s => s.isActive !== false);
  $('header-repo-count').textContent = `${activeSubs.length} repo${activeSubs.length !== 1 ? 's' : ''} tracked`;
  $('tab-badge-tracked').textContent = state.subscriptions.length;
  $('tab-badge-issues').textContent = state.issues.length;

  // Notification badge
  const badge = $('notif-badge');
  if (state.unreadNotifCount > 0) {
    badge.textContent = state.unreadNotifCount > 99 ? '99+' : state.unreadNotifCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  renderSubscriptions();
  renderIssues();
  renderNotifications();
}

function setTab(tab) {
  state.activeTab = tab;
  ['issues', 'tracked', 'resources'].forEach(name => {
    $(`tab-${name}`).classList.toggle('active', name === tab);
    $(`content-${name}`).classList.toggle('hidden', name !== tab);
  });
}

function buildSearchUrl(page) {
  const q = $('search-input').value.trim();
  const lang = $('filter-language').value;
  const sortVal = $('filter-sort').value;
  const topic = $('filter-topic').value.trim();

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (lang) params.set('language', lang);
  if (topic) params.set('topics', topic);
  if (page > 1) params.set('page', page);

  if (sortVal) {
    const [sort, order] = sortVal.split('-');
    params.set('sort', sort);
    params.set('order', order || 'desc');
  }

  return `/api/repos/search?${params.toString()}`;
}

function triggerFilteredSearch() {
  const q = $('search-input').value.trim();
  if (!q) return;
  state.searchPage = 1;
  handleSearch(q, true);
}

async function handleSearch(query, resetResults = true) {
  const container = $('search-results');
  const loading = $('search-loading');
  const loadMore = $('search-load-more');

  if (resetResults) {
    container.innerHTML = '';
    loadMore.classList.add('hidden');
  }

  if (!query) { loading.classList.add('hidden'); loadMore.classList.add('hidden'); return; }

  loading.classList.remove('hidden');
  state.isSearching = true;
  state.lastSearchQuery = query;

  try {
    const data = await api(buildSearchUrl(state.searchPage));
    loading.classList.add('hidden');
    const items = data.items || [];

    if (items.length === 0 && resetResults && !data.error) {
      container.innerHTML = '<div class="empty-state" style="padding:1.5rem"><p>No repositories found. Try different filters.</p></div>';
      loadMore.classList.add('hidden');
      return;
    }

    state.searchHasMore = !!data.hasMore;
    loadMore.classList.toggle('hidden', !data.hasMore);

    items.forEach(repo => {
      const fullName = repo.full_name || '';
      const owner = repo.owner || {};
      const isTracked = state.subscriptions.some(s => s.repoFullName?.toLowerCase() === fullName.toLowerCase());

      const card = document.createElement('div');
      card.className = 'card search-card';
      card.innerHTML = `
        <div class="search-card-header">
          <img class="search-card-avatar" src="${owner.avatar_url || ''}" alt="" loading="lazy" onerror="this.style.display='none'">
          <div class="search-card-info">
            <h4><a href="https://github.com/${fullName}" target="_blank" rel="noopener">${fullName}</a></h4>
            ${repo.description ? `<p class="search-card-desc">${escapeHtml(repo.description)}</p>` : ''}
          </div>
        </div>
        <div class="search-card-meta">
          <span><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-2px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> ${formatNumber(repo.stargazers_count)}</span>
          <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg> ${formatNumber(repo.forks_count)}</span>
          <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ${formatNumber(repo.open_issues_count)} issues</span>
          ${repo.language ? `<span><span class="lang-dot" style="background:${langColor(repo.language)}"></span> ${repo.language}</span>` : ''}
        </div>
        <div class="search-card-actions">
          ${isTracked
            ? '<span class="header-badge" style="color:var(--success-fg)">Already Tracked</span>'
            : `<button class="btn btn-primary btn-sm" data-track>Track</button>`
          }
        </div>
      `;

      const trackBtn = card.querySelector('[data-track]');
      if (trackBtn) {
        trackBtn.addEventListener('click', () => openLabelModal(repo));
      }

      container.appendChild(card);
    });

    if (data.error) toast('Search limited', data.error, 'warning');
  } catch (err) {
    loading.classList.add('hidden');
    toast('Search failed', err.message, 'error');
  }
  state.isSearching = false;
}

function loadMoreResults() {
  state.searchPage++;
  handleSearch(state.lastSearchQuery, false);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderSubscriptions() {
  const list = $('tracked-list');
  const empty = $('tracked-empty');
  const heading = $('tracked-heading');
  list.innerHTML = '';

  if (state.subscriptions.length === 0) {
    empty.classList.remove('hidden');
    heading.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  heading.classList.remove('hidden');

  state.subscriptions.forEach(sub => {
    const isActive = sub.isActive !== false;
    const isTrackAll = (sub.trackedLabels || []).includes('__ALL__');
    const labels = isTrackAll ? [] : (sub.trackedLabels || []);

    const card = document.createElement('div');
    card.className = 'card tracked-card';

    // Header
    let headerHtml = `<div class="tracked-card-header">`;
    if (sub.repoAvatar) {
      headerHtml += `<img class="tracked-card-avatar" src="${sub.repoAvatar}" alt="" loading="lazy" onerror="this.style.display='none'">`;
    }
    headerHtml += `<div class="tracked-card-info">
        <h4><a href="${sub.repoUrl || `https://github.com/${sub.repoFullName}`}" target="_blank" rel="noopener">${sub.repoFullName}</a></h4>
      </div>
      <span class="tracked-card-status ${isActive ? 'status-active' : 'status-paused'}">${isActive ? 'Active' : 'Paused'}</span>
    </div>`;

    // Labels
    let labelsHtml = '<div class="tracked-card-labels">';
    if (isTrackAll) {
      labelsHtml += '<span class="label-pill" style="background:var(--accent-fg);color:#fff">All Issues</span>';
    } else {
      labels.forEach(l => {
        labelsHtml += `<span class="label-pill" style="background:var(--neutral-muted);color:var(--fg-default)">${escapeHtml(l)}</span>`;
      });
    }
    if (sub.matchMode === 'all' && !isTrackAll) {
      labelsHtml += '<span class="label-pill" style="background:var(--warning-fg);color:#000;font-size:.625rem">MATCH ALL</span>';
    }
    labelsHtml += '</div>';

    // Footer
    const statsHtml = `<div class="tracked-card-stats">
      ${sub.matchedCount ? `${sub.matchedCount} match${sub.matchedCount !== 1 ? 'es' : ''}` : 'No matches yet'}
      ${sub.lastCheckedAt ? ` · Checked ${timeAgo(sub.lastCheckedAt)}` : ''}
    </div>`;

    card.innerHTML = `
      ${headerHtml}
      ${labelsHtml}
      <div class="tracked-card-footer">
        ${statsHtml}
        <div class="tracked-card-actions">
          <button class="btn btn-sm" data-edit title="Edit labels">Edit</button>
          <button class="btn btn-sm" data-scan title="Scan now">Scan</button>
          <button class="btn btn-sm" data-pause title="${isActive ? 'Pause' : 'Resume'}">${isActive ? 'Pause' : 'Resume'}</button>
          <button class="btn btn-sm btn-danger" data-delete title="Delete">Delete</button>
        </div>
      </div>
    `;

    card.querySelector('[data-edit]').addEventListener('click', () => {
      openLabelModal({
        full_name: sub.repoFullName,
        name: sub.repoName,
        owner: { login: sub.repoOwner, avatar_url: sub.repoAvatar },
        html_url: sub.repoUrl,
        description: sub.repoDescription,
        stargazers_count: sub.repoStars,
        language: sub.repoLanguage,
      }, sub);
    });
    card.querySelector('[data-scan]').addEventListener('click', () => scanSingle(sub.id));
    card.querySelector('[data-pause]').addEventListener('click', () => togglePause(sub.id, isActive));
    card.querySelector('[data-delete]').addEventListener('click', () => deleteSub(sub.id, sub.repoFullName));

    list.appendChild(card);
  });
}

function renderIssues() {
  const list = $('issues-list');
  const empty = $('issues-empty');
  list.innerHTML = '';

  if (state.issues.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  state.issues.forEach(issue => {
    const card = document.createElement('div');
    card.className = `card issue-card${issue.isRead ? '' : ' unread'}`;

    const labelsHtml = (issue.labels || []).map(l => {
      const color = (typeof l === 'string') ? '888888' : (l.color || '888888');
      const name = (typeof l === 'string') ? l : (l.name || '');
      return `<span class="label-pill" style="background:#${color};color:${getContrastColor(color)}">${escapeHtml(name)}</span>`;
    }).join('');

    const matchedHtml = (issue.matchedLabels || []).map(m =>
      `<span class="label-pill" style="background:var(--success-emphasis);color:#fff;font-size:.625rem">✓ ${escapeHtml(m)}</span>`
    ).join('');

    card.innerHTML = `
      <div class="issue-card-repo">${issue.repoFullName} #${issue.issueNumber}</div>
      <h3 class="issue-card-title"><a href="${issue.issueUrl}" target="_blank" rel="noopener">${escapeHtml(issue.issueTitle)}</a></h3>
      <div class="issue-card-labels">${labelsHtml} ${matchedHtml}</div>
      <div class="issue-card-footer">
        <div class="issue-card-meta">
          ${issue.authorAvatar ? `<img src="${issue.authorAvatar}" alt="">` : ''}
          <span>${issue.authorLogin || 'unknown'}</span>
          <span>· ${timeAgo(issue.createdAt)}</span>
        </div>
        ${!issue.isRead ? '<button class="btn btn-ghost btn-sm" data-markread>Mark read</button>' : ''}
      </div>
    `;

    const markBtn = card.querySelector('[data-markread]');
    if (markBtn) {
      markBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await api('/api/issues', { method: 'PATCH', body: JSON.stringify({ id: issue.id }) });
          await fetchAllData();
        } catch (err) { toast('Error', err.message, 'error'); }
      });
    }

    list.appendChild(card);
  });
}

function renderNotifications() {
  const list = $('notif-list');
  list.innerHTML = '';

  if (state.notifications.length === 0) {
    list.innerHTML = `<div style="padding:3rem 1rem;text-align:center;color:var(--fg-subtle)">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:.5rem"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <p style="font-size:.8125rem;margin:0">No notifications yet</p>
      <p style="font-size:.75rem;margin:.25rem 0 0;color:var(--fg-subtle)">Scan tracked repos to detect matching issues</p>
    </div>`;
    return;
  }

  state.notifications.forEach(n => {
    const item = document.createElement('div');
    item.className = `notif-item${n.isRead ? '' : ' unread'}`;

    const matchedLabels = (n.matchedLabels || []).map(l =>
      `<span class="label-pill" style="background:var(--neutral-muted);color:var(--fg-default);font-size:.625rem">${escapeHtml(l)}</span>`
    ).join(' ');

    item.innerHTML = `
      <div class="notif-item-repo">${escapeHtml(n.repoFullName || '')} #${n.issueNumber || ''}</div>
      <div class="notif-item-title">${escapeHtml(n.issueTitle || '')}</div>
      ${matchedLabels ? `<div style="display:flex;gap:.25rem;flex-wrap:wrap">${matchedLabels}</div>` : ''}
      <div class="notif-item-time">${timeAgo(n.createdAt)}</div>
    `;
    item.addEventListener('click', () => {
      if (n.issueUrl) window.open(n.issueUrl, '_blank');
      if (!n.isRead) {
        api('/api/notifications', { method: 'PATCH', body: JSON.stringify({ id: n.id }) })
          .then(() => fetchAllData());
      }
    });
    list.appendChild(item);
  });
}

async function openLabelModal(repo, existingSub) {
  state.selectedRepo = repo;
  state.editingSub = existingSub || null;
  const isEdit = !!existingSub;

  state.selectedLabels = isEdit
    ? (existingSub.trackedLabels || []).filter(l => l !== '__ALL__')
    : [];

  $('label-modal-title').textContent = isEdit ? `Edit: ${repo.full_name}` : `Track: ${repo.full_name}`;
  $('label-track-all').checked = isEdit && (existingSub.trackedLabels || []).includes('__ALL__');
  $('label-match-mode').value = existingSub?.matchMode || 'any';
  $('btn-save-labels').textContent = isEdit ? 'Update' : 'Save & Track';
  $('label-modal').classList.add('open');

  toggleTrackAll();      // Show/hide label grid
  updateLabelCount();

  // Fetch labels
  const grid = $('label-grid');
  const loading = $('label-loading');
  grid.innerHTML = '';
  loading.classList.remove('hidden');

  try {
    const [owner, name] = repo.full_name.split('/');
    const data = await api(`/api/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/labels`);
    state.repoLabels = data.labels || [];

    loading.classList.add('hidden');
    state.repoLabels.forEach(label => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'label-pill select-label';
      pill.textContent = label.name;

      const color = label.color || 'cccccc';
      pill.style.background = `#${color}`;
      pill.style.color = getContrastColor(color);

      if (state.selectedLabels.includes(label.name)) {
        pill.classList.add('selected');
      }

      pill.addEventListener('click', () => {
        pill.classList.toggle('selected');
        state.selectedLabels = [...grid.querySelectorAll('.select-label.selected')].map(el => el.textContent);
        updateLabelCount();
      });

      grid.appendChild(pill);
    });

    if (state.repoLabels.length === 0) {
      grid.innerHTML = '<p style="color:var(--fg-muted);font-size:.8125rem;padding:.5rem">No labels found for this repository. Use "Track All Issues" instead.</p>';
    }
  } catch (err) {
    loading.classList.add('hidden');
    grid.innerHTML = `<p style="color:var(--danger-fg);font-size:.8125rem;padding:.5rem">Failed to load labels: ${escapeHtml(err.message)}</p>`;
  }
}

function closeLabelModal() { $('label-modal').classList.remove('open'); }

function toggleTrackAll() {
  const trackAll = $('label-track-all').checked;
  $('label-filters').style.display = trackAll ? 'none' : 'block';
}

function updateLabelCount() {
  $('label-count-hint').textContent = `(${state.selectedLabels.length} selected)`;
}

async function saveLabels() {
  if (!state.selectedRepo) return;
  const trackAll = $('label-track-all').checked;
  const trackedLabels = trackAll ? ['__ALL__'] : state.selectedLabels;

  if (!trackedLabels.length) {
    toast('Choose labels', 'Select at least one label or enable "Track All Issues".', 'error');
    return;
  }

  const repo = state.selectedRepo;
  const isEdit = !!state.editingSub;
  const body = {
    repoFullName: repo.full_name,
    repoOwner: (repo.owner || {}).login || repo.full_name.split('/')[0],
    repoName: repo.name || repo.full_name.split('/')[1],
    repoUrl: repo.html_url || `https://github.com/${repo.full_name}`,
    repoAvatar: (repo.owner || {}).avatar_url || '',
    repoDescription: repo.description || '',
    repoStars: repo.stargazers_count || 0,
    repoLanguage: repo.language || '',
    trackedLabels,
    matchMode: $('label-match-mode').value,
    isActive: true,
  };

  try {
    if (isEdit) {
      await api('/api/subscriptions', {
        method: 'PATCH',
        body: JSON.stringify({ id: state.editingSub.id, ...body }),
      });
      toast('Updated', `Labels updated for ${repo.full_name}`, 'success');
    } else {
      const result = await api('/api/subscriptions', { method: 'POST', body: JSON.stringify(body) });
      toast('Tracking', `Now tracking ${repo.full_name}`, 'success');
      // Start monitoring right away rather than waiting for the next countdown.
      // This also records the initial scan boundary for subsequent polls.
      await api('/api/monitor/scan', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId: result.subscription.id }),
      });
    }
    closeLabelModal();
    await fetchAllData();
    if (!isEdit) {
      $('search-results').innerHTML = '';
      $('search-load-more').classList.add('hidden');
      $('search-input').value = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  } catch (err) {
    toast('Could not save', err.message, 'error');
  }
}

async function deleteSub(id, name) {
  if (!confirm(`Stop tracking ${name || 'this repository'}?`)) return;
  try {
    await api(`/api/subscriptions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    toast('Removed', `Stopped tracking ${name || 'repository'}`, 'info');
    await fetchAllData();
  } catch (err) { toast('Error', err.message, 'error'); }
}

async function togglePause(id, currentlyActive) {
  try {
    await api('/api/subscriptions', {
      method: 'PATCH',
      body: JSON.stringify({ id, isActive: !currentlyActive }),
    });
    toast(currentlyActive ? 'Paused' : 'Resumed', '', 'info');
    await fetchAllData();
  } catch (err) { toast('Error', err.message, 'error'); }
}

async function scanSingle(subId) {
  try {
    toast('Scanning…', '', 'info');
    const data = await api('/api/monitor/scan', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId: subId }),
    });
    toast('Scan complete', `${data.matchesFound || 0} new matches`, 'success');
    await fetchAllData();
  } catch (err) { toast('Scan failed', err.message, 'error'); }
}

async function handleManualScan() {
  const spinner = $('scan-spinner');
  const scanIcon = document.querySelector('.scan-icon');
  spinner.classList.remove('hidden');
  if (scanIcon) scanIcon.classList.add('hidden');
  $('btn-scan').disabled = true;

  try {
    const data = await api('/api/monitor/scan', { method: 'POST' });
    const matches = data.report?.totalMatchesFound || 0;
    toast('Scan complete', matches > 0 ? `${matches} new match${matches !== 1 ? 'es' : ''} found!` : 'No new matches', matches > 0 ? 'success' : 'info');
    await fetchAllData();
  } catch (err) {
    toast('Scan failed', err.message, 'error');
  } finally {
    spinner.classList.add('hidden');
    if (scanIcon) scanIcon.classList.remove('hidden');
    $('btn-scan').disabled = false;
    state.countdown = state.settings.pollingIntervalSeconds || 60;
  }
}

function openSettingsModal() {
  $('settings-email').value = state.settings.email || '';
  $('settings-email-enabled').checked = state.settings.emailEnabled !== false;
  $('settings-sound-enabled').checked = state.settings.soundEnabled !== false;
  $('settings-browser-enabled').checked = !!state.settings.browserNotifyEnabled;
  $('settings-polling').value = state.settings.pollingIntervalSeconds || 60;
  $('settings-token').value = '';
  $('settings-token-hint').textContent = state.settings.hasToken
    ? `Current: ${state.settings.maskedToken || '****'}`
    : 'No token set';
  $('settings-modal').classList.add('open');
}
function closeSettingsModal() { $('settings-modal').classList.remove('open'); }

async function saveSettings() {
  const updates = {
    email: $('settings-email').value.trim(),
    emailEnabled: $('settings-email-enabled').checked,
    soundEnabled: $('settings-sound-enabled').checked,
    browserNotifyEnabled: $('settings-browser-enabled').checked,
    pollingIntervalSeconds: parseInt($('settings-polling').value, 10) || 60,
  };
  const newToken = $('settings-token').value.trim();
  if (newToken) updates.githubToken = newToken;

  try {
    await api('/api/settings', { method: 'POST', body: JSON.stringify(updates) });
    toast('Saved', 'Settings updated successfully', 'success');
    closeSettingsModal();
    await fetchAllData();
  } catch (err) { toast('Save failed', err.message, 'error'); }
}

async function sendTestEmail() {
  const email = $('settings-email').value.trim();
  if (!email || !email.includes('@')) {
    toast('Invalid email', 'Please enter a valid email address first.', 'error');
    return;
  }
  try {
    toast('Sending…', `Test email to ${email}`, 'info');
    await api('/api/settings/test-email', { method: 'POST', body: JSON.stringify({ email }) });
    toast('Sent!', `Check your inbox at ${email}`, 'success');
  } catch (err) {
    toast('Email failed', err.message, 'error');
  }
}

function skipSetup() {
  localStorage.setItem('gitping_setup_done', 'true');
  $('setup-modal').classList.remove('open');
}

async function finishSetup() {
  const email = $('setup-email').value.trim();
  const token = $('setup-token').value.trim();
  try {
    const updates = {};
    if (email) updates.email = email;
    if (token) updates.githubToken = token;
    if (Object.keys(updates).length) {
      await api('/api/settings', { method: 'POST', body: JSON.stringify(updates) });
    }
    skipSetup();
    await fetchAllData();
    toast('Welcome!', 'GitPing is ready to go.', 'success');
  } catch (err) {
    toast('Setup error', err.message, 'error');
  }
}

function openNotifDrawer() { $('notif-drawer').classList.add('open'); }
function closeNotifDrawer() { $('notif-drawer').classList.remove('open'); }

async function markAllRead() {
  try {
    await api('/api/notifications', { method: 'PATCH', body: JSON.stringify({ markAll: true }) });
    await fetchAllData();
    toast('Done', 'All notifications marked as read', 'info');
  } catch (err) { toast('Error', err.message, 'error'); }
}

async function clearAllNotifications() {
  try {
    await api('/api/notifications', { method: 'DELETE' });
    await fetchAllData();
    toast('Cleared', 'All notifications removed', 'info');
  } catch (err) { toast('Error', err.message, 'error'); }
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('gitping_theme', next);
}

function toast(title, desc, type = 'info') {
  const container = $('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}${desc ? ' has-desc' : ''}`;
  
  let icon = '';
  if (type === 'success') {
    icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  } else if (type === 'error') {
    icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  } else if (type === 'warning') {
    icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  } else {
    icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  el.innerHTML = `
    ${icon}
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      ${desc ? `<div class="toast-desc">${escapeHtml(desc)}</div>` : ''}
    </div>
  `;
  el.addEventListener('click', () => { el.style.opacity = '0'; setTimeout(() => el.remove(), 200); });
  container.appendChild(el);
  setTimeout(() => { if (el.parentNode) { el.style.opacity = '0'; setTimeout(() => { if (el.parentNode) el.remove(); }, 200); } }, 3500);
}
