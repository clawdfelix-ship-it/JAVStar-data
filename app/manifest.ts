import type { MetadataRoute } from 'next';

// PWA manifest — Next.js App Router 會自動喺 <head> 注入 manifest link
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'J-STAR CALENDAR｜日本女優活動情報平台',
    short_name: 'J-STAR',
    description: '一站式追蹤心儀女優嘅最新活動、見面會、攝影會情報',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF5F7',
    theme_color: '#BE185D',
    lang: 'zh-HK',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
