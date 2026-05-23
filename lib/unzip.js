const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');

function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    if (process.platform === 'win32') {
      const powershellCmd = `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`;
      execFile('powershell.exe', ['-NoProfile', '-Command', powershellCmd], { windowsHide: true }, (err, stdout, stderr) => {
        if (err) return reject(new Error(`Extraction failed: ${stderr || err.message}`));
        resolve();
      });
    } else {
      execFile('unzip', ['-o', zipPath, '-d', destDir], (err, stdout, stderr) => {
        if (err) return reject(new Error(`Extraction failed: ${stderr || err.message}`));
        resolve();
      });
    }
  });
}

function extractTar(tarPath, destDir) {
  return new Promise((resolve, reject) => {
    execFile('tar', ['-xf', tarPath, '-C', destDir], (err, stdout, stderr) => {
      if (err) return reject(new Error(`Tar extraction failed: ${stderr || err.message}`));
      resolve();
    });
  });
}

module.exports = { extractZip, extractTar };
