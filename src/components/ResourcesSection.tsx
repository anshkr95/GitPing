'use client';

import React from 'react';
import { ExternalLink, Search, Bell, Compass } from 'lucide-react';

export function ResourcesSection() {
  return (
    <div style={{ maxWidth: 720 }}>
      {/* Quick intro */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--fg-default)', marginBottom: 8 }}>
          What is GitPing?
        </h2>
        <p style={{ fontSize: 14, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
          GitPing helps you find open source projects to contribute to, and catch their new
          issues the moment they open. Search any GitHub repository, choose the labels you care
          about (or track every new issue), and get notified in real time so you can jump on
          something before it&apos;s claimed.
        </p>
      </div>

      {/* How it works: 3 quick steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        <Step
          icon={<Search size={15} style={{ color: 'var(--accent-fg)' }} />}
          title="1. Search a repository"
          text="Look up any public repo by name and filter by language or tags to find projects that match your stack."
        />
        <Step
          icon={<Compass size={15} style={{ color: 'var(--success-fg)' }} />}
          title="2. Pick what to track"
          text="Choose specific labels like good first issue or help wanted, or track all issues if you want everything from that repo."
        />
        <Step
          icon={<Bell size={15} style={{ color: 'var(--attention-fg)' }} />}
          title="3. Get notified"
          text="GitPing scans on an interval and alerts you the instant a matching issue appears."
        />
      </div>

      {/* Where to find projects */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-default)', marginBottom: 12 }}>
          Where to find open source projects
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ResourceCard
            title="GitHub Explore"
            url="https://github.com/explore"
            description="Browse trending repositories and topics across GitHub, then paste the ones you like into the Tracked tab."
          />
          <ResourceCard
            title="Up For Grabs"
            url="https://up-for-grabs.net"
            description="A directory of projects that actively want contributions, tagged with labels like 'up-for-grabs' and 'help wanted'."
          />
          <ResourceCard
            title="Good First Issues"
            url="https://goodfirstissues.com"
            description="A live list of issues tagged 'good first issue', handy for finding approachable repos to start tracking."
          />
          <ResourceCard
            title="CodeTriage"
            url="https://www.codetriage.com"
            description="Discover popular open source projects that need help, sorted by language and activity."
          />
        </div>
      </div>
    </div>
  );
}

function Step({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-default)' }}>{title}</div>
        <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5, margin: '2px 0 0 0' }}>{text}</p>
      </div>
    </div>
  );
}

function ResourceCard({ title, url, description }: { title: string; url: string; description: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'block',
        padding: '14px 16px',
        border: '1px solid var(--border-muted)',
        borderRadius: 6,
        background: 'var(--surface)',
        textDecoration: 'none',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-muted)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-fg)' }}>{title}</span>
        <ExternalLink size={12} style={{ color: 'var(--fg-subtle)' }} />
      </div>
      <p style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.5, margin: 0 }}>{description}</p>
    </a>
  );
}
