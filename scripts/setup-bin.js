const fs = require('node:fs');
const path = require('node:path');

const binDir = path.join(__dirname, '..', 'bin');
const qtDir = path.resolve(__dirname, '..', '..', 'Spotify Downloader');

if (!fs.existsSync(binDir)) fs.mkdirSync(binDir, { recursive: true });

const files = ['yt-dlp.exe', 'ffmpeg.exe'];

for (const file of files) {
  const src = path.join(qtDir, file);
  const dest = path.join(binDir, file);
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    console.log(`Copying ${file} from Qt project...`);
    fs.copyFileSync(src, dest);
  } else if (fs.existsSync(dest)) {
    console.log(`${file} already in bin/`);
  } else {
    console.log(`WARNING: ${file} not found at ${src}`);
    console.log(`  Download it manually and place in electron-app/bin/`);
  }
}

console.log('Done. bin/ is ready for packaging.');
