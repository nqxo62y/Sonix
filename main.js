const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { downloadJob, cancelAll } = require('./lib/downloader');
const { resolveSpotifyUrl, setCredentials } = require('./lib/spotify');
const settings = require('./lib/settings');
const themes = require('./lib/themes');
const { checkForUpdates, downloadAndInstall } = require('./lib/updater');
const { ensureBinaries } = require('./lib/binSetup');

let win;

function createWindow() {
  const s = settings.load();
  if (s.spotifyClientId && s.spotifyClientSecret) {
    setCredentials(s.spotifyClientId, s.spotifyClientSecret);
  }

  const iconPath = path.join(__dirname, 'assets', 'icon.ico');
  const appIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: '#0f0f10',
    frame: false,
    titleBarStyle: 'hidden',
    title: 'Sonix',
    icon: appIcon,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('window:minimize', () => win && win.minimize());
ipcMain.handle('window:toggleMaximize', () => {
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.handle('window:close', () => win && win.close());

ipcMain.handle('system:openExternal', (_e, url) => shell.openExternal(url));
ipcMain.handle('system:platform', () => process.platform);
ipcMain.handle('system:nativeTheme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
nativeTheme.on('updated', () => {
  if (win && !win.isDestroyed()) win.webContents.send('system:themeChanged', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
});

ipcMain.handle('dialog:chooseFolder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths.length) return null;
  return r.filePaths[0];
});
ipcMain.handle('shell:openPath', async (_e, p) => { if (p) await shell.openPath(p); });

ipcMain.handle('settings:load', () => settings.load());
ipcMain.handle('settings:save', (_e, partial) => {
  const out = settings.save(partial || {});
  if (partial && (partial.spotifyClientId !== undefined || partial.spotifyClientSecret !== undefined)) {
    setCredentials(out.spotifyClientId, out.spotifyClientSecret);
  }
  return out;
});
ipcMain.handle('settings:reset', () => { setCredentials('', ''); return settings.reset(); });

ipcMain.handle('themes:getAll', () => themes.getAllThemes());
ipcMain.handle('themes:get', (_e, key) => themes.getTheme(key));
ipcMain.handle('themes:save', (_e, key, data) => { themes.saveCustomTheme(key, data); return themes.getAllThemes(); });
ipcMain.handle('themes:delete', (_e, key) => { themes.deleteCustomTheme(key); return themes.getAllThemes(); });
ipcMain.handle('themes:openFolder', () => { shell.openPath(themes.getThemesPath()); });

ipcMain.handle('spotify:resolve', (_e, url) => resolveSpotifyUrl(url));

ipcMain.handle('updater:check', () => checkForUpdates());

ipcMain.handle('updater:changelog', async () => {
  try {
    const res = await fetch('https://api.github.com/repos/nqxo62y/Sonix/releases?per_page=20', {
      headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'Sonix-Updater' }
    });
    if (res.status === 403 || res.status === 429) return { error: 'rate-limited' };
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(r => ({
      version: r.tag_name || r.name || '',
      date: r.published_at || r.created_at || '',
      body: r.body || '',
      url: r.html_url || ''
    }));
  } catch { return []; }
});

ipcMain.handle('updater:downloadAndInstall', async (_e, installerUrl) => {
  return downloadAndInstall(installerUrl, status => {
    if (win && !win.isDestroyed()) win.webContents.send('updater:status', status);
  });
});

ipcMain.handle('binaries:ensure', async (_e) => {
  return new Promise((resolve, reject) => {
    ensureBinaries(status => {
      if (win && !win.isDestroyed()) win.webContents.send('binaries:status', status);
    }).then(() => resolve(true)).catch(err => reject(err));
  });
});

ipcMain.handle('music:scanFolder', async (_e, folder) => {
  const audioExts = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.aac', '.wma'];
  const results = [];
  const { ytDlp, ffmpeg } = require('./lib/bin');
  const ffmpegPath = ffmpeg();
  const ffprobePath = ffmpegPath.replace(/ffmpeg(\.exe)?$/, 'ffprobe$1');
  const hasProbe = fs.existsSync(ffprobePath);

  function parseFilename(filename) {
    const name = path.basename(filename, path.extname(filename));
    const cleaned = name.replace(/^\d+[-.\s]*/, '');
    if (cleaned.includes(' - ')) {
      const parts = cleaned.split(' - ');
      return { title: parts[0].trim(), artist: parts.slice(1).join(' - ').trim() };
    }
    return { title: cleaned || name, artist: '' };
  }

  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      const ext = path.extname(entry.name).toLowerCase();
      if (!audioExts.includes(ext)) continue;
      const { title, artist } = parseFilename(entry.name);
      results.push({ path: full, title, artist, duration: 0, cover: null });
    }
  }
  walk(folder);

  if (hasProbe && results.length <= 500) {
    const { execFile } = require('node:child_process');
    const getDuration = (filePath) => new Promise(resolve => {
      execFile(ffprobePath, ['-v', 'quiet', '-print_format', 'json', '-show_format', filePath], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
        if (err) return resolve(0);
        try {
          const data = JSON.parse(stdout);
          resolve(parseFloat(data.format.duration) || 0);
        } catch { resolve(0); }
      });
    });

    const batchSize = 8;
    for (let i = 0; i < results.length; i += batchSize) {
      const batch = results.slice(i, i + batchSize);
      const durations = await Promise.all(batch.map(t => getDuration(t.path)));
      durations.forEach((d, j) => { results[i + j].duration = d; });
    }
  }

  return results;
});

ipcMain.handle('download:start', async (_e, payload) => {
  const { tracks, savePath, options } = payload;
  if (!fs.existsSync(savePath)) fs.mkdirSync(savePath, { recursive: true });
  return downloadJob({
    jobId: payload.jobId,
    tracks, savePath, options,
    onProgress: data => {
      if (win && !win.isDestroyed()) win.webContents.send('download:progress', data);
      if (data.type === 'done' && !data.cancelled) {
        const { Notification } = require('electron');
        if (Notification.isSupported()) {
          const saved = (data.results || []).filter(r => r.ok && !r.skipped).length;
          new Notification({ title: 'Sonix', body: `Download complete \u2014 ${saved} tracks saved.`, icon: path.join(__dirname, 'assets', 'icon.ico') }).show();
        }
      }
    },
    onLog: msg => { if (win && !win.isDestroyed()) win.webContents.send('download:log', msg); }
  });
});
ipcMain.handle('download:cancel', () => { cancelAll(); return true; });
