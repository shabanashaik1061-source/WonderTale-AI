# ✨ WonderTale AI

### Turn simple ideas into narrated story worlds.

**WonderTale AI** is an AI-powered story and video generation studio that transforms a simple story idea into a complete narrated video.

From **story generation → scene creation → AI images → narration → subtitles → music → final MP4 → video library → YouTube publishing**, WonderTale AI brings the complete storytelling workflow into one application.

---

## 🎬 What is WonderTale AI?

Creating an animated or narrated story traditionally requires multiple tools for writing, image generation, voice generation, video editing, subtitles, music, and publishing.

WonderTale AI combines these steps into a single workflow.

```text
💡 Story Idea
     ↓
🤖 AI Story Generation
     ↓
📖 Scene Generation
     ↓
🎨 AI Scene Images
     ↓
🎙️ AI Narration
     ↓
🎬 Video Rendering
     ↓
📝 Subtitles + 🎵 Music
     ↓
📦 Final MP4
     ↓
📚 Video Library
     ↓
▶️ YouTube Publishing
```

---

# 🚀 Key Features

## 🤖 AI Story Generation

Generate complete stories from simple ideas.

### Features

* AI-powered story generation
* Custom story length
* Structured scene generation
* Multiple narration voice options
* Character seed support
* Story-focused prompts
* Scene-by-scene storytelling structure

### Current Story Model

```text
@cf/meta/llama-3.1-8b-instruct-fp8-fast
```

---

## 🎨 AI Scene Image Generation

Every generated scene can receive its own visual representation.

WonderTale AI uses **Cloudflare Workers AI** with the FLUX image generation model.

### Features

* Automatic scene image generation
* Fantasy and storytelling visuals
* Character seed support
* Scene-specific prompts
* Multiple generated scenes
* Cloud-based image generation

### Current Image Model

```text
@cf/black-forest-labs/flux-2-klein-4b
```

---

## 🎙️ AI Narration

WonderTale AI converts generated stories into narrated audio.

The application uses **Edge TTS** for voice generation.

### Available Voices

* Fable
* Rachel
* Onyx
* Nova
* Coral
* Lily

Voice selection is integrated into the story-to-video pipeline.

---

## 🎬 Video Generation

WonderTale AI converts generated scene images and narration into a complete video.

Instead of relying on a separate AI video model, the application creates the final cinematic video using generated assets and **FFmpeg-based rendering**.

### Video Features

* Scene-based video creation
* Animated still images
* Ken Burns-style camera movement
* AI narration
* Automatic subtitles
* Background music
* Adjustable music volume
* Audio/video synchronization
* Exact target-duration enforcement
* MP4 output
* H.264 video encoding
* AAC audio encoding

### Rendering Pipeline

```text
Scene Image
     +
Narration Audio
     +
Subtitle
     +
Background Music
     ↓
   FFmpeg
     ↓
Scene Video
     ↓
Final Concatenation
     ↓
Duration Validation
     ↓
Final MP4
```

---

# 📝 Subtitles

Generated narration can be accompanied by automatically generated subtitles.

WonderTale AI handles:

* Subtitle generation
* Text wrapping
* Subtitle timing
* Subtitle escaping
* Scene-level subtitle rendering
* Final video subtitle integration

---

# 🎵 Background Music

WonderTale AI supports background music for generated stories.

Current music categories include:

* Fantasy
* Adventure
* Calm
* Suspense

Music volume can be adjusted during video generation.

The system also ensures the background music matches the final video duration.

---

# 📚 Video Library

Completed videos are stored in the application's video library.

### Library capabilities

* View generated videos
* Play videos
* Download videos
* Manage completed videos
* Delete unwanted videos
* Publish library videos to YouTube
* Display permanent video thumbnails

The library maintains metadata for generated videos separately from temporary media files.

---

# 🖼️ Permanent Video Thumbnails

