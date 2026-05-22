const URL_RE = /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|playlist)\/([A-Za-z0-9]+)/i;
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14) Mobile';
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

let userClientId = '';
let userClientSecret = '';
let cachedToken = null;
let cachedTokenExp = 0;

function setCredentials(id, secret) {
  userClientId = (id || '').trim();
  userClientSecret = (secret || '').trim();
  cachedToken = null;
  cachedTokenExp = 0;
}

async function scrapeMobilePage(type, id) {
  const url = `https://open.spotify.com/${type}/${id}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': MOBILE_UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' }
  });
  if (!res.ok) throw new Error(`Spotify page request failed (${res.status})`);
  const html = await res.text();
  const match = html.match(/<script\s+id="initialState"[^>]*>([^<]+)</);
  if (!match || !match[1]) throw new Error('Could not extract metadata from Spotify page');
  const jsonStr = Buffer.from(match[1], 'base64').toString('utf8');
  const data = JSON.parse(jsonStr);
  const entities = data.entities && data.entities.items;
  if (!entities) throw new Error('No entities found in Spotify page data');
  const keys = Object.keys(entities);
  if (!keys.length) throw new Error('Empty entities in Spotify page data');
  return entities[keys[0]];
}

async function fetchEmbed(type, id) {
  const url = `https://open.spotify.com/embed/${type}/${id}`;
  const res = await fetch(url, { headers: { 'User-Agent': DESKTOP_UA, 'Accept': 'text/html' } });
  if (!res.ok) throw new Error(`Spotify embed request failed (${res.status})`);
  const html = await res.text();
  const match = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([^<]+)/);
  if (!match || !match[1]) throw new Error('Could not extract data from Spotify embed page');
  return JSON.parse(match[1]);
}

async function getClientToken() {
  if (!userClientId || !userClientSecret) return null;
  if (cachedToken && cachedTokenExp - Date.now() > 30_000) return cachedToken;
  const auth = Buffer.from(`${userClientId}:${userClientSecret}`).toString('base64');
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error(`Spotify Client Credentials auth failed (${res.status})`);
  const j = await res.json();
  cachedToken = j.access_token;
  cachedTokenExp = Date.now() + (j.expires_in - 60) * 1000;
  return cachedToken;
}

async function spotifyApi(pathAndQuery) {
  const token = await getClientToken();
  if (!token) throw new Error('No Spotify API credentials configured');
  const res = await fetch(`https://api.spotify.com/v1${pathAndQuery}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  if (res.status === 401) { cachedToken = null; return spotifyApi(pathAndQuery); }
  if (!res.ok) throw new Error(`Spotify API ${res.status}`);
  return res.json();
}

function pickCoverFromSources(sources) {
  if (!Array.isArray(sources) || !sources.length) return null;
  return [...sources].sort((a, b) => (b.width || 0) - (a.width || 0))[0].url;
}

function pickCoverFromImages(images) {
  if (!Array.isArray(images) || !images.length) return null;
  return [...images].sort((a, b) => (b.width || 0) - (a.width || 0))[0].url;
}

function parseArtistsFromPage(json) {
  const artists = [];
  if (json.firstArtist && json.firstArtist.items) {
    for (const a of json.firstArtist.items) artists.push(a.profile ? a.profile.name : (a.name || ''));
  }
  if (json.otherArtists && json.otherArtists.items) {
    for (const a of json.otherArtists.items) artists.push(a.profile ? a.profile.name : (a.name || ''));
  }
  if (!artists.length && json.artists && json.artists.items) {
    for (const a of json.artists.items) artists.push(a.profile ? a.profile.name : (a.name || ''));
  }
  return artists;
}

function parseReleaseDateFromPage(json) {
  if (!json.releaseDate && !json.date) return { releaseDate: '', releaseYear: '' };
  const d = json.releaseDate || json.date || {};
  const year = String(d.year || '');
  let full = year;
  if (d.month) full += `-${String(d.month).padStart(2, '0')}`;
  if (d.day) full += `-${String(d.day).padStart(2, '0')}`;
  return { releaseDate: full, releaseYear: year };
}

function parseTrackFromPage(raw, fallbackCover, indexHint) {
  let json = raw;
  if (json.track) json = json.track;
  else if (json.itemV2) json = json.itemV2.data || json.itemV2;

  const id = (json.uri || '').split(':').pop() || '';
  const title = json.name || '';
  const artists = parseArtistsFromPage(json);
  const durationMs = json.duration ? (json.duration.totalMilliseconds || 0) : 0;
  const trackNumber = json.trackNumber || indexHint || 1;
  const discNumber = json.discNumber || 1;

  let albumName = '';
  let albumArtists = [];
  let cover = fallbackCover;
  let releaseDate = '';
  let releaseYear = '';

  const albumJson = json.albumOfTrack || json.album || null;
  if (albumJson) {
    albumName = albumJson.name || '';
    if (albumJson.coverArt && albumJson.coverArt.sources) {
      cover = pickCoverFromSources(albumJson.coverArt.sources) || cover;
    }
    if (albumJson.artists && albumJson.artists.items) {
      albumArtists = albumJson.artists.items.map(a => (a.profile ? a.profile.name : (a.name || '')));
    }
    const ad = parseReleaseDateFromPage(albumJson);
    releaseDate = ad.releaseDate;
    releaseYear = ad.releaseYear;
  }

  const td = parseReleaseDateFromPage(json);
  if (td.releaseDate) { releaseDate = td.releaseDate; releaseYear = td.releaseYear; }

  return {
    id, title, artists,
    artist: artists.join(', '),
    primaryArtist: artists[0] || '',
    album: albumName,
    albumArtists: albumArtists.length ? albumArtists : (artists.length ? [artists[0]] : []),
    trackNumber, discNumber, durationMs,
    isrc: '',
    releaseYear, releaseDate, cover,
    spotifyUrl: `https://open.spotify.com/track/${id}`
  };
}

