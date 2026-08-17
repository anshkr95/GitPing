import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GitPing',
  description: 'Track GitHub repositories and get notified when new issues match your selected labels.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Set theme before paint to prevent flashing
  const themeScript = `(function(){try{var m=localStorage.getItem('gitping_theme_mode')||'system';var t=localStorage.getItem('gitping_theme')||'dark';var mq=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)');var resolve=function(){return m==='system'?((mq&&mq.matches)?'light':'dark'):t;};document.documentElement.setAttribute('data-theme',resolve());if(mq&&mq.addEventListener){mq.addEventListener('change',function(){if((localStorage.getItem('gitping_theme_mode')||'system')==='system'){document.documentElement.setAttribute('data-theme',mq.matches?'light':'dark');}});}}catch(e){}})();`;

  return (
    <html lang="en" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