WonderTale AI automatically creates a permanent thumbnail from the final rendered MP4.

This solves an important storage problem:

```text
Temporary Scene Images
        ↓
      Render
        ↓
    Final MP4
        ↓
 Generate Thumbnail
        ↓
 Delete Temporary Images
```

The thumbnail is generated from the final video using FFmpeg and stored separately.

This means deleting temporary scene images does **not** break video-library previews.

---

# 🧹 Smart Storage Management

WonderTale AI includes automatic storage cleanup.

After a successful render, temporary files can be removed while final videos and thumbnails are preserved.

### Automatically cleaned

* Temporary scene images
* Temporary narration audio
* Scene video intermediates
* Concatenated intermediate videos
* Music-processing intermediates

### Preserved

* Final MP4 videos
* Permanent thumbnails
* Music library
* Story data
* Video library metadata

### Storage Dashboard

The frontend displays storage information such as:

```text
Storage Used
────────────
Videos
Music
Temporary Images
Temporary Audio
```

Users can also manually delete completed videos.

> If video rendering fails, source media is retained so the render can be debugged or retried.

---

# ▶️ YouTube Publishing

WonderTale AI includes YouTube integration through the **YouTube Data API and OAuth 2.0**.

Users can connect their YouTube account and publish videos directly from the application.

### Supported publishing options

* YouTube authentication
* OAuth callback handling
* Upload generated videos
* Video title
* Description
* Tags
* Privacy setting
* Publishing from the video library

### YouTube Flow

```text
WonderTale Video Library
          ↓
    Connect YouTube
          ↓
      OAuth 2.0
          ↓
 Select Library Video
          ↓
Title + Description + Tags
          ↓
      Privacy
          ↓
   YouTube Upload
```

---

# 🏗️ Project Architecture

```text
WonderTale-AI/
│
├── .venv/
│
├── generated/
│   ├── audio/
│   ├── images/
│   ├── music/
│   ├── stories/
│   ├── thumbnails/
│   └── videos/
│
├── local-image-ai/
│
├── public/
│   └── index.html
│
├── server/
│   ├── data/
│   ├── routes/
│   │   └── storageRoutes.js
│   │
│   ├── services/
│   │   ├── storageService.js
│   │   ├── storyService.js
│   │   ├── thumbnailService.js
│   │   ├── videoRenderer.js
│   │   └── youtubeService.js
│   │
│   ├── server.js
│   └── test-cloudflare-image.js
│
├── tts/
│   └── generate_voice.py
│
├── cloudflare-test.jpg
├── .env
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

# 🧩 Main Components

## `public/`

Contains the WonderTale AI frontend.

The current frontend is implemented in:

```text
public/index.html
```

It provides the user interface for:

* Story generation
* Scene generation
* Image generation
* Narration generation
* Video generation
* Library management
* Storage information
* YouTube publishing

---

## `server/server.js`

Main Express server responsible for connecting the frontend with the backend services.

It handles:

* API requests
* Story generation
* Image generation
* Audio generation
* Video rendering
* Video library operations
* Storage operations
* YouTube authentication
* YouTube publishing
* Static generated-media serving

---

## `server/services/storyService.js`

Responsible for story-related processing and AI story generation logic.

---

## `server/services/videoRenderer.js`

Responsible for the FFmpeg video-rendering pipeline.

It handles:

* Scene rendering
* Image animation
* Audio integration
* Subtitles
* Background music
* Concatenation
* Duration enforcement
* Final MP4 creation

---

## `server/services/thumbnailService.js`

Generates permanent thumbnails from completed videos.

```text
Final MP4
   ↓
FFmpeg frame extraction
   ↓
