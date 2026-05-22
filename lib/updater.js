const GITHUB_REPO = 'nqxo62y/Sonix';
const CURRENT_VERSION = require('../package.json').version;

async function checkForUpdates() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'Sonix-Updater' }
    });
    if (!res.ok) return { available: false, current: CURRENT_VERSION };
    const data = await res.json();
    const latest = (data.tag_name || '').replace(/^v/, '');
    const available = latest && latest !== CURRENT_VERSION && isNewer(latest, CURRENT_VERSION);
    return {
      available,
      current: CURRENT_VERSION,
      latest,
      url: data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
      notes: data.body || ''
    };
  } catch {
    return { available: false, current: CURRENT_VERSION };
  }
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

module.exports = { checkForUpdates };
