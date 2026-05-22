const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
  close: () => ipcRenderer.invoke('window:close'),

  openExternal: url => ipcRenderer.invoke('system:openExternal', url),
  platform: () => ipcRenderer.invoke('system:platform'),
  nativeTheme: () => ipcRenderer.invoke('system:nativeTheme'),
  onSystemThemeChanged: cb => {
    const l = (_e, mode) => cb(mode);
    ipcRenderer.on('system:themeChanged', l);
    return () => ipcRenderer.removeListener('system:themeChanged', l);
  },

  chooseFolder: () => ipcRenderer.invoke('dialog:chooseFolder'),
  openPath: p => ipcRenderer.invoke('shell:openPath', p),

  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: partial => ipcRenderer.invoke('settings:save', partial),
  resetSettings: () => ipcRenderer.invoke('settings:reset'),

  getAllThemes: () => ipcRenderer.invoke('themes:getAll'),
  getTheme: key => ipcRenderer.invoke('themes:get', key),
  saveTheme: (key, data) => ipcRenderer.invoke('themes:save', key, data),
  deleteTheme: key => ipcRenderer.invoke('themes:delete', key),
  openThemesFolder: () => ipcRenderer.invoke('themes:openFolder'),

  resolveSpotify: url => ipcRenderer.invoke('spotify:resolve', url),

  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadAndInstallUpdate: url => ipcRenderer.invoke('updater:downloadAndInstall', url),
  onUpdaterStatus: cb => {
    const l = (_e, msg) => cb(msg);
    ipcRenderer.on('updater:status', l);
    return () => ipcRenderer.removeListener('updater:status', l);
  },

  ensureBinaries: () => ipcRenderer.invoke('binaries:ensure'),
  onBinariesStatus: cb => {
    const l = (_e, msg) => cb(msg);
    ipcRenderer.on('binaries:status', l);
    return () => ipcRenderer.removeListener('binaries:status', l);
  },

  scanMusicFolder: folder => ipcRenderer.invoke('music:scanFolder', folder),

  startDownload: payload => ipcRenderer.invoke('download:start', payload),
  cancelDownload: () => ipcRenderer.invoke('download:cancel'),

  onProgress: cb => {
    const l = (_e, d) => cb(d);
    ipcRenderer.on('download:progress', l);
    return () => ipcRenderer.removeListener('download:progress', l);
  },
  onLog: cb => {
    const l = (_e, m) => cb(m);
    ipcRenderer.on('download:log', l);
    return () => ipcRenderer.removeListener('download:log', l);
  }
});
