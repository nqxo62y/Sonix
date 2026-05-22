const path = require('node:path');
const fs = require('node:fs');
const { app } = require('electron');

const BUILT_IN = {
  light: {
    name: 'Light',
    bg: '#f5f5f7',
    surface: '#ffffff',
    surface2: '#fafafa',
    surface3: '#f0f0f3',
    border: '#e6e6ea',
    borderStrong: '#d0d0d6',
    text: '#1c1c1e',
    textMuted: '#6e6e73',
    textFaint: '#8e8e93',
    accent: '#1c1c1e',
    accentSoft: '#2c2c2e',
    accentOn: '#ffffff',
    danger: '#c0392b',
    dangerBg: '#fbecea',
    dangerBorder: '#f0c2bd',
    success: '#2e7d32',
    successBg: '#eef6ee',
    successBorder: '#c8e0c9',
    warning: '#8a6d00',
    warningBg: '#fff7e6',
    warningBorder: '#f0e1b8',
    barFrom: '#2c2c2e',
    barTo: '#6e6e73'
  },
  dark: {
    name: 'Dark',
    bg: '#0f0f10',
    surface: '#18181a',
    surface2: '#1e1e20',
    surface3: '#242427',
    border: '#2a2a2d',
    borderStrong: '#3a3a3e',
    text: '#f2f2f5',
    textMuted: '#a1a1a8',
    textFaint: '#6e6e76',
    accent: '#f2f2f5',
    accentSoft: '#e0e0e5',
    accentOn: '#0f0f10',
    danger: '#ff6b5b',
    dangerBg: '#2a1817',
    dangerBorder: '#4a2521',
    success: '#6cd17c',
    successBg: '#15251a',
    successBorder: '#294a30',
    warning: '#f0c75e',
    warningBg: '#2a2316',
    warningBorder: '#4a3d20',
    barFrom: '#e0e0e5',
    barTo: '#8e8e93'
  }
};

function getUserThemesDir() {
  const dir = path.join(app.getPath('userData'), 'themes');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getBundledThemesDir() {
  const devPath = path.join(__dirname, '..', 'themes-example');
  if (fs.existsSync(devPath)) return devPath;
  const prodPath = path.join(process.resourcesPath || '', 'themes-example');
  if (fs.existsSync(prodPath)) return prodPath;
  return null;
}

function loadThemesFromDir(dir) {
  const themes = {};
  if (!dir || !fs.existsSync(dir)) return themes;
  try {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        const key = path.basename(file, '.json');
        themes[key] = { ...BUILT_IN.dark, ...data };
      } catch {}
    }
  } catch {}
  return themes;
}

function getAllThemes() {
  const bundled = loadThemesFromDir(getBundledThemesDir());
  const user = loadThemesFromDir(getUserThemesDir());
  for (const k of Object.keys(user)) user[k].custom = true;
  return { ...BUILT_IN, ...bundled, ...user };
}

function getTheme(key) {
  const all = getAllThemes();
  return all[key] || all.dark;
}

function saveCustomTheme(key, data) {
  const dir = getUserThemesDir();
  fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(data, null, 2), 'utf8');
}

function deleteCustomTheme(key) {
  const dir = getUserThemesDir();
  const filePath = path.join(dir, `${key}.json`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function getThemesPath() {
  return getUserThemesDir();
}

module.exports = { getAllThemes, getTheme, saveCustomTheme, deleteCustomTheme, getThemesPath, BUILT_IN };
