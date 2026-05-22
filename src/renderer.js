const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const views = { home: $('#view-home'), downloads: $('#view-downloads'), settings: $('#view-settings') };
let resolved = null;
let selectedIds = new Set();
let appSettings = null;
let lastSavePath = '';
let allThemes = {};

function showView(name) {
  for (const v of Object.values(views)) v.classList.remove('active');
  views[name].classList.add('active');
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === name));
}

function toast(msg, ms = 2400) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

function fmtDur(ms) {
  const s = Math.round((ms || 0) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function applyThemeVars(theme) {
  const root = document.documentElement;
  const map = {
    '--bg': 'bg', '--surface': 'surface', '--surface2': 'surface2', '--surface3': 'surface3',
    '--border': 'border', '--border-strong': 'borderStrong',
    '--text': 'text', '--text-muted': 'textMuted', '--text-faint': 'textFaint',
    '--accent': 'accent', '--accent-soft': 'accentSoft', '--accent-on': 'accentOn',
    '--danger': 'danger', '--danger-bg': 'dangerBg', '--danger-border': 'dangerBorder',
    '--success': 'success', '--success-bg': 'successBg', '--success-border': 'successBorder',
    '--warning': 'warning', '--warning-bg': 'warningBg', '--warning-border': 'warningBorder',
    '--bar-from': 'barFrom', '--bar-to': 'barTo'
  };
  for (const [prop, key] of Object.entries(map)) {
    if (theme[key]) root.style.setProperty(prop, theme[key]);
  }
}

async function applyTheme() {
  let mode = appSettings.theme || 'dark';
  if (mode === 'system') mode = await window.api.nativeTheme();
  document.body.setAttribute('data-mode', mode);
  $('.theme-label').textContent = mode === 'dark' ? 'Dark' : 'Light';

  if (appSettings.customTheme && allThemes[appSettings.customTheme]) {
    applyThemeVars(allThemes[appSettings.customTheme]);
  } else {
    applyThemeVars(allThemes[mode] || allThemes.dark);
  }
}

async function loadThemes() {
  allThemes = await window.api.getAllThemes();
  renderThemeGrid();
  populateCustomThemeSelect();
}

function renderThemeGrid() {
  const grid = $('#themeGrid');
  grid.innerHTML = '';
  const active = appSettings.customTheme || appSettings.theme;
  for (const [key, theme] of Object.entries(allThemes)) {
    const el = document.createElement('div');
    el.className = `theme-swatch${key === active ? ' active' : ''}`;
    el.dataset.key = key;
    el.innerHTML = `
      <div class="swatch-colors">
        <div class="swatch-dot" style="background:${theme.bg}"></div>
        <div class="swatch-dot" style="background:${theme.surface}"></div>
        <div class="swatch-dot" style="background:${theme.accent}"></div>
        <div class="swatch-dot" style="background:${theme.text}"></div>
      </div>
      <div>${esc(theme.name || key)}</div>
    `;
    el.addEventListener('click', async () => {
      if (theme.custom) {
        appSettings = await window.api.saveSettings({ customTheme: key });
      } else {
        appSettings = await window.api.saveSettings({ theme: key, customTheme: '' });
        $('#setTheme').value = key;
      }
      await applyTheme();
      renderThemeGrid();
    });
    grid.appendChild(el);
  }
}

function populateCustomThemeSelect() {
  const sel = $('#setCustomTheme');
  sel.innerHTML = '<option value="">None (use built-in)</option>';
  for (const [key, theme] of Object.entries(allThemes)) {
    if (key === 'light' || key === 'dark') continue;
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = theme.name || key;
    sel.appendChild(opt);
  }
  sel.value = appSettings.customTheme || '';
}

$('#themeToggle').onclick = async () => {
  const current = document.body.getAttribute('data-mode');
  const next = current === 'dark' ? 'light' : 'dark';
  appSettings = await window.api.saveSettings({ theme: next, customTheme: '' });
  $('#setTheme').value = next;
  $('#setCustomTheme').value = '';
  await applyTheme();
  renderThemeGrid();
};

$('#btnOpenThemes').onclick = () => window.api.openThemesFolder();

$('#winMin').onclick = () => window.api.minimize();
$('#winMax').onclick = () => window.api.toggleMaximize();
$('#winClose').onclick = () => window.api.close();

$$('.nav-item').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));

