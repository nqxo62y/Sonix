<p align="center">
  <br/>
  <img src="assets/banner.png" width="600" alt="Sonix Banner"/>
  <br/><br/>
</p>

<h1 align="center">Sonix</h1>

<p align="center">
  <strong>Premium music downloader for Spotify.</strong><br/>
  Download tracks, albums and playlists as high-quality audio files<br/>
  with embedded cover art and complete metadata.
</p>

<p align="center">
  <a href="https://github.com/nqxo62y/Sonix/releases/latest"><img src="https://img.shields.io/github/v/release/nqxo62y/Sonix?style=flat-square&label=version" alt="Latest Release"/></a>
  <a href="https://github.com/nqxo62y/Sonix/releases"><img src="https://img.shields.io/github/downloads/nqxo62y/Sonix/total?style=flat-square&label=downloads" alt="Downloads"/></a>
  <a href="https://github.com/nqxo62y/Sonix/issues"><img src="https://img.shields.io/github/issues/nqxo62y/Sonix?style=flat-square" alt="Issues"/></a>
  <a href="https://github.com/nqxo62y/Sonix/blob/main/LICENSE"><img src="https://img.shields.io/github/license/nqxo62y/Sonix?style=flat-square" alt="License"/></a>
</p>

---

## Overview

Sonix is a desktop application built with Electron that downloads music from Spotify. It resolves track metadata directly from Spotify, finds the corresponding audio on YouTube, and encodes it to your preferred format with full tagging and artwork.

The application is designed to be fast, visually clean, and fully self-contained. It automatically downloads all required dependencies on first launch and keeps itself up to date.

---

## Features

| Category | Details |
|----------|---------|
| **Audio Quality** | MP3 up to 320 kbps CBR, M4A/AAC up to 256 kbps, FLAC, WAV |
| **Metadata** | Title, artist, album, album artist, track number, disc number, year, ISRC |
| **Cover Art** | Per-track album artwork embedded directly into each file |
| **Sources** | Spotify tracks, albums, and playlists |
| **Concurrency** | 1–8 parallel downloads |
| **Normalization** | Optional EBU R128 loudness normalization |
| **Naming** | Template-based filenames and subfolder structures |
| **Themes** | Built-in light/dark mode + custom JSON themes |
| **Auto-Update** | Automatically downloads and installs new versions on launch |
| **Self-Contained** | Downloads yt-dlp and ffmpeg automatically on first run |
| **Packaging** | Windows installer (NSIS) and portable executable |

---

## Auto-Update System

Sonix includes a fully automatic update system:

1. **Every time you open the app**, it checks the latest release on GitHub (`nqxo62y/Sonix`).
2. If a newer version is found and an installer asset (`.exe`) is attached to the release, the app **automatically downloads it** to a temporary folder.
3. Once downloaded, the installer is **launched silently** and the current app closes.
4. The new version installs over the old one — no manual intervention required.

If the download fails or no installer is attached, a green "Update available" badge appears in the sidebar linking to the release page.

### How to publish an update

1. Bump the `version` in `package.json` (e.g. `2.0.0` → `2.1.0`).
2. Build the installer: `npm run build:win`
3. Create a new GitHub Release with the tag `v2.1.0`.
4. Attach the `Sonix-2.1.0-Setup.exe` from `dist/` as a release asset.
5. All existing users will automatically receive the update on next launch.

---

## Automatic Binary Download

On first launch, Sonix checks for `yt-dlp.exe` and `ffmpeg.exe` in its data directory (`%APPDATA%/sonix/bin/`). If they are missing, the app automatically:

1. Downloads the bundled binary package from the configured URL.
2. Extracts `yt-dlp.exe` and `ffmpeg.exe`.
3. Stores them permanently for future use.

This happens on the loading screen with a progress indicator. No manual setup is required.

---

## Installation

### Windows Installer (recommended)

