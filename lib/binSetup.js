const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const http = require('node:http');
const { createWriteStream } = require('node:fs');
const { app } = require('electron');
const yauzl = require('yauzl');

const BIN_URL = 'https://pixeldrain.com/api/file/mrT3f7Fh';
const REQUIRED_FILES = ['yt-dlp.exe', 'ffmpeg.exe'];

function getBinDir() {
  const dir = path.join(app.getPath('userData'), 'bin');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function areBinariesPresent() {
  const dir = getBinDir();
  return REQUIRED_FILES.every(f => fs.existsSync(path.join(dir, f)));
}

function followRedirects(url, maxRedirects = 5) {
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

function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      zipfile.readEntry();
      zipfile.on('entry', entry => {
        const entryPath = path.join(destDir, path.basename(entry.fileName));
        if (/\/$/.test(entry.fileName)) {
          zipfile.readEntry();
          return;
        }
        const targetName = path.basename(entry.fileName).toLowerCase();
        if (!REQUIRED_FILES.includes(targetName)) {
          zipfile.readEntry();
          return;
        }
        zipfile.openReadStream(entry, (err2, readStream) => {
          if (err2) return reject(err2);
          const outPath = path.join(destDir, path.basename(entry.fileName));
          const ws = createWriteStream(outPath);
          readStream.pipe(ws);
          ws.on('close', () => zipfile.readEntry());
          ws.on('error', reject);
        });
      });
      zipfile.on('end', resolve);
      zipfile.on('error', reject);
    });
  });
}

async function downloadAndExtract(onStatus) {
  const binDir = getBinDir();
  const zipPath = path.join(binDir, 'binaries.zip');

  onStatus('Downloading required binaries…');

  const res = await followRedirects(BIN_URL);
  const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
  let downloaded = 0;

  await new Promise((resolve, reject) => {
    const fileStream = createWriteStream(zipPath);
    res.on('data', chunk => {
      downloaded += chunk.length;
      fileStream.write(chunk);
      if (totalBytes > 0) {
        const pct = Math.round((downloaded / totalBytes) * 100);
        onStatus(`Downloading binaries… ${pct}%`);
      } else {
        const mb = (downloaded / 1024 / 1024).toFixed(1);
        onStatus(`Downloading binaries… ${mb} MB`);
      }
    });
    res.on('end', () => { fileStream.end(resolve); });
    res.on('error', reject);
    fileStream.on('error', reject);
  });

  onStatus('Extracting binaries…');
  await extractZip(zipPath, binDir);

  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  const stillMissing = REQUIRED_FILES.filter(f => !fs.existsSync(path.join(binDir, f)));
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