$('#btnPaste').onclick = async () => {
  try { $('#spotifyUrl').value = (await navigator.clipboard.readText() || '').trim(); }
  catch { toast('Clipboard not accessible'); }
};

$('#btnBrowse').onclick = async () => {
  const p = await window.api.chooseFolder();
  if (p) {
    lastSavePath = p;
    $('#savePath').value = p;
    appSettings = await window.api.saveSettings({ savePath: p });
  }
};

$('#btnFetch').onclick = async () => {
  const url = $('#spotifyUrl').value.trim();
  if (!url) return toast('Paste a Spotify link first');
  if (!lastSavePath) return toast('Choose a save folder');
  const btn = $('#btnFetch');
  btn.disabled = true;
  btn.innerHTML = '<span>Loading\u2026</span>';
  try {
    resolved = await window.api.resolveSpotify(url);
    selectedIds = new Set(resolved.tracks.map(t => t.id));
    renderPick();
    $('#pickCard').hidden = false;
    $('#pickCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    toast(e.message || 'Could not resolve Spotify link');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Fetch';
  }
};

$('#btnSelectAll').onclick = () => {
  if (!resolved) return;
  const all = resolved.tracks.every(t => selectedIds.has(t.id));
  selectedIds = all ? new Set() : new Set(resolved.tracks.map(t => t.id));
  renderPick();
};

function renderPick() {
  $('#metaKind').textContent = resolved.kind === 'track' ? 'Song' : resolved.kind === 'album' ? 'Album' : 'Playlist';
  $('#metaName').textContent = resolved.name || '';
  $('#metaOwner').textContent = resolved.owner || '';
  $('#metaCover').style.backgroundImage = resolved.cover ? `url("${resolved.cover}")` : 'none';
  const list = $('#trackList');
  list.innerHTML = '';
  for (const t of resolved.tracks) {
    const li = document.createElement('li');
    li.innerHTML = `
      <input type="checkbox" class="tcheck" data-id="${esc(t.id)}" ${selectedIds.has(t.id) ? 'checked' : ''} />
      <div class="tcover" style="${t.cover ? `background-image:url('${esc(t.cover)}')` : ''}"></div>
      <div class="tinfo">
        <div class="ttitle">${esc(t.title)}</div>
        <div class="tmeta">${esc(t.artist)}${t.album ? ' \u00b7 ' + esc(t.album) : ''}</div>
      </div>
      <div class="tdur">${fmtDur(t.durationMs)}</div>
    `;
    list.appendChild(li);
  }
  list.querySelectorAll('.tcheck').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.getAttribute('data-id');
      cb.checked ? selectedIds.add(id) : selectedIds.delete(id);
      $('#selCount').textContent = `(${selectedIds.size})`;
    });
  });
  $('#selCount').textContent = `(${selectedIds.size})`;
}

