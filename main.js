const { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { downloadJob, cancelAll } = require('./lib/downloader');
const { resolveSpotifyUrl, setCredentials } = require('./lib/spotify');
const settings = require('./lib/settings');
const themes = require('./lib/themes');
const { checkForUpdates } = require('./lib/updater');

let win;

function createWindow() {
  const s = settings.load();
  if (s.spotifyClientId && s.spotifyClientSecret) {
    setCredentials(s.spotifyClientId, s.spotifyClientSecret);
  }

  win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 940,
    minHeight: 600,
    backgroundColor: '#0f0f10',
    frame: false,
    titleBarStyle: 'hidden',
    title: 'Sonix',
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

ipcMain.handle('download:start', async (_e, payload) => {
  const { tracks, savePath, options } = payload;
  if (!fs.existsSync(savePath)) fs.mkdirSync(savePath, { recursive: true });
  return downloadJob({
    jobId: payload.jobId,
    tracks, savePath, options,
    onProgress: data => { if (win && !win.isDestroyed()) win.webContents.send('download:progress', data); },
    onLog: msg => { if (win && !win.isDestroyed()) win.webContents.send('download:log', msg); }
  });
});
ipcMain.handle('download:cancel', () => { cancelAll(); return true; });
