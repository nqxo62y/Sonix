const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const http = require('node:http');
const { createWriteStream } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { app } = require('electron');
const { extractZip, extractTar } = require('./unzip');

const BIN_URLS = {
  win32: 'https://github.com/nqxo62y/Sonix/releases/download/requirements/reqirements.zip',
  linux: 'https://github.com/nqxo62y/Sonix/releases/download/requirements/requirements-linux.zip'
};

const REQUIRED_FILES = {
  win32: ['yt-dlp.exe', 'ffmpeg.exe'],
  linux: ['yt-dlp', 'ffmpeg']
};

function getPlatformFiles() {
  return REQUIRED_FILES[process.platform] || REQUIRED_FILES.linux;
}

function getBinUrl() {
  return BIN_URLS[process.platform] || BIN_URLS.linux;
}

function getBinDir() {
  const dir = path.join(app.getPath('userData'), 'bin');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function areBinariesPresent() {
  const dir = getBinDir();
  return getPlatformFiles().every(f => fs.existsSync(path.join(dir, f)));
}

function followRedirects(url, maxRedirects = 10) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'Sonix/2.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(followRedirects(res.headers.location, maxRedirects - 1));
      }
      if (res.statusCode !== 200) return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
      resolve(res);
    });
    req.on('error', reject);
  });
}

function findBinariesRecursive(dir) {
  const required = getPlatformFiles();
  const found = {};
  function walk(d) {
    if (!fs.existsSync(d)) return;
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      const name = entry.name.toLowerCase();
      if (required.includes(name) && !found[name]) {
        found[name] = full;
      }
    }
  }
  walk(dir);
  return found;
}

async function downloadAndExtract(onStatus) {
  const binDir = getBinDir();
  const zipPath = path.join(binDir, 'binaries.zip');

  onStatus('Downloading required binaries\u2026');

  const res = await followRedirects(getBinUrl());
  const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
  let downloaded = 0;

  await new Promise((resolve, reject) => {
    const fileStream = createWriteStream(zipPath);
    res.on('data', chunk => {
      downloaded += chunk.length;
      fileStream.write(chunk);
      if (totalBytes > 0) {
        const pct = Math.round((downloaded / totalBytes) * 100);
        onStatus(`Downloading binaries\u2026 ${pct}%`);
      } else {
        const mb = (downloaded / 1024 / 1024).toFixed(1);
        onStatus(`Downloading binaries\u2026 ${mb} MB`);
      }
    });
    res.on('end', () => { fileStream.end(resolve); });
    res.on('error', reject);
    fileStream.on('error', reject);
  });

  onStatus('Extracting binaries\u2026');

  const extractDir = path.join(binDir, '_extract');
  if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });

  await extractZip(zipPath, extractDir);

  // On Linux, the zip may contain a .tar file for ffmpeg — extract it too
  if (process.platform === 'linux') {
    const tarFiles = [];
    function findTars(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { findTars(full); continue; }
        if (entry.name.endsWith('.tar') || entry.name.endsWith('.tar.xz') || entry.name.endsWith('.tar.gz')) {
          tarFiles.push(full);
        }
      }
    }
    findTars(extractDir);
    for (const tar of tarFiles) {
      await extractTar(tar, extractDir);
    }
  }

  const found = findBinariesRecursive(extractDir);
  for (const [name, srcPath] of Object.entries(found)) {
    const destPath = path.join(binDir, name);
    fs.copyFileSync(srcPath, destPath);
    // Make executable on Linux
    if (process.platform === 'linux') {
      fs.chmodSync(destPath, 0o755);
    }
  }

  fs.rmSync(extractDir, { recursive: true, force: true });
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  const stillMissing = getPlatformFiles().filter(f => !fs.existsSync(path.join(binDir, f)));
  if (stillMissing.length) {
    throw new Error(`Missing after extraction: ${stillMissing.join(', ')}`);
  }

  onStatus('Binaries ready.');
}

async function ensureBinaries(onStatus) {
  if (areBinariesPresent()) {
    onStatus('Binaries found.');
    return;
  }
  await downloadAndExtract(onStatus);
}

module.exports = { ensureBinaries, getBinDir, areBinariesPresent };