$('#btnDownload').onclick = async () => {
  if (!resolved) return;
  const tracks = resolved.tracks.filter(t => selectedIds.has(t.id));
  if (!tracks.length) return toast('Select at least one track');
  showView('downloads');
  $('#log').textContent = '';
  $('#ovDone').textContent = '0';
  $('#ovTotal').textContent = String(tracks.length);
  $('#ovBar').style.width = '0%';
  $('#ovStatus').textContent = 'starting\u2026';
  const list = $('#dlList');
  list.innerHTML = '';
  const itemEls = new Map();
  tracks.forEach((t, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="tcover" style="${t.cover ? `background-image:url('${esc(t.cover)}')` : ''}"></div>
      <div class="tinfo">
        <div class="ttitle">${esc(t.title)}</div>
        <div class="tmeta">${esc(t.artist)}</div>
      </div>
      <div class="dl-status" data-i="${i}">queued</div>
    `;
    list.appendChild(li);
    itemEls.set(i, li.querySelector('.dl-status'));
  });
  const opts = {
    concurrency: appSettings.concurrency,
    overwrite: appSettings.overwrite,
    codec: appSettings.codec,
    bitrate: Number(appSettings.bitrate) || 320,
    sampleRate: Number(appSettings.sampleRate) || 44100,
    normalize: !!appSettings.normalize,
    normalizeTarget: Number(appSettings.normalizeTarget) || -14,
    speedLimit: Number(appSettings.speedLimit) || 0,
    timeout: Number(appSettings.timeout) || 30000,
    cookies: appSettings.cookies || '',
    embedCover: appSettings.embedCover !== false,
    artistSeparator: appSettings.artistSeparator || ', ',
    filenameTemplate: appSettings.filenameTemplate,
    subfolderTemplate: appSettings.subfolderTemplate
  };
  const offProgress = window.api.onProgress(data => {
    if (data.type === 'track-start') {
      const el = itemEls.get(data.index);
      if (el) { el.className = 'dl-status active'; el.textContent = 'downloading\u2026'; }
      $('#ovStatus').textContent = data.track.title;
    } else if (data.type === 'track-done') {
      const el = itemEls.get(data.index);
      if (el) { el.className = `dl-status ${data.skipped ? 'skipped' : 'done'}`; el.textContent = data.skipped ? 'skipped' : 'done'; }
      $('#ovBar').style.width = `${(data.completed / data.total) * 100}%`;
      $('#ovDone').textContent = String(data.completed);
    } else if (data.type === 'track-error') {
      const el = itemEls.get(data.index);
      if (el) { el.className = 'dl-status error'; el.title = data.error; el.textContent = 'error'; }
      $('#ovBar').style.width = `${(data.completed / data.total) * 100}%`;
      $('#ovDone').textContent = String(data.completed);
    } else if (data.type === 'done') {
      $('#ovStatus').textContent = data.cancelled ? 'cancelled' : 'finished';
      if (!data.cancelled && appSettings.autoOpenFolder) window.api.openPath(lastSavePath);
    }
  });
  const offLog = window.api.onLog(msg => {
    const log = $('#log');
    log.textContent += msg + '\n';
    log.scrollTop = log.scrollHeight;
  });
  try {
    await window.api.startDownload({ jobId: Date.now(), tracks, savePath: lastSavePath, options: opts });
  } catch (e) { toast(e.message || 'Download failed'); }
  finally { offProgress && offProgress(); offLog && offLog(); }
};

$('#btnCancel').onclick = async () => { await window.api.cancelDownload(); $('#ovStatus').textContent = 'cancelling\u2026'; };
$('#btnOpenFolder').onclick = () => lastSavePath && window.api.openPath(lastSavePath);

const settingFields = [
  { id: 'setCodec', key: 'codec' },
  { id: 'setBitrate', key: 'bitrate', type: 'number' },
  { id: 'setSampleRate', key: 'sampleRate', type: 'number' },
  { id: 'setArtistSep', key: 'artistSeparator' },
  { id: 'setOverwrite', key: 'overwrite', type: 'check' },
  { id: 'setEmbedCover', key: 'embedCover', type: 'check' },
  { id: 'setEmbedLyrics', key: 'embedLyrics', type: 'check' },
  { id: 'setNormalize', key: 'normalize', type: 'check' },
  { id: 'setNormalizeTarget', key: 'normalizeTarget', type: 'number' },
  { id: 'setTrackNumberSource', key: 'trackNumberSource' },
  { id: 'setFilename', key: 'filenameTemplate' },
  { id: 'setSubfolder', key: 'subfolderTemplate' },
  { id: 'setConcurrency', key: 'concurrency', type: 'number' },
  { id: 'setSpeedLimit', key: 'speedLimit', type: 'number' },
  { id: 'setTimeout', key: 'timeout', type: 'number' },
  { id: 'setCookies', key: 'cookies' },
  { id: 'setPoToken', key: 'poToken' },
  { id: 'setClientId', key: 'spotifyClientId' },
  { id: 'setClientSecret', key: 'spotifyClientSecret' },
  { id: 'setTheme', key: 'theme' },
  { id: 'setCustomTheme', key: 'customTheme' },
  { id: 'setAutoOpen', key: 'autoOpenFolder', type: 'check' },
  { id: 'setNotifications', key: 'showNotifications', type: 'check' },
  { id: 'setCompactList', key: 'compactList', type: 'check' }
];

function fillSettingsForm(s) {
  for (const f of settingFields) {
    const el = document.getElementById(f.id);
    if (!el) continue;
    if (f.type === 'check') el.checked = !!s[f.key];
    else el.value = s[f.key] != null ? s[f.key] : '';
  }
}

const saveDebounced = debounce(async partial => {
  appSettings = await window.api.saveSettings(partial);
  $('#saveStatus').textContent = 'Saved.';
  clearTimeout(saveDebounced._r);
  saveDebounced._r = setTimeout(() => { $('#saveStatus').textContent = 'Settings save automatically.'; }, 1500);
}, 250);

function bindSettingsForm() {
  for (const f of settingFields) {
    const el = document.getElementById(f.id);
    if (!el) continue;
    el.addEventListener(f.type === 'check' ? 'change' : 'input', async () => {
      const val = f.type === 'check' ? el.checked : (f.type === 'number' ? Number(el.value) : el.value);
      saveDebounced({ [f.key]: val });
      if (f.key === 'theme' || f.key === 'customTheme') {
        await new Promise(r => setTimeout(r, 300));
        await applyTheme();
        renderThemeGrid();
      }
    });
  }
}

$('#btnResetSettings').onclick = async () => {
  appSettings = await window.api.resetSettings();
  fillSettingsForm(appSettings);
  await applyTheme();
  renderThemeGrid();
  toast('Settings reset');
};

let updateInfo = null;

(async function init() {
  $('#loadingStatus').textContent = 'Loading settings…';
  appSettings = await window.api.loadSettings();
  fillSettingsForm(appSettings);

  $('#loadingStatus').textContent = 'Loading themes…';
  await loadThemes();
  await applyTheme();
  bindSettingsForm();

  if (appSettings.savePath) {
    lastSavePath = appSettings.savePath;
    $('#savePath').value = appSettings.savePath;
  }

  const offBinStatus = window.api.onBinariesStatus(msg => {
    $('#loadingStatus').textContent = msg;
  });

  try {
    $('#loadingStatus').textContent = 'Checking binaries…';
    await window.api.ensureBinaries();
  } catch (e) {
    $('#loadingStatus').textContent = 'Error: ' + (e.message || 'Failed to download binaries');
    await new Promise(r => setTimeout(r, 3000));
  }

  offBinStatus();

  $('#loadingStatus').textContent = 'Checking for updates…';
  try {
    updateInfo = await window.api.checkForUpdates();
    if (updateInfo && updateInfo.available) {
      if (updateInfo.installerUrl) {
        $('#loadingStatus').textContent = `Update ${updateInfo.latest} found. Downloading…`;
        const offUpdaterStatus = window.api.onUpdaterStatus(msg => {
          $('#loadingStatus').textContent = msg;
        });
        try {
          await window.api.downloadAndInstallUpdate(updateInfo.installerUrl);
          $('#loadingStatus').textContent = 'Installing update… App will restart.';
          return;
        } catch (e) {
          offUpdaterStatus();
          const badge = $('#updateBadge');
          badge.hidden = false;
          badge.addEventListener('click', () => window.api.openExternal(updateInfo.url));
        }
      } else {
        const badge = $('#updateBadge');
        badge.hidden = false;
        badge.addEventListener('click', () => window.api.openExternal(updateInfo.url));
      }
    }
  } catch {}

  window.api.onSystemThemeChanged(async () => {
    if (appSettings.theme === 'system') await applyTheme();
  });

  setTimeout(() => $('#loadingScreen').classList.add('hidden'), 800);
})();