function apiTrackToTrack(t, fallbackCover, indexHint) {
  const album = t.album || {};
  const artists = (t.artists || []).map(a => a.name);
  const rd = album.release_date || '';
  const year = rd ? rd.slice(0, 4) : '';
  return {
    id: t.id,
    title: t.name,
    artists,
    artist: artists.join(', '),
    primaryArtist: artists[0] || '',
    album: album.name || '',
    albumArtists: (album.artists || []).map(a => a.name),
    trackNumber: t.track_number || indexHint || 1,
    discNumber: t.disc_number || 1,
    durationMs: t.duration_ms || 0,
    isrc: (t.external_ids && t.external_ids.isrc) || '',
    releaseYear: year,
    releaseDate: rd,
    cover: pickCoverFromImages(album.images) || fallbackCover || null,
    spotifyUrl: (t.external_urls && t.external_urls.spotify) || ''
  };
}

async function resolveViaApi(kind, id) {
  if (kind === 'track') {
    const t = await spotifyApi(`/tracks/${id}`);
    const cover = pickCoverFromImages((t.album || {}).images);
    return { kind: 'track', name: t.name, owner: (t.artists || []).map(a => a.name).join(', '), cover, tracks: [apiTrackToTrack(t, cover)] };
  }
  if (kind === 'album') {
    const album = await spotifyApi(`/albums/${id}`);
    const cover = pickCoverFromImages(album.images);
    let items = album.tracks.items.map(t => ({ ...t, album: { ...album } }));
    let next = album.tracks.next;
    while (next) {
      const page = await spotifyApi(next.replace('https://api.spotify.com/v1', ''));
      items = items.concat(page.items.map(t => ({ ...t, album: { ...album } })));
      next = page.next;
    }
    return { kind: 'album', name: album.name, owner: (album.artists || []).map(a => a.name).join(', '), cover, tracks: items.map((t, i) => apiTrackToTrack(t, cover, i + 1)) };
  }
  if (kind === 'playlist') {
    const pl = await spotifyApi(`/playlists/${id}`);
    const cover = pickCoverFromImages(pl.images);
    let items = (pl.tracks && pl.tracks.items) || [];
    let next = pl.tracks && pl.tracks.next;
    while (next) {
      const page = await spotifyApi(next.replace('https://api.spotify.com/v1', ''));
      items = items.concat(page.items || []);
      next = page.next;
    }
    const tracks = items.map(it => it && it.track).filter(Boolean).map((t, i) => apiTrackToTrack(t, cover, i + 1));
    return { kind: 'playlist', name: pl.name, owner: (pl.owner && pl.owner.display_name) || '', cover, tracks };
  }
  throw new Error(`Unsupported type: ${kind}`);
}

