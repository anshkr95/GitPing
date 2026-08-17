export interface CuratedRepo {
  owner: string;
  repo: string;
  fullName: string;
  title: string;
  description: string;
  language: string;
  stars: number;
  avatar: string;
  popularLabels: string[];
}

export const CURATED_REPOSITORIES: CuratedRepo[] = [
  {
    owner: 'matplotlib',
    repo: 'matplotlib',
    fullName: 'matplotlib/matplotlib',
    title: 'Matplotlib',
    description: 'Plotting library for the Python programming language and its numerical mathematics extension NumPy.',
    language: 'Python',
    stars: 19800,
    avatar: 'https://avatars.githubusercontent.com/u/215947',
    popularLabels: ['good first issue', 'help wanted', 'Documentation', 'Difficulty: Medium', 'bug', 'enhancement'],
  },
  {
    owner: 'facebook',
    repo: 'react',
    fullName: 'facebook/react',
    title: 'React',
    description: 'The library for web and native user interfaces.',
    language: 'JavaScript',
    stars: 228000,
    avatar: 'https://avatars.githubusercontent.com/u/69631',
    popularLabels: ['good first issue', 'help wanted', 'Component: Developer Tools', 'Type: Bug', 'Type: Feature Request'],
  },
  {
    owner: 'vercel',
    repo: 'next.js',
    fullName: 'vercel/next.js',
    title: 'Next.js',
    description: 'The React Framework for the Web.',
    language: 'TypeScript',
    stars: 125000,
    avatar: 'https://avatars.githubusercontent.com/u/14985020',
    popularLabels: ['good first issue', 'area: docs', 'template: bug', 'template: feature', 'kind: enhancement'],
  },
  {
    owner: 'tailwindlabs',
    repo: 'tailwindcss',
    fullName: 'tailwindlabs/tailwindcss',
    title: 'Tailwind CSS',
    description: 'A utility-first CSS framework for rapid UI development.',
    language: 'TypeScript',
    stars: 82000,
    avatar: 'https://avatars.githubusercontent.com/u/67104415',
    popularLabels: ['good first issue', 'help wanted', 'documentation', 'needs reproduction'],
  },
  {
    owner: 'torvalds',
    repo: 'linux',
    fullName: 'torvalds/linux',
    title: 'Linux Kernel',
    description: 'Linux kernel source tree.',
    language: 'C',
    stars: 180000,
    avatar: 'https://avatars.githubusercontent.com/u/1024025',
    popularLabels: ['cleanup', 'documentation', 'patch', 'bug'],
  },
  {
    owner: 'golang',
    repo: 'go',
    fullName: 'golang/go',
    title: 'Go Language',
    description: 'The Go programming language.',
    language: 'Go',
    stars: 125000,
    avatar: 'https://avatars.githubusercontent.com/u/4314092',
    popularLabels: ['help wanted', 'Documentation', 'NeedsFix', 'Proposal-Accepted'],
  },
];
