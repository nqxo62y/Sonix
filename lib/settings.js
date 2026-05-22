const path = require('node:path');
const fs = require('node:fs');
const { app } = require('electron');

const DEFAULTS = {
  codec: 'mp3',
  bitrate: 320,
  sampleRate: 44100,
  normalize: false,
  normalizeTarget: -14,
  overwrite: false,
  embedCover: true,
  embedLyrics: true,
  artistSeparator: ', ',
  trackNumberSource: 'playlist',

  filenameTemplate: '{title} - {artist}',
  subfolderTemplate: '',

  concurrency: 4,
  speedLimit: 0,
  timeout: 30000,
  cookies: '',
  poToken: '',
  spotifyClientId: '',
  spotifyClientSecret: '',

  theme: 'dark',
  customTheme: '',
  showNotifications: true,
  autoOpenFolder: true,
  compactList: false,
  sidebarCollapsed: false,

  savePath: ''
};

let settingsPath = null;
let cache = null;

function getPath() {
  if (settingsPath) return settingsPath;
  const dir = app.getPath('userData');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  settingsPath = path.join(dir, 'settings.json');
  return settingsPath;
}

function load() {
  if (cache) return cache;
  const p = getPath();
  let data = {};
  if (fs.existsSync(p)) {
    try { data = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { data = {}; }
  }
  cache = { ...DEFAULTS, ...data };
  return cache;
}

function save(partial) {
  const current = load();
  cache = { ...current, ...partial };
  fs.writeFileSync(getPath(), JSON.stringify(cache, null, 2), 'utf8');
  return cache;
}

function reset() {
  cache = { ...DEFAULTS };
  fs.writeFileSync(getPath(), JSON.stringify(cache, null, 2), 'utf8');
  return cache;
}

module.exports = { load, save, reset, DEFAULTS };