async function resolveViaScrape(kind, id) {
  if (kind === 'track') {
    const raw = await scrapeMobilePage('track', id);
    const track = parseTrackFromPage(raw, null, 1);
    return { kind: 'track', name: track.title, owner: track.artist, cover: track.cover, tracks: [track] };
  }

  if (kind === 'album') {
    const raw = await scrapeMobilePage('album', id);
    const albumName = raw.name || '';
    const cover = raw.coverArt && raw.coverArt.sources ? pickCoverFromSources(raw.coverArt.sources) : null;
    const albumArtists = raw.artists && raw.artists.items ? raw.artists.items.map(a => (a.profile ? a.profile.name : (a.name || ''))) : [];
    const { releaseDate, releaseYear } = parseReleaseDateFromPage(raw);
    const tracksRaw = (raw.tracks || raw.tracksV2 || {}).items || [];
    const tracks = tracksRaw.map((t, i) => {
      const parsed = parseTrackFromPage(t, cover, i + 1);
      if (!parsed.album) parsed.album = albumName;
      if (!parsed.releaseDate) { parsed.releaseDate = releaseDate; parsed.releaseYear = releaseYear; }
      if (!parsed.albumArtists.length) parsed.albumArtists = albumArtists;
      if (!parsed.cover) parsed.cover = cover;
      return parsed;
    });
    return { kind: 'album', name: albumName, owner: albumArtists.join(', '), cover, tracks };
  }

  if (kind === 'playlist') {
    return resolvePlaylistViaEmbed(id);
  }

  throw new Error(`Unsupported type: ${kind}`);
}

async function fetchTrackCover(trackId) {
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`, {
      headers: { 'User-Agent': DESKTOP_UA }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.thumbnail_url || null;
  } catch { return null; }
}

async function batchFetchCovers(trackIds, concurrency = 6) {
  const covers = new Map();
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (idx < trackIds.length) {
      const i = idx++;
      const id = trackIds[i];
      const url = await fetchTrackCover(id);
      if (url) covers.set(id, url);
      await new Promise(r => setTimeout(r, 100));
    }
  });
  await Promise.all(workers);
  return covers;
}

async function resolvePlaylistViaEmbed(id) {
  const data = await fetchEmbed('playlist', id);
  const props = data.props && data.props.pageProps;
  if (!props || !props.state) throw new Error('Could not parse playlist embed data');
  const entity = props.state.data && props.state.data.entity;
  if (!entity) throw new Error('No entity in playlist embed data');

  const name = entity.name || entity.title || '';
  const owner = entity.subtitle || '';
  const playlistCover = entity.coverArt && entity.coverArt.sources ? pickCoverFromSources(entity.coverArt.sources) : null;
  const items = entity.trackList || [];

  const trackIds = items.map(item => (item.uri || '').split(':').pop()).filter(Boolean);
  const covers = await batchFetchCovers(trackIds);

  const tracks = items.map((item, i) => {
    const trackId = (item.uri || '').split(':').pop() || `track-${i}`;
    const artist = item.subtitle || '';
    const trackCover = covers.get(trackId) || playlistCover;
    return {
      id: trackId,
      title: item.title || '',
      artists: artist ? [artist] : [],
      artist,
      primaryArtist: artist,
      album: '',
      albumArtists: artist ? [artist] : [],
      trackNumber: i + 1,
      discNumber: 1,
      durationMs: item.duration || 0,
      isrc: '',
      releaseYear: '',
      releaseDate: '',
      cover: trackCover,
      spotifyUrl: trackId ? `https://open.spotify.com/track/${trackId}` : ''
    };
  });

  return { kind: 'playlist', name, owner, cover: playlistCover, tracks };
}

async function resolveSpotifyUrl(url) {
  const cleanUrl = (url || '').split('?')[0].split('#')[0];
  const m = URL_RE.exec(cleanUrl);
  if (!m) throw new Error('Not a valid Spotify track / album / playlist URL');
  const kind = m[1].toLowerCase();
  const id = m[2];

  if (userClientId && userClientSecret) {
    try { return await resolveViaApi(kind, id); }
    catch (e) { console.warn('API resolve failed, falling back to scrape:', e.message); }
  }

  return resolveViaScrape(kind, id);
}

module.exports = { resolveSpotifyUrl, setCredentials };
