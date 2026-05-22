<p align="center">
  <img src="assets/icon.ico" width="120" height="120" alt="Sonix"/>
  <br/><br/>
  <strong style="font-size: 28px;">Sonix</strong>
</p>

<h1 align="center">Sonix</h1>

[![Latest Release](https://img.shields.io/github/v/release/nqxo62y/Sonix?label=Latest%20Release&color=007ec6)](https://github.com/nqxo62y/Sonix/releases)
[![Downloads](https://img.shields.io/github/downloads/nqxo62y/Sonix/total?label=Downloads&color=007ec6)](https://github.com/nqxo62y/Sonix/releases)
[![Open Issues](https://img.shields.io/github/issues/nqxo62y/Sonix?label=Issues)](https://github.com/nqxo62y/Sonix/issues?q=is%3Aissue+is%3Aopen)
[![Stars](https://img.shields.io/github/stars/nqxo62y/Sonix?label=Stars&color=007ec6)](https://github.com/nqxo62y/Sonix/stargazers)

Sonix is a premium desktop application that downloads music from Spotify as high-quality audio files with embedded cover art and complete metadata. Built with Electron, it features a modern dark/light UI, custom themes, automatic updates, and zero-config setup.

> [!CAUTION]
> **HAFTUNGSAUSSCHLUSS / DISCLAIMER**
>
> This software is provided **exclusively for educational and personal purposes**.
>
> The developer assumes **no liability whatsoever** for damages, legal consequences, or any other outcomes arising from the use of this software. Use is **entirely at the user's own risk and responsibility**.
>
> Diese Software wird **ausschließlich zu Bildungs- und persönlichen Zwecken** bereitgestellt.
>
> Der Entwickler übernimmt **keinerlei Haftung** für Schäden, rechtliche Konsequenzen oder sonstige Folgen, die durch die Nutzung dieser Software entstehen. Die Nutzung erfolgt **vollständig auf eigene Gefahr und Verantwortung** des Anwenders.
>
> Sonix does not host, store, or distribute any copyrighted content. It interacts with publicly available web services and does not circumvent any DRM.

> [!NOTE]
> Sonix automatically downloads all required dependencies (yt-dlp, ffmpeg) on first launch. No manual setup needed.

## Contents
- [Installation](#installation)
- [Features](#features)
- [Auto-Update](#auto-update)
- [Usage](#usage)
- [Settings](#settings)
- [Custom Themes](#custom-themes)
- [Building](#building)
- [FAQ](#faq)
- [License](#license)

## Installation

***Currently supports Windows only. Other platforms planned.***

The latest release can be found [here](https://github.com/nqxo62y/Sonix/releases/latest).

<details>
<summary><b>Installer (recommended)</b></summary>

---

1. Download `Sonix-x.x.x-Setup.exe` from the latest release.
2. Run the installer — choose your install location.
3. Launch Sonix from the Start Menu or Desktop shortcut.
4. On first launch, required binaries are downloaded automatically.

---

</details>

<details>
<summary><b>Portable</b></summary>

---

1. Download `Sonix-x.x.x-Portable.exe` from the latest release.
2. Run the executable directly. No installation required.
3. Binaries are stored in `%APPDATA%/sonix/bin/`.

---

</details>

<details>
<summary><b>From Source</b></summary>

---

```bash
git clone https://github.com/nqxo62y/Sonix.git
cd Sonix
npm install
npm start
```

The app will download `yt-dlp` and `ffmpeg` automatically on first run.

---

</details>

## Features

- **High-Quality Audio** — MP3 320 kbps CBR, M4A 256 kbps, FLAC, or WAV
- **Per-Track Cover Art** — actual album artwork embedded in each file, not the playlist mosaic
- **Full Metadata** — title, artist, album, album artist, track #, disc #, year, ISRC, Spotify URL
- **Spotify Support** — tracks, albums, and playlists (no premium required)
- **Parallel Downloads** — 1–8 concurrent streams, configurable speed limit
- **Volume Normalization** — optional EBU R128 loudness targeting
- **Template Naming** — `{title} - {artist}`, `{album_artist}/{album}/` subfolder structures
- **Custom Themes** — Solarized, Nord, Catppuccin, or create your own via JSON
- **Light & Dark Mode** — follows system or manual toggle
- **Auto-Update** — checks GitHub on every launch, downloads and installs silently
- **Self-Contained** — downloads yt-dlp and ffmpeg on first run, no manual setup
- **YouTube Cookies** — unlock age-gated content and Premium quality audio
- **Modern UI** — Electron-based, custom titlebar, sidebar navigation, loading screen

## Auto-Update

Sonix includes a fully automatic update system:

1. **Every time you open the app**, it checks the latest GitHub release.
2. If a newer version is found with an installer attached, it **downloads it automatically** to a temp folder with progress shown on the loading screen.
3. The installer is **launched silently** and the current app closes.
4. The new version installs over the old one — no manual intervention required.

If the download fails or no installer is attached, a green badge appears in the sidebar linking to the release page.

<details>
<summary><b>How to publish an update</b></summary>

---

1. Bump `version` in `package.json` (e.g. `2.0.0` → `2.1.0`).
2. Build: `npm run build:win`
3. Create a GitHub Release with tag `v2.1.0`.
4. Attach `Sonix-2.1.0-Setup.exe` from `dist/` as a release asset.
5. All users receive the update automatically on next launch.

---

</details>

## Usage

<details>
<summary><b>Downloading Music</b></summary>

---

1. Copy a Spotify URL (track, album, or playlist).
2. Open Sonix and paste the URL (or click the Paste button).
3. Choose a save folder.
4. Click **Fetch** — the track list loads with cover art and metadata.
5. Select tracks (all selected by default) and click **Download**.
6. Watch progress in the Downloads tab with per-track status.

---

</details>

<details>
<summary><b>YouTube Cookies (optional)</b></summary>

---

YouTube cookies are **not required** but enable:
- Downloading age-restricted content
- Accessing YouTube Premium higher-quality audio streams

To use cookies:
1. Install a cookie export extension (e.g. Cookie-Editor).
2. Export cookies from YouTube Music in Netscape format.
3. Paste them in **Settings → Downloading → YouTube Cookies**.

---

</details>

## Settings

All settings are saved automatically to `%APPDATA%/sonix/settings.json`.

### Output
| Setting | Default | Options |
|---------|---------|---------|
| Codec | MP3 | MP3, M4A, FLAC, WAV |
| Bitrate | 320 kbps | 128, 192, 256, 320 |
| Sample Rate | 44.1 kHz | 44.1, 48 kHz |
| Normalize | Off | On/Off, -5 to -30 LUFS |
| Embed Cover | On | On/Off |
| Embed Lyrics | On | On/Off |
| Overwrite | Off | On/Off |

### File Naming
| Setting | Default |
|---------|---------|
| Filename | `{title} - {artist}` |
| Subfolder | *(empty)* |

Available tags: `{title}` `{artist}` `{primary_artist}` `{album}` `{album_artist}` `{track}` `{disc}` `{year}`

### Downloading
| Setting | Default |
|---------|---------|
| Concurrent | 4 |
| Speed Limit | 0 (unlimited) |
| Timeout | 30000 ms |

### Appearance
| Setting | Default |
|---------|---------|
| Theme | Dark |
| Custom Theme | None |
| Auto-open folder | On |
| Notifications | On |

## Custom Themes

Sonix ships with 6 example themes: **Light**, **Dark**, **Solarized Light**, **Solarized Dark**, **Nord**, **Catppuccin Mocha**, **Midnight Blue**, **Spotify Green**.

To create your own:

1. Go to **Settings → Appearance → Open themes folder**.
2. Create a `.json` file:

```json
{
  "name": "My Theme",
  "bg": "#0a0a0a",
  "surface": "#141414",
  "surface2": "#1a1a1a",
  "surface3": "#222222",
  "border": "#2a2a2a",
  "borderStrong": "#3a3a3a",
  "text": "#f0f0f0",
  "textMuted": "#a0a0a0",
  "textFaint": "#666666",
  "accent": "#6366f1",
  "accentSoft": "#4f46e5",
  "accentOn": "#ffffff",
  "danger": "#ef4444",
  "dangerBg": "#1f1111",
  "dangerBorder": "#4a1c1c",
  "success": "#22c55e",
  "successBg": "#0f1f14",
  "successBorder": "#1a4a28",
  "warning": "#eab308",
  "warningBg": "#1f1c0f",
  "warningBorder": "#4a3d14",
  "barFrom": "#6366f1",
  "barTo": "#4f46e5"
}
```

3. Restart Sonix. Your theme appears in the picker.

## Building

```bash
npm install
npm run build:win      # NSIS installer + portable in dist/
```

The icon at `build/icon.ico` is used for the installer and executable.

## FAQ

<details>
<summary><b>Do I need Spotify Premium?</b></summary>
No. Sonix resolves metadata from Spotify's public pages. Audio is sourced from YouTube.
</details>

<details>
<summary><b>Do I need to install anything manually?</b></summary>
No. The app downloads yt-dlp and ffmpeg automatically on first launch.
</details>

<details>
<summary><b>How do updates work?</b></summary>
Every time you open Sonix, it checks GitHub for a new release. If one exists with an installer attached, it downloads and installs it automatically.
</details>

<details>
<summary><b>Can I get higher quality audio?</b></summary>
Audio quality is limited by YouTube. With YouTube Premium cookies, yt-dlp can access higher-bitrate streams (up to 256 kbps AAC). The app then re-encodes to your chosen format.
</details>

<details>
<summary><b>My downloads are failing</b></summary>
Common causes: YouTube rate limiting (reduce concurrency or add a speed limit), outdated yt-dlp (delete %APPDATA%/sonix/bin/ and restart to re-download), or network issues.
</details>

<details>
<summary><b>Where are files stored?</b></summary>

- Settings: `%APPDATA%/sonix/settings.json`
- Binaries: `%APPDATA%/sonix/bin/`
- Themes: `%APPDATA%/sonix/themes/`

</details>

## License

Sonix is distributed under the **GNU General Public License v3.0**.

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the [LICENSE](LICENSE) file for details.

## Legal

> [!CAUTION]
> **HAFTUNGSAUSSCHLUSS / DISCLAIMER**
>
> Diese Software wird **ausschließlich zu Bildungs- und persönlichen Zwecken** bereitgestellt.
>
> Der Entwickler übernimmt **keinerlei Haftung** für Schäden, rechtliche Konsequenzen oder sonstige Folgen, die durch die Nutzung dieser Software entstehen. Die Nutzung erfolgt **vollständig auf eigene Gefahr und Verantwortung** des Anwenders.
>
> Sonix hostet, speichert oder verbreitet keine urheberrechtlich geschützten Inhalte. Die Software interagiert lediglich mit öffentlich zugänglichen Webdiensten und umgeht keinerlei DRM-Schutzmaßnahmen.

**By using this software, you agree to the following:**

1. The developer provides this software **"AS IS"** without warranty of any kind, express or implied.
2. The developer is **not liable** for any direct, indirect, incidental, special, or consequential damages arising from the use or inability to use this software.
3. The developer is **not responsible** for any legal consequences resulting from the user's actions with this software.
4. Users are **solely responsible** for ensuring their use complies with all applicable local, national, and international laws, including copyright law and the terms of service of third-party platforms.
5. The developer does **not condone or encourage** unauthorized downloading, reproduction, or distribution of copyrighted material.
6. Users are **strongly encouraged** to purchase music directly from artists and rights holders.

**Durch die Nutzung dieser Software erklären Sie sich mit Folgendem einverstanden:**

1. Der Entwickler stellt diese Software **ohne jegliche Gewährleistung** zur Verfügung.
2. Der Entwickler haftet **nicht** für direkte, indirekte, zufällige, besondere oder Folgeschäden, die aus der Nutzung oder Unmöglichkeit der Nutzung dieser Software entstehen.
3. Der Entwickler ist **nicht verantwortlich** für rechtliche Konsequenzen, die sich aus den Handlungen des Nutzers mit dieser Software ergeben.
4. Nutzer sind **allein verantwortlich** für die Einhaltung aller geltenden Gesetze.
5. Der Entwickler **befürwortet oder ermutigt nicht** das unbefugte Herunterladen urheberrechtlich geschützter Inhalte.

If you are a rights holder with concerns, please open an issue.

---

<p align="center">
  <sub>Support the artists you love. Buy their music.</sub>
</p>
