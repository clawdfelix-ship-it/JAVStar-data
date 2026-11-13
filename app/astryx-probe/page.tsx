'use client';

import { useState } from 'react';
import {
  Theme,
  defineTheme,
  Button,
  Card,
  Badge,
  Toast,
  useToast,
} from '@astryxdesign/core';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';

const theme = defineTheme({
  name: 'jching-admin-probe',
  tokens: {
    '--color-accent': '#ec6aa0',
    '--color-accent-muted': '#f8c9dc',
    '--color-background-surface': '#fff7fb',
    '--color-background-body': '#fdf2f7',
    '--color-background-card': '#ffffff',
    '--color-text-primary': '#35202b',
    '--color-text-secondary': '#6d4a58',
    '--radius-container': '14px',
  },
});

export default function AstryxProbePage() {
  const [n, setN] = useState(0);
  const toast = useToast();
  return (
    <Theme theme={theme} mode="light">
      <main style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
        <h1>Astryx × Next.js 相容性探測頁</h1>
        <p>若此頁 build 到且粉色按鈕正常，代表 Astryx 可在此 Next 15 App Router 專案運作。</p>
        <Card padding={4}>
          <Badge label="測試" variant="info" />
          <h2>點擊計數：{n}</h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button label="+1" variant="primary" onClick={() => setN((v) => v + 1)} />
            <Button
              label="顯示 Toast"
              variant="secondary"
              onClick={() => toast({ body: 'Astryx Toast 喺 Next 入面正常', type: 'info' })}
            />
          </div>
        </Card>
      </main>
    </Theme>
  );
}