1. Download `Sonix-x.x.x-Setup.exe` from the [latest release](https://github.com/nqxo62y/Sonix/releases/latest).
2. Run the installer and follow the prompts.
3. Launch Sonix from the Start Menu or Desktop shortcut.
4. On first launch, the app will download required binaries automatically.

### Portable

1. Download `Sonix-x.x.x-Portable.exe` from the [latest release](https://github.com/nqxo62y/Sonix/releases/latest).
2. Run the executable directly. No installation required.

### From Source

```bash
git clone https://github.com/nqxo62y/Sonix.git
cd Sonix
npm install
npm start
```

The app will download `yt-dlp` and `ffmpeg` automatically on first run.

---

## Usage

1. Open Sonix.
2. Paste a Spotify URL (track, album, or playlist).
3. Select a save folder.
4. Click **Fetch** to load the track list.
5. Select the tracks you want and click **Download**.

All settings (codec, bitrate, naming, concurrency, etc.) are configurable under the **Settings** tab.

---

## Custom Themes

Sonix supports user-created themes via JSON files.

1. Open **Settings → Appearance → Open themes folder**.
2. Create a `.json` file:

```json
{
  "name": "My Custom Theme",
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

3. Restart Sonix or re-open Settings. Your theme will appear in the picker.

---

## Building

```bash
npm run setup          # copies yt-dlp and ffmpeg into bin/ (optional for dev)
npm run build:win      # produces NSIS installer + portable .exe in dist/
```

Place an `icon.ico` file (256×256, multi-resolution) in the `build/` directory before building.

---

## How It Works

1. **Metadata resolution** — Scrapes the Spotify mobile site to extract track, album, and playlist metadata. No API credentials required by default.

2. **Audio search** — Uses `yt-dlp` to search YouTube and selects the best available audio stream.

3. **Encoding** — Audio is piped directly from `yt-dlp` into `ffmpeg` (no temp files). Encodes to the selected format with configured bitrate and metadata.

4. **Cover art** — Each track's individual album cover is fetched via Spotify's oembed API and embedded into the output file.

5. **Self-update** — On every launch, checks GitHub Releases. If a new version exists with an attached installer, downloads it to `%TEMP%/sonix-update/` and runs it silently. The app closes and the installer upgrades in place.

---

## Configuration

Settings are persisted to `%APPDATA%/sonix/settings.json`.

| Setting | Default | Description |
|---------|---------|-------------|
| Codec | MP3 | Output format (MP3, M4A, FLAC, WAV) |
| Bitrate | 320 kbps | Audio bitrate for lossy codecs |
| Sample Rate | 44.1 kHz | Output sample rate |
| Normalize | Off | EBU R128 loudness normalization |
| Overwrite | Off | Whether to overwrite existing files |
| Concurrency | 4 | Number of parallel downloads |
| Filename | `{title} - {artist}` | Output filename template |
| Theme | Dark | Light, Dark, System, or custom |

---

## FAQ

**Q: Do I need Spotify Premium?**
A: No. Sonix resolves metadata from Spotify's public pages. Audio is sourced from YouTube.

**Q: Do I need to install yt-dlp or ffmpeg manually?**
A: No. The app downloads and manages them automatically on first launch.

**Q: How do updates work?**
A: Every time you open Sonix, it checks GitHub for a new release. If one exists with an installer attached, it downloads and installs it automatically. You don't need to do anything.

**Q: Can I disable auto-updates?**
A: Currently no toggle exists in the UI. If you want to skip updates, run the app without internet or block the GitHub API domain.

**Q: My IP got flagged by YouTube.**
A: Downloading large volumes in a short time can trigger rate limiting. Reduce concurrency, enable a speed limit, or spread downloads over multiple sessions.

**Q: Does this work on macOS or Linux?**
A: Currently Windows only. Cross-platform support is planned.

---

## Legal Disclaimer

> **IMPORTANT — PLEASE READ**

This software is provided for **educational and personal use only**.

Sonix does not host, store, or distribute any copyrighted content. It is a tool that interacts with publicly available web services. The application does not circumvent any digital rights management (DRM) or access any content that is not freely accessible via standard web requests.

**Users are solely responsible for ensuring that their use of this software complies with all applicable local, national, and international laws**, including but not limited to copyright law, intellectual property law, and the terms of service of third-party platforms.

The developers of Sonix:

- Do **not** condone or encourage the unauthorized downloading, reproduction, or distribution of copyrighted material.
- Do **not** assume any liability for how this software is used by end users.
- **Strongly encourage** users to purchase music directly from artists and rights holders to support their work.

By downloading, installing, or using this software, you acknowledge that:

1. You will only download content that you have the legal right to access and store.
2. You accept full responsibility for any legal consequences arising from your use of this software.
3. The developers bear no responsibility for any misuse of this tool.

If you are a rights holder and believe this software is being used to infringe upon your intellectual property, please open an issue on this repository.

---

## Contributing

Contributions are welcome. Please open an issue first to discuss proposed changes.

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/my-feature`).
3. Commit your changes.
4. Open a pull request.

---

## Credits

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — Audio extraction
- [FFmpeg](https://ffmpeg.org/) — Audio encoding and metadata
- [Electron](https://www.electronjs.org/) — Desktop framework

---

## License

This project is licensed under the **GNU General Public License v3.0**.

See the [LICENSE](LICENSE) file for full details.

---

<p align="center">
  <sub>Made with care. Support the artists you love.</sub>
</p>
