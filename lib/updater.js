const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const https = require('node:https');
const http = require('node:http');
const { createWriteStream } = require('node:fs');
const { app, dialog, shell } = require('electron');
const { spawn } = require('node:child_process');

const GITHUB_REPO = 'nqxo62y/Sonix';
const CURRENT_VERSION = require('../package.json').version;

function followRedirects(url, maxRedirects = 10) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'Sonix-Updater/' + CURRENT_VERSION } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(followRedirects(res.headers.location, maxRedirects - 1));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      resolve(res);
    });
    req.on('error', reject);
  });
}

function isNewer(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

async function checkForUpdates() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'Sonix-Updater/' + CURRENT_VERSION }
    });
    if (!res.ok) return { available: false, current: CURRENT_VERSION };
    const data = await res.json();
    const latest = (data.tag_name || '').replace(/^v/, '');
    const available = latest && isNewer(latest, CURRENT_VERSION);

    let installerUrl = null;
    if (available && data.assets && data.assets.length) {
      const setupAsset = data.assets.find(a => /setup\.exe$/i.test(a.name) || /installer.*\.exe$/i.test(a.name));
      const exeAsset = data.assets.find(a => /\.exe$/i.test(a.name));
      installerUrl = (setupAsset || exeAsset || {}).browser_download_url || null;
    }

    return {
      available,
      current: CURRENT_VERSION,
      latest,
      url: data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      installerUrl,
      notes: data.body || ''
    };
  } catch {
    return { available: false, current: CURRENT_VERSION };
  }
}

async function downloadUpdate(installerUrl, onStatus) {
  const tmpDir = path.join(os.tmpdir(), 'sonix-update');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const filename = path.basename(new URL(installerUrl).pathname) || 'Sonix-Setup.exe';
  const destPath = path.join(tmpDir, filename);

  if (fs.existsSync(destPath)) fs.unlinkSync(destPath);

  onStatus('Downloading update…');

  const res = await followRedirects(installerUrl);
  const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
  let downloaded = 0;

  await new Promise((resolve, reject) => {
    const ws = createWriteStream(destPath);
    res.on('data', chunk => {
      downloaded += chunk.length;
      ws.write(chunk);
      if (totalBytes > 0) {
        const pct = Math.round((downloaded / totalBytes) * 100);
        onStatus(`Downloading update… ${pct}%`);
      } else {
        const mb = (downloaded / 1024 / 1024).toFixed(1);
        onStatus(`Downloading update… ${mb} MB`);
      }
    });
    res.on('end', () => { ws.end(resolve); });
    res.on('error', reject);
    ws.on('error', reject);
  });

  onStatus('Download complete. Installing…');
  return destPath;
}

async function downloadAndInstall(installerUrl, onStatus) {
  const installerPath = await downloadUpdate(installerUrl, onStatus);

  onStatus('Launching installer…');

  const child = spawn(installerPath, [], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  });
  child.unref();

  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 2000);

  return true;
}

module.exports = { checkForUpdates, downloadAndInstall, CURRENT_VERSION };
