# ✨ WonderTale AI

> Turn simple ideas into narrated story worlds.

WonderTale AI is an AI-powered story creation studio that transforms a simple story idea into a complete narrated video.

It combines AI story generation, cinematic scene images, AI narration, FFmpeg video rendering, subtitles, background music, video library management, and YouTube publishing into one workflow.

---

## 🌟 Features

### 🪄 AI Story Generation

Generate original stories from a simple user prompt.

* AI-powered story creation
* Custom story length
* Multiple narration voices
* Character seed support
* Scene-based story structure

### 🎨 AI Scene Images

Create visual scenes for each part of the story using Cloudflare AI image generation.

* AI-generated scene images
* Character consistency support
* Fantasy and storytelling visuals
* Automatic scene generation

### 🎙️ AI Narration

Convert story narration into spoken audio using Edge TTS.

Available narration voices:

* **Fable** — Storyteller
* **Rachel** — Narrator
* **Onyx** — Deep
* **Nova** — Warm
* **Coral** — Friendly

### 🎬 AI Video Generation

WonderTale AI combines generated images and narration into MP4 videos.

The rendering pipeline supports:

* Scene-based video creation
* Animated images
* Ken Burns-style camera movement
* Narration audio
* Subtitles
* Background music
* FFmpeg processing
* Audio/video synchronization
* Final MP4 rendering

### 📚 Video Library

Generated videos can be stored in the WonderTale library.

Users can:

* Watch generated videos
* Download videos
* View generated stories
* Manage completed videos
* Publish existing videos to YouTube

### ▶️ YouTube Publishing

WonderTale AI supports YouTube OAuth integration for publishing generated videos directly to YouTube.

The publishing workflow supports:

* YouTube authentication
* Video title
* Description
* Tags
* Privacy settings
* Video upload
* Publishing videos from the library

---

## 🏗️ Project Structure

```text
WonderTale-AI/
├──.venv
├── generated/
│   ├── audio/
│   ├── images/
│   ├── music/
│   ├── thumbnails/
|   │── stories/
│   |   └── stories.json 
│   └── videos/
     
│
├── local-image-ai/
│
├── public/
│   ├── CSS/
│   ├── js/
│   └── index.html
│
├── server/
│   ├── data/
│   ├── routes/
│   ├── services/
│   │   ├── storyService.js
│   │   ├── videoRenderer.js
│   │   └── youtubeService.js
│   │
│   ├── server.js
│   └── test-cloudflare-image.js
│
├── tts/
│   └── generate_voice.py
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

## ⚙️ Technology Stack

### Frontend

* HTML
* CSS
* JavaScript
* Tailwind CSS

### Backend

* Node.js
* Express.js

### AI

* Cloudflare Workers AI
* LLM-based story generation
* Cloudflare FLUX image generation
* Edge TTS narration

### Video Processing

* FFmpeg
* FFprobe
* MP4 rendering
* Audio/video synchronization
* Subtitle processing
* Scene animation
* Background music

### Integration

* YouTube Data API
* YouTube OAuth 2.0

---

## 🔄 How WonderTale AI Works

```text
                    💡 Story Idea
                         │
                         ▼
                🪄 AI Story Generation
                         │
                         ▼
                    📖 Story Scenes
                         │
                         ▼
                 🎨 AI Scene Images
                         │
                         ▼
                  🎙️ AI Narration
                         │
                         ▼
                🎬 Scene Video Rendering
                         │
                         ▼
              🎵 Music + Subtitles
                         │
                         ▼
                    🎞️ Final MP4
                         │
                         ▼
                   📚 Video Library
                         │
                         ▼
                  ▶️ YouTube Publishing
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/shabanashaik1061-source/WonderTale-AI.git
cd WonderTale-AI
git status
```

---

### 2. Install Node.js Dependencies

```bash
npm install
```

---

### 3. Install Python Dependencies

WonderTale AI uses Python for AI narration.

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

Install Edge TTS:

```bash
pip install edge-tts
```

---

### 4. Install FFmpeg

WonderTale AI requires FFmpeg for video and audio processing.

Check FFmpeg:

```bash
ffmpeg -version
```

Check FFprobe:

```bash
ffprobe -version
```

Both commands should return the installed version.

---

## 🔐 Environment Variables

Create a `.env` file in the project root.

Example:

```env
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback
```

### ⚠️ Important

Never upload your real `.env` file to GitHub.

Your API keys, tokens, client secrets, and OAuth credentials must remain private.

Use `.env.example` to show the required variable names without exposing real secrets.

---

## ▶️ Run the Application

From the project root:

```bash
node server/server.js
```

The application will start on:

```text
http://localhost:3000
```

You should see:

```text
WONDER TALE AI STUDIO BACKEND

Server: http://localhost:3000

✅ SERVER IS LISTENING
```

---

## 📱 Local Mobile Access

WonderTale AI can also be accessed from another phone or computer connected to the same Wi-Fi network.

For example:

```text
http://YOUR-COMPUTER-IP:3000
```

Example:

```text
http://192.168.0.114:3000
```

The computer running the WonderTale AI backend must remain powered on and the server must remain running.

This is useful for local testing on mobile devices.

---

## 🎥 Video Generation Pipeline

WonderTale AI generates videos through several stages.

```text
1. User enters story idea
        ↓
2. AI generates the story
        ↓
3. Story is divided into scenes
        ↓
4. AI generates scene images
        ↓