Permanent JPG thumbnail
```

---

## `server/services/storageService.js`

Handles WonderTale's storage-management system.

Responsibilities include:

* Storage calculation
* Temporary-media cleanup
* Intermediate-file cleanup
* Final-video deletion
* Storage statistics

---

## `server/services/youtubeService.js`

Handles YouTube-related service functionality used by the application.

---

## `server/routes/storageRoutes.js`

Provides storage-management API routes.

### Storage API

```text
GET    /api/storage
DELETE /api/storage/temporary
DELETE /api/storage/video/:filename
```

---

## `tts/generate_voice.py`

Python-based narration generation using Edge TTS.

---

# 🛠️ Technology Stack

| Layer               | Technology            |
| ------------------- | --------------------- |
| Frontend            | HTML, CSS, JavaScript |
| UI                  | Tailwind CSS          |
| Backend             | Node.js               |
| Server              | Express.js            |
| Story AI            | Cloudflare Workers AI |
| Story Model         | Llama 3.1 8B          |
| Image AI            | Cloudflare FLUX       |
| Image Model         | FLUX.2 Klein 4B       |
| Text-to-Speech      | Edge TTS              |
| Video Processing    | FFmpeg                |
| Media Analysis      | FFprobe               |
| YouTube Integration | YouTube Data API      |
| Authentication      | Google OAuth 2.0      |
| Storage             | Local filesystem      |
| Deployment          | Render                |

---

# 🔐 Environment Variables

Create a `.env` file in the project root.

```env
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret

YOUTUBE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback
```

### Important

Never commit `.env` or OAuth credentials to GitHub.

The project `.gitignore` protects:

```text
.env
server/data/youtubeTokens.json
```

---

# ⚙️ Installation

## 1. Clone the repository

```bash
git clone https://github.com/shabanashaik1061-source/WonderTale-AI.git
cd WonderTale-AI
```

---

## 2. Install Node.js dependencies

```bash
npm install
```

---

## 3. Create Python virtual environment

### Windows

```powershell
python -m venv .venv
```

Activate it:

```powershell
.venv\Scripts\activate
```

Install Edge TTS:

```powershell
pip install edge-tts
```

---

## 4. Install FFmpeg

Make sure FFmpeg and FFprobe are available in your system PATH.

Verify:

```powershell
ffmpeg -version
```

```powershell
ffprobe -version
```

---

## 5. Configure environment variables

Create:

```text
.env
```

using `.env.example` as the template.

---

# ▶️ Run WonderTale AI

Start the backend:

```powershell
node server/server.js
```

The application will be available at:

```text
http://localhost:3000
```

---

# 📱 Local Network Access

WonderTale AI can also be accessed from another device on the same Wi-Fi network.

For example:

```text
Laptop
  ↓
192.168.x.x:3000
  ↓
