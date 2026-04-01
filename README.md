# ffui

<h2 align="center">ffmpeg converters with a fun, colorful desktop UI</h2>

<h3 align="center">Tauri + React + Tailwind on top, Rust + ffmpeg underneath</h3>

---

`ffui` is a desktop app for everyday `ffmpeg` work that tries to stay approachable without hiding the useful bits.
You can add one file, throw in a whole folder, tweak conversion settings in a visual inspector, check the exact command that will run, and send everything through a simple queue.

It is built for the moments where you want more confidence than a one-off shell command, but you still want the real output path, real progress, and real `ffmpeg` behavior underneath.

## ✨ Stack

- **Frontend:** React + TypeScript + Tailwind CSS + Vite
- **Desktop shell:** Tauri
- **Backend:** Rust
- **Media engine:** system `ffmpeg` + `ffprobe`

## 🎬 Current Features

- Add media files or folders
- Auto-scan folder inputs for batch jobs
- Built-in presets for common conversion flows
- Save custom presets locally
- Adjust trim, resize, audio bitrate, and GIF-specific settings
- Generate human-readable output summaries
- Preview the exact `ffmpeg` command before running the queue
- Run jobs sequentially and stream progress/log events into the UI
- Keep the desktop workflow focused while still exposing technical details when you want them

## Presets

| Preset | Job type | Quality | Target | Video format | Audio format | Resize |
| --- | --- | --- | --- | --- | --- | --- |
| Web MP4 | Video Convert | Good | Web | MP4 H.264 | MP3 | 1920x1080 |
| Small MP4 | Compress for Sharing | Smallest file | Email | MP4 H.264 | MP3 | 1280x720 |
| High Quality MP4 | Video Convert | Best quality | Play everywhere | MP4 H.264 | AAC | 1920x1080 |
| HEVC Smaller File | Video Convert | Good | Apple | MP4 HEVC | AAC | 1920x1080 |
| MP3 | Audio Convert | Good | Play everywhere | MP4 H.264 | MP3 | Source size |
| AAC | Audio Convert | Good | Apple | MP4 H.264 | AAC | Source size |
| WAV | Audio Convert | Best quality | Play everywhere | MP4 H.264 | WAV | Source size |
| FLAC | Audio Convert | Best quality | Play everywhere | MP4 H.264 | FLAC | Source size |
| Discord Upload | Compress for Sharing | Smallest file | Discord | MP4 H.264 | AAC | 1280x720 |
| Email Attachment | Compress for Sharing | Smallest file | Email | MP4 H.264 | AAC | 1280x720 |
| Just Play Everywhere | Video Convert | Good | Play everywhere | MP4 H.264 | AAC | 1920x1080 |
| GIF Clip | Make GIF | Good | Web | GIF | MP3 | 1280x720 |

## 🚀 Run It

Install dependencies:

```bash
npm install --cache .npm-cache
```

Build an installable desktop app first:

```bash
npx tauri build
```

On macOS, the packaged app will be produced under `src-tauri/target/release/bundle/`.

For day-to-day development, start the desktop app in dev mode:

```bash
npm run tauri dev
```

Build the frontend only:

```bash
npm run build
```

Check the Rust/Tauri backend:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

## 🧰 Requirements

- Node.js
- npm
- Rust toolchain
- `ffmpeg`
- `ffprobe`

macOS install for ffmpeg:

```bash
brew install ffmpeg
```

Ubuntu / Debian install for ffmpeg:

```bash
sudo apt install ffmpeg
```