5. Edge TTS generates narration
        ↓
6. FFmpeg creates animated scene videos
        ↓
7. Narration is synchronized
        ↓
8. Subtitles are added
        ↓
9. Background music is added
        ↓
10. Final MP4 is created
```

The final result is stored in the generated video directory.

---

## 🎙️ Narration Voices

WonderTale AI currently supports multiple narration styles.

| Voice  | Style       |
| ------ | ----------- |
| Fable  | Storyteller |
| Rachel | Narrator    |
| Onyx   | Deep        |
| Nova   | Warm        |
| Coral  | Friendly    |

The narration system uses Microsoft Edge TTS voices through the `edge-tts` Python package.

---

## 🎨 AI Image Generation

WonderTale AI uses Cloudflare Workers AI for scene image generation.

The image generation pipeline creates visual scenes based on the generated story.

The current image model is:

```text
@cf/black-forest-labs/flux-2-klein-4b
```

Generated images are temporarily stored inside:

```text
generated/images/
```

---

## 🧠 AI Story Generation

Story generation uses a Cloudflare Workers AI language model.

The current model is:

```text
@cf/meta/llama-3.1-8b-instruct-fp8-fast
```

The generated story is converted into structured scenes for visual generation and video rendering.

---

## 🎬 Video Rendering

Video rendering is handled by FFmpeg.

The renderer supports:

* Image-to-video scenes
* Camera movement
* Scene duration control
* Narration synchronization
* Subtitles
* Background music
* MP4 output
* Final duration enforcement

Generated videos are stored inside:

```text
generated/videos/
```

---

## 📚 Story and Video Storage

Story information is stored in:

```text
stories/stories.json
```

Generated media is organized into:

```text
generated/
├── audio/
├── images/
├── music/
├── thumbnails/
└── videos/
```

Generated media files are excluded from Git using `.gitignore`.

---

## ▶️ YouTube Integration

WonderTale AI supports YouTube publishing using:

```text
YouTube Data API
YouTube OAuth 2.0
```

Users can authenticate their YouTube account and publish generated videos.

Publishing supports:

* Title
* Description
* Tags
* Privacy status
* Existing library videos

For local development, the OAuth callback uses:

```text
http://localhost:3000/auth/youtube/callback
```

For production deployment, the callback URL must be changed to the deployed application's public URL and registered in Google Cloud.

---

## 🔒 Security

Never commit sensitive credentials.

The following files should remain private:

```text
.env
server/data/youtubeTokens.json
```

The project `.gitignore` prevents these files from being uploaded to GitHub.

Do not expose:

* Cloudflare API tokens
* Cloudflare account credentials
* YouTube client secrets
* OAuth tokens
* Private API keys

---

## 🧹 Git Ignore

Generated media and sensitive files are intentionally excluded from Git.

Important ignored content includes:

```text
node_modules/
.env
server/data/youtubeTokens.json

generated/images/*
generated/audio/*
generated/videos/*
generated/thumbnails/*
generated/music/*
```

This keeps the GitHub repository smaller and protects private credentials.

---

## 📱 Future Online Deployment

The long-term goal is to deploy WonderTale AI as an online service.

The planned architecture is:

```text
                    📱 User Phone
                         │
                         ▼
                  🌐 WonderTale Web App
                         │
                         ▼
                    ☁️ Backend API
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     🤖 Story AI     🎨 Image AI     🎙️ TTS
          │              │              │
          └──────────────┼──────────────┘
                         ▼
                   🎬 FFmpeg
                         │
                         ▼
                    ☁️ Storage
                         │
                         ▼
                   📚 Video Library
                         │
                         ▼
                    ▶️ YouTube
```

The goal is to eventually allow users to create videos directly from their phones without keeping a personal computer running.

---

## 🔮 Future Improvements

Planned improvements include:

* Mobile-first interface
* Online deployment
* Cloud video storage
* Character consistency across scenes
* More natural narration
* More narration voices
* More visual styles
* Story templates
* Background music library
* Progressive Web App support
* Automated YouTube publishing
* User accounts
* Cloud story library
* Faster video generation
* Improved video transitions

---

## 🎯 Project Goal

WonderTale AI is designed to make AI storytelling simple.

The core idea is:

> **Idea → Story → Scenes → Narration → Video → YouTube**

The long-term vision is to create a simple AI story studio where anyone can turn an idea into a narrated story video without needing professional video-editing skills.

---

## 📌 Project Status

**Active Development 🚀**

WonderTale AI currently has a working local story-to-video generation pipeline.

Current working capabilities include:

* ✅ AI story generation
* ✅ AI scene generation
* ✅ AI narration
* ✅ Multiple narration voices
* ✅ Animated scene videos
* ✅ Subtitle generation
* ✅ Background music support
* ✅ Final MP4 rendering
* ✅ Video library
* ✅ YouTube OAuth integration
* ✅ YouTube video publishing
* ✅ Local mobile access

---

## 🌱 Vision

WonderTale AI aims to make storytelling accessible to everyone.

No complicated video editing.

No professional production setup.

Just:

**Imagine → Generate → Watch → Share**

---

## 👩‍💻 Author

**Shaik Shabana**

WonderTale AI — AI Story Creation Studio

---

## ⭐ Support

If you like the idea behind WonderTale AI, consider giving the project a ⭐ on GitHub.

---

## 📄 License

This project is currently under active development.

License information will be added as the project moves toward public release.
