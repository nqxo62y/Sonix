const path = require('node:path');
const fs = require('node:fs');

const APP_BIN = path.join(__dirname, '..', 'bin');
const QT_BIN = path.resolve(__dirname, '..', '..', 'Spotify Downloader');

let userDataBin = null;
let resourcesBin = null;

try {
  const { app } = require('electron');
  userDataBin = path.join(app.getPath('userData'), 'bin');
  resourcesBin = path.join(process.resourcesPath || app.getAppPath(), 'bin');
} catch {}

function findBinary(name) {
  const candidates = [
    userDataBin ? path.join(userDataBin, name) : null,
    path.join(APP_BIN, name),
    resourcesBin ? path.join(resourcesBin, name) : null,
    path.join(QT_BIN, name)
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return name;
}

module.exports = {
  ytDlp: () => findBinary(process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'),
  ffmpeg: () => findBinary(process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
};
