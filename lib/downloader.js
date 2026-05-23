const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { ytDlp, ffmpeg } = require('./bin');

const activeProcs = new Set();
let cancelled = false;

function cancelAll() {
  cancelled = true;
  for (const p of activeProcs) {
    try { p.kill('SIGKILL'); } catch {}
  }
  activeProcs.clear();
}

function sanitize(name) {
  return String(name || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180) || 'track';
}

function applyTemplate(tpl, track) {
  if (!tpl) return '';
  const tags = {
    title: track.title,
    artist: track.artist,
    primary_artist: track.primaryArtist,
    album: track.album,
    album_artist: (track.albumArtists && track.albumArtists[0]) || track.primaryArtist,
    track: String(track.trackNumber || 1).padStart(2, '0'),
    disc: String(track.discNumber || 1),
    year: track.releaseYear || ''
  };
  return tpl.replace(/\{(\w+)\}/g, (_, k) => sanitize(tags[k] || ''));
}

function buildSearchQuery(track) {
  const artist = (track.primaryArtist || track.artist || '').replace(/["\[\]]/g, '');
  const title = (track.title || '').replace(/["\[\]]/g, '');
  return `ytsearch1:${artist} - ${title} audio`.trim();
}

async function downloadCover(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch { return null; }
}

function spawnProc(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { windowsHide: true, ...opts });
  activeProcs.add(p);
  p.on('close', () => activeProcs.delete(p));
  return p;
}

function getCodecConfig(opts) {
  const codec = opts.codec || 'mp3';
  const configs = {
    mp3: { ext: 'mp3', args: ['-c:a', 'libmp3lame', '-b:a', `${opts.bitrate || 320}k`, '-id3v2_version', '3', '-write_id3v1', '1'], supportsCover: true },
    m4a: { ext: 'm4a', args: ['-c:a', 'aac', '-b:a', `${opts.bitrate || 256}k`], supportsCover: true },
    flac: { ext: 'flac', args: ['-c:a', 'flac', '-compression_level', '5'], supportsCover: true },
    wav: { ext: 'wav', args: ['-c:a', 'pcm_s16le'], supportsCover: false }
  };
  return configs[codec] || configs.mp3;
}

function downloadOne(track, savePath, options, onLog) {
  return new Promise(async (resolve, reject) => {
    if (cancelled) return reject(new Error('cancelled'));

    const cfg = getCodecConfig(options);
    const baseName = sanitize(applyTemplate(options.filenameTemplate || '{artist} - {title}', track));
    const subfolder = applyTemplate(options.subfolderTemplate || '', track).split('/').map(sanitize).filter(Boolean).join(path.sep);
    const targetDir = subfolder ? path.join(savePath, subfolder) : savePath;
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const outPath = path.join(targetDir, `${baseName}.${cfg.ext}`);

    if (!options.overwrite && fs.existsSync(outPath)) {
      onLog && onLog(`Skipping: ${path.basename(outPath)}`);
      return resolve({ outPath, skipped: true });
    }

    // Always write to temp first, then copy to target (fixes issues with slow/external drives)
    const tmpOut = path.join(os.tmpdir(), `sdl-out-${track.id || Date.now()}-${Math.random().toString(36).slice(2)}.${cfg.ext}`);

    const coverBuf = (cfg.supportsCover && options.embedCover !== false) ? await downloadCover(track.cover) : null;
    let coverPath = null;
    if (coverBuf) {
      coverPath = path.join(os.tmpdir(), `sdl-cover-${track.id || Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
      fs.writeFileSync(coverPath, coverBuf);
    }

    const ytArgs = [
      buildSearchQuery(track),
      '-f', 'bestaudio/best',
      '--no-playlist', '--no-warnings', '--quiet', '--no-progress',
      '--socket-timeout', String(Math.max(5, Math.round((options.timeout || 30000) / 1000))),
      '--extractor-retries', '3',
      '-o', '-'
    ];
    if (options.speedLimit && options.speedLimit > 0) ytArgs.push('--limit-rate', `${options.speedLimit}K`);
    if (options.cookies) {
      const cookieFile = path.join(os.tmpdir(), `sdl-cookies-${Date.now()}.txt`);
      fs.writeFileSync(cookieFile, options.cookies);
      ytArgs.push('--cookies', cookieFile);
    }
    if (options.poToken) {
      ytArgs.push('--extractor-args', `youtube:player-client=web;po_token=web+${options.poToken}`);
    }

    const yt = spawnProc(ytDlp(), ytArgs);

    const ffArgs = ['-hide_banner', '-loglevel', 'warning', '-y', '-i', 'pipe:0'];
    if (coverPath) ffArgs.push('-i', coverPath);

    ffArgs.push('-map', '0:a');
    if (coverPath) {
      ffArgs.push('-map', '1:v', '-c:v', 'mjpeg', '-disposition:v', 'attached_pic');
      ffArgs.push('-metadata:s:v', 'title=Album cover', '-metadata:s:v', 'comment=Cover (front)');
    }

    if (options.normalize) {
      const target = options.normalizeTarget || -14;
      ffArgs.push('-af', `loudnorm=I=${target}:TP=-1.5:LRA=11`);
    }

    ffArgs.push('-ar', String(options.sampleRate || 44100), '-ac', '2');
    ffArgs.push(...cfg.args);

    const sep = options.artistSeparator || ', ';
    const tags = {
      title: track.title,
      artist: track.artists ? track.artists.join(sep) : track.artist,
      album_artist: track.albumArtists && track.albumArtists.length ? track.albumArtists.join(sep) : track.primaryArtist,
      album: track.album,
      track: String(track.trackNumber || 1),
      disc: String(track.discNumber || 1),
      date: track.releaseDate || track.releaseYear || '',
      year: track.releaseYear || '',
      TSRC: track.isrc || '',
      comment: track.spotifyUrl || ''
    };
    for (const [k, v] of Object.entries(tags)) {
      if (v) ffArgs.push('-metadata', `${k}=${v}`);
    }

    ffArgs.push('-f', cfg.ext === 'm4a' ? 'ipod' : cfg.ext, tmpOut);

    const ff = spawnProc(ffmpeg(), ffArgs);
    yt.stdout.pipe(ff.stdin);

    let ytErr = '';
    let ffErr = '';
    let ytFailed = false;
    yt.stderr.on('data', d => (ytErr += d.toString()));
    ff.stderr.on('data', d => (ffErr += d.toString()));

    let done = 0;
    const finish = (err) => {
      done++;
      if (done < 2) return;
      if (coverPath && fs.existsSync(coverPath)) try { fs.unlinkSync(coverPath); } catch {}
      if (cancelled) { try { fs.unlinkSync(tmpOut); } catch {} return reject(new Error('cancelled')); }
      if (err) { try { fs.unlinkSync(tmpOut); } catch {} return reject(err); }
      if (ytFailed) { try { fs.unlinkSync(tmpOut); } catch {} return reject(new Error(`yt-dlp failed: ${ytErr.trim().slice(-300) || 'no audio found'}`)); }
      // Copy from temp to final destination
      try {
        fs.copyFileSync(tmpOut, outPath);
        fs.unlinkSync(tmpOut);
      } catch (e) {
        try { fs.unlinkSync(tmpOut); } catch {}
        return reject(new Error(`Failed to copy to destination: ${e.message}`));
      }
      resolve({ outPath, skipped: false });
    };

    yt.on('error', e => finish(e));
    ff.on('error', e => finish(e));
    yt.on('close', code => {
      try { ff.stdin.end(); } catch {}
      if (code !== 0 && code !== null) {
        ytFailed = true;
        if (onLog) onLog(`yt-dlp exit ${code}: ${ytErr.trim().slice(-300)}`);
      }
      finish(null);
    });
    ff.on('close', code => {
      if (code !== 0 && !ytFailed) return finish(new Error(`ffmpeg failed: ${ffErr.trim().slice(-400) || 'unknown'}`));
      finish(null);
    });
  });
}

async function downloadJob({ jobId, tracks, savePath, options, onProgress, onLog }) {
  cancelled = false;
  const concurrency = Math.max(1, Math.min(8, options.concurrency || 4));
  const results = [];
  let index = 0;
  let completed = 0;

  onProgress({ type: 'start', total: tracks.length });

  const workers = Array.from({ length: concurrency }, async () => {
    while (!cancelled) {
      const i = index++;
      if (i >= tracks.length) return;
      const track = tracks[i];
      onProgress({ type: 'track-start', index: i, track });
      try {
        const r = await downloadOne(track, savePath, options, onLog);
        completed++;
        results.push({ ok: true, index: i, track, ...r });
        onProgress({ type: 'track-done', index: i, track, completed, total: tracks.length, skipped: r.skipped });
        onLog && onLog(`\u2713 ${track.artist} \u2014 ${track.title}${r.skipped ? ' (skipped)' : ''}`);
      } catch (e) {
        completed++;
        results.push({ ok: false, index: i, track, error: e.message });
        onProgress({ type: 'track-error', index: i, track, completed, total: tracks.length, error: e.message });
        onLog && onLog(`\u2717 ${track.artist} \u2014 ${track.title}: ${e.message}`);
      }
    }
  });

  await Promise.all(workers);
  onProgress({ type: 'done', cancelled, results });
  return { cancelled, results };
}

module.exports = { downloadJob, cancelAll };
