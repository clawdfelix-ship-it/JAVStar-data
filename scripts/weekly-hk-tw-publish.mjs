#!/usr/bin/env node
// 發佈指定週期目錄內港台 Feed，每個 Feed 成功後緊接發對應 9:16 Story。
// published.json 逐步落盤：Story 失敗或重跑都唔會重複出 Feed。
import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const i = process.argv.indexOf('--dir');
const dir = i >= 0 ? resolve(process.argv[i + 1] || '') : '';
if (!dir || !existsSync(join(dir, 'manifest.json'))) throw new Error('要 --dir <含 manifest.json 嘅週期目錄>');
const REPO = '/Users/siulungchan/projects/JAVStar-data';
const REG = '/Users/siulungchan/.hermes/profiles/javstar-ops/secrets/ig-accounts.json';
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
const statePath = join(dir, 'published.json');
const state = existsSync(statePath)
  ? JSON.parse(readFileSync(statePath, 'utf8'))
  : { account: 'jching', from: manifest.from, to: manifest.to, posts: {} };
const save = () => {
  const tmp = `${statePath}.tmp`;
  writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n');
  renameSync(tmp, statePath);
};
const env = { ...process.env, IG_ACCOUNTS_FILE: REG };
const errors = [];

for (const post of manifest.posts) {
  const s = state.posts[post.region] || {};
  state.posts[post.region] = s;
  try {
    if (!s.media_id) {
      const out = execFileSync('node', [
        'scripts/ig-publish.mjs', '--account', 'jching',
        '--image', post.image, '--caption-file', post.caption_file,
      ], { cwd: REPO, encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] });
      const permalink = out.match(/permalink:\s*(\S+)/);
      const media = out.match(/media id:\s*(\d+)/);
      if (!media) throw new Error(`${post.label} Feed 冇回傳 media id：${out.slice(0, 300)}`);
      s.media_id = media[1];
      s.permalink = permalink ? permalink[1] : '';
      s.published_at = new Date().toISOString();
      save();
      console.log(`✅ ${post.label} Feed 已發佈：${s.permalink || s.media_id}`);
    } else {
      console.log(`↩️ ${post.label} Feed 已發過，跳過：${s.permalink || s.media_id}`);
    }

    if (!s.story_media_id) {
      // Story 可點擊 mention：每區一個 <region>-story-tags.json；IG API 每 Story 上限 26 個 user_tags
      const tagsFile = join(dir, `${post.region}-story-tags.json`);
      const storyArgs = ['scripts/ig-story-publish.mjs', '--account', 'jching', '--image', post.story_image];
      if (existsSync(tagsFile)) storyArgs.push('--tags-file', tagsFile);
      const out = execFileSync('node', storyArgs,
        { cwd: REPO, encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] });
      const story = out.match(/Story 已發佈 media id:\s*(\d+)/);
      if (!story) throw new Error(`${post.label} Story 冇回傳 media id：${out.slice(0, 300)}`);
      s.story_media_id = story[1];
      s.story_published_at = new Date().toISOString();
      s.story_format = '9x16';
      if (existsSync(tagsFile)) {
        s.story_mentions = JSON.parse(readFileSync(tagsFile, 'utf8')).map((t) => t.username);
      }
      save();
      console.log(`📸 ${post.label} 9:16 Story 已發佈：${s.story_media_id}` +
        (s.story_mentions ? `（mention ${s.story_mentions.length} 個）` : ''));
    } else {
      console.log(`↩️ ${post.label} Story 已發過，跳過：${s.story_media_id}`);
    }
  } catch (e) {
    const message = (e.stderr || e.message || '').toString().slice(0, 500);
    s.last_error = message;
    save();
    errors.push(`${post.label}: ${message}`);
    console.error(`❌ ${post.label} 發佈失敗：${message}`);
  }
}
if (errors.length) process.exit(1);
