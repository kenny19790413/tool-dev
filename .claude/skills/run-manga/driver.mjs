#!/usr/bin/env node
/**
 * manga.html ドライバー
 * Usage:
 *   node driver.mjs ss              — スクリーンショット撮影
 *   node driver.mjs open [url]      — ページを開いてスクリーンショット
 *   node driver.mjs login-screen    — ログイン画面を確認
 */

import { chromium } from 'playwright';
import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../../../');
const SCREENSHOT_DIR = resolve(__dirname, 'screenshots');
const PORT = 8765;
const BASE_URL = `http://localhost:${PORT}`;

if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

async function startServer() {
  // すでに起動中か確認
  try {
    const res = await fetch(`${BASE_URL}/manga.html`, { redirect: 'follow' });
    if (res.ok) return null; // 既に起動中
  } catch {}

  const srv = spawn('npx', ['serve', '-p', String(PORT), '--no-request-logging'], {
    cwd: PROJECT_ROOT,
    detached: true,
    stdio: 'ignore',
    shell: true,
  });
  srv.unref();

  // 起動待ち
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch(`${BASE_URL}/manga.html`, { redirect: 'follow' });
      if (res.ok) return srv;
    } catch {}
  }
  throw new Error('サーバーの起動がタイムアウトしました');
}

async function screenshot(page, name) {
  const file = resolve(SCREENSHOT_DIR, `${name}_${timestamp()}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`📸 ${file}`);
  return file;
}

async function main() {
  const cmd = process.argv[2] || 'ss';

  const srv = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone サイズ

  try {
    if (cmd === 'ss' || cmd === 'login-screen') {
      await page.goto(`${BASE_URL}/manga.html`, { waitUntil: 'networkidle', timeout: 15000 });
      // ローディング overlay が消えるまで待つ（最大5秒）
      await page.waitForFunction(
        () => {
          const el = document.querySelector('.auth-loading');
          return !el || el.classList.contains('hidden');
        },
        { timeout: 5000 }
      ).catch(() => {});
      await screenshot(page, 'login-screen');
    } else if (cmd === 'open') {
      const url = process.argv[3] || `${BASE_URL}/manga.html`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await screenshot(page, 'page');
    } else {
      console.error(`不明なコマンド: ${cmd}`);
      console.error('使い方: node driver.mjs [ss|login-screen|open]');
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  console.error(e.message);
  process.exit(1);
});