Phone
```

Open the laptop's local IP address from the phone:

```text
http://YOUR-COMPUTER-IP:3000
```

The laptop must remain running while the backend is being used.

---

# 🌐 Deployment

The project currently has a deployed version running on **Render**.

Production/demo deployment:

```text
https://wondertale-ai.onrender.com
```

Health endpoint:

```text
https://wondertale-ai.onrender.com/api/health
```

YouTube OAuth callback:

```text
https://wondertale-ai.onrender.com/auth/youtube/callback
```

### Deployment Note

The current application still relies on local filesystem storage, FFmpeg, and local Edge TTS execution for parts of the media-generation pipeline.

Therefore, the current deployment should be considered a **working deployment/demo environment**, rather than a fully cloud-native production architecture.

Future versions can move media processing and persistent storage to dedicated cloud infrastructure.

---

# 🔒 Security

Sensitive files are excluded from Git.

```text
.env
server/data/youtubeTokens.json
generated/images/*
generated/audio/*
generated/videos/*
generated/thumbnails/*
generated/music/*
```

Generated media is intentionally kept out of the Git repository to avoid committing large files and personal/generated content.

---

# 🧪 Current Workflow

A typical WonderTale generation process looks like:

```text
1. Enter story idea
        ↓
2. Generate AI story
        ↓
3. Generate structured scenes
        ↓
4. Generate scene images
        ↓
5. Generate narration
        ↓
6. Select music
        ↓
7. Render scene videos
        ↓
8. Add subtitles
        ↓
9. Add background music
        ↓
10. Combine scenes
        ↓
11. Enforce final duration
        ↓
12. Validate MP4
        ↓
13. Generate permanent thumbnail
        ↓
14. Clean temporary media
        ↓
15. Save to Video Library
        ↓
16. Optional YouTube upload
```

---

# 📊 Design Goals

WonderTale AI is designed around several principles:

### 🎯 Simplicity

A user should be able to go from an idea to a finished story video without needing professional video-editing knowledge.

### ⚡ Automation

The application automates repetitive tasks such as:

* Scene creation
* Image generation
* Narration
* Subtitle generation
* Video rendering
* Music integration
* Thumbnail generation
* Storage cleanup
* YouTube publishing

### 🎨 Storytelling

The focus is not simply generating random AI content.

The system is designed around creating a connected storytelling experience using:

* Characters
* Scenes
* Narration
* Visuals
* Music
* Subtitles
* Cinematic movement

### 🧹 Efficient Storage

Temporary media should not accumulate unnecessarily.

The application therefore preserves final outputs while automatically cleaning intermediate assets after successful rendering.

---

# 🔮 Future Improvements

Potential future development includes:

* 📱 Progressive Web App experience
* ☁️ Cloud object storage
* ⚙️ Cloud-based FFmpeg workers
* 🎙️ More narration providers
* 🎨 More image-generation models
* 🧑‍🎨 Advanced character consistency
* 📝 Improved subtitle styling
* 🎞️ More cinematic transitions
* 🖼️ Custom thumbnails
* 👤 User accounts
* 💾 Persistent cloud video libraries
* 📊 Usage analytics
* 💳 Subscription/payment system
* 📤 Additional publishing platforms
* 🔄 Background rendering jobs
* 🚀 Scalable production architecture

---

# 📁 Generated Media Strategy

WonderTale separates temporary media from final outputs.

```text
generated/
│
├── images/       → temporary scene images
├── audio/        → temporary narration audio
├── music/        → background music
├── videos/       → final rendered videos
├── thumbnails/   → permanent video thumbnails
└── stories/      → story-related data
```

Temporary images and audio are cleaned after successful rendering.

Final videos and thumbnails remain available for the Video Library.

---

# 💡 Why WonderTale AI?

WonderTale AI brings several traditionally separate creative tools into one workflow.

Instead of:

```text
AI Writer
   +
Image Generator
   +
Voice Generator
   +
Video Editor
   +
Subtitle Tool
   +
Music Editor
   +
YouTube
```

WonderTale AI aims to provide:

```text
             WONDER TALE AI
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
     Story        Visuals       Voice
       │            │            │
       └────────────┼────────────┘
                    ↓
                 Video
                    ↓
          Library + YouTube
```

---

# 👩‍💻 Author

**Shaik Shabana**

Aspiring AI / Data / Software Engineer

### Project

**WonderTale AI — AI Story & Video Generation Studio**

---

# ⭐ Project Status

**Current Status: Working Prototype / Active Development**

The core story-to-video workflow is functional, including:

* ✅ AI story generation
* ✅ Scene generation
* ✅ Cloudflare FLUX images
* ✅ Edge TTS narration
* ✅ Multiple voices
* ✅ FFmpeg video rendering
* ✅ Subtitles
* ✅ Background music
* ✅ Final-duration enforcement
* ✅ Permanent thumbnails
* ✅ Smart storage cleanup
* ✅ Video library
* ✅ Video deletion
* ✅ YouTube OAuth
* ✅ YouTube video upload
* ✅ Render deployment

WonderTale AI is continuing toward a more scalable, polished, and production-ready AI storytelling platform.

---

## 📜 License

This project is currently under active development.

License information can be added when the project is ready for public distribution.
