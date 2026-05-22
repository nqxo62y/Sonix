<p align="center">
  <br/>
  <img src="assets/banner.png" width="600" alt="Sonix Banner"/>
  <br/><br/>
</p>

<h1 align="center">Sonix</h1>

<p align="center">
  A modern, open-source music downloader with a premium interface.<br/>
  Download tracks, albums and playlists from Spotify as high-quality audio files<br/>
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

Sonix is a desktop application built with Electron that allows you to download music from Spotify. It resolves track metadata directly from Spotify, finds the corresponding audio on YouTube, and encodes it to your preferred format with full tagging and artwork.

The application is designed to be fast, visually clean, and highly configurable.

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
| **Updates** | Automatic update checking via GitHub Releases |
| **Packaging** | Windows installer (NSIS) and portable executable |

---

## Installation

### Windows Installer (recommended)

1. Download `Sonix-x.x.x-Setup.exe` from the [latest release](https://github.com/nqxo62y/Sonix/releases/latest).
2. Run the installer and follow the prompts.
3. Launch Sonix from the Start Menu or Desktop shortcut.

### Portable

1. Download `Sonix-x.x.x-Portable.exe` from the [latest release](https://github.com/nqxo62y/Sonix/releases/latest).
2. Run the executable directly. No installation required.

### From Source

```bash
git clone https://github.com/nqxo62y/Sonix.git
cd sonix/electron-app
npm install
npm run setup
npm start
```

> The `setup` script copies `yt-dlp.exe` and `ffmpeg.exe` into the `bin/` directory. If they are not found automatically, download them manually:
> - [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases/latest)
> - [ffmpeg](https://github.com/BtbN/FFmpeg-Builds/releases)

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
2. Create a `.json` file with the following structure:

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

3. Restart Sonix or re-open the Settings tab. Your theme will appear in the theme picker.

Two example themes are included in the `themes-example/` directory.

---

## Building

To create a distributable installer:

```bash
npm run setup          # ensure yt-dlp and ffmpeg are in bin/
npm run build:win      # produces NSIS installer + portable .exe in dist/
```

Place an `icon.ico` file (256×256, multi-resolution) in the `build/` directory before building.

---

## How It Works

1. **Metadata resolution** — Sonix scrapes the Spotify mobile site to extract track, album, and playlist metadata. No Spotify API credentials are required by default. Optionally, you can provide your own Client ID and Secret for the official API.

2. **Audio search** — For each track, Sonix uses `yt-dlp` to search YouTube (`ytsearch1: artist title audio`) and selects the best available audio stream.

3. **Encoding** — The audio stream is piped directly from `yt-dlp` into `ffmpeg`, which encodes it to the selected format with the configured bitrate, sample rate, and metadata tags.

4. **Cover art** — Each track's individual album cover is fetched from Spotify (via the oembed endpoint) and embedded into the output file as an APIC/attached_pic tag.

5. **No intermediate files** — The entire pipeline streams in memory. No temporary WAV or raw audio files are written to disk.

---

## Configuration

All settings are persisted automatically to `%APPDATA%/sonix/settings.json` (Windows).

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

## Frequently Asked Questions

**Q: Do I need Spotify Premium?**
A: No. Sonix resolves metadata from Spotify's public pages. Audio is sourced from YouTube.

**Q: Do I need a Spotify API key?**
A: No. The app works without any credentials. Providing a Client ID/Secret is optional and enables the official API (which provides ISRC codes and may be more reliable for large playlists).

**Q: Can I get higher quality audio?**
A: Audio quality is limited by what YouTube provides. With YouTube Premium cookies, `yt-dlp` can access higher-bitrate streams (up to 256 kbps AAC). The app then re-encodes to your chosen format.

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

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — Audio extraction from YouTube
- [FFmpeg](https://ffmpeg.org/) — Audio encoding and metadata embedding
- [Electron](https://www.electronjs.org/) — Desktop application framework

---

## License

This project is licensed under the **GNU General Public License v3.0**.

You are free to use, modify, and distribute this software under the terms of the GPL-3.0 license. See the [LICENSE](LICENSE) file for full details.

---

<p align="center">
  <sub>Made with care. Support the artists you love.</sub>
</p>
