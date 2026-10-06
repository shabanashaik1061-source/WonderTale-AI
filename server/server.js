const express = require("express");
const { google } = require("googleapis");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { renderScene } = require("./services/videoRenderer");
const storageRoutes =
    require("./routes/storageRoutes");
const {
    cleanupAfterSuccessfulRender
} = require("./services/storageService");
const {
    generateVideoThumbnail
} = require("./services/thumbnailService");

const {
    getYouTubeAuthUrl,
    exchangeCodeForTokens,
    getAuthenticatedYouTubeClient,
    isYouTubeConnected,
    uploadVideoToYouTube,
    setYouTubeThumbnail
} = require("./services/youtubeService");

dotenv.config({
    path: path.join(__dirname, "..", ".env")
});
const CLOUDFLARE_ACCOUNT_ID =
    process.env.CLOUDFLARE_ACCOUNT_ID;

const CLOUDFLARE_API_TOKEN =
    process.env.CLOUDFLARE_API_TOKEN;

console.log(
    "CLOUDFLARE ACCOUNT ID LOADED:",
    Boolean(CLOUDFLARE_ACCOUNT_ID)
);

console.log(
    "CLOUDFLARE API TOKEN LOADED:",
    Boolean(CLOUDFLARE_API_TOKEN)
);

console.log("YOUTUBE CLIENT ID LOADED:", !!process.env.YOUTUBE_CLIENT_ID);
console.log("YOUTUBE CLIENT SECRET LOADED:", !!process.env.YOUTUBE_CLIENT_SECRET);
console.log("YOUTUBE REDIRECT URI:", process.env.YOUTUBE_REDIRECT_URI);

const app = express();

const PORT =
  process.env.PORT || 3000;



/* ============================================================
   DIRECTORIES
============================================================ */

const PUBLIC_DIR =
  path.join(__dirname, "..", "public");

const GENERATED_DIR =
  path.join(__dirname, "..", "generated");

const IMAGE_DIR =
  path.join(GENERATED_DIR, "images");

const VIDEO_DIR =
  path.join(GENERATED_DIR, "videos");
  
const AUDIO_DIR =
  path.join(GENERATED_DIR, "audio");

const DATA_DIR =
  path.join(__dirname, "data");

const LIBRARY_FILE =
  path.join(DATA_DIR, "videoLibrary.json");
const LOCAL_IMAGE_AI_DIR = path.join(
  __dirname,
  "..",
  "local-image-ai"
);

const LOCAL_IMAGE_SCRIPT = path.join(
  LOCAL_IMAGE_AI_DIR,
  "generate_image.py"
);

const LOCAL_IMAGE_PYTHON = path.join(
  __dirname,
  "..",
  ".venv",
  "Scripts",
  "python.exe"
);
/* ============================================================
   CREATE DIRECTORIES
============================================================ */

try {

  fs.mkdirSync(
    IMAGE_DIR,
    { recursive: true }
  );

  fs.mkdirSync(
    VIDEO_DIR,
    { recursive: true }
  );

  fs.mkdirSync(
    AUDIO_DIR,
    { recursive: true }
  );

  console.log(
    "Generated directories ready."
  );

  fs.mkdirSync(
  DATA_DIR,
  { recursive: true }
);

if (!fs.existsSync(LIBRARY_FILE)) {

  fs.writeFileSync(
    LIBRARY_FILE,
    "[]",
    "utf8"
  );

}

} catch (err) {

  console.error(
    "Failed to create storage directories:",
    err
  );


}


/* ============================================================
   MIDDLEWARE
============================================================ */

app.use(
  express.json({
    limit: "30mb"
  })
);

app.use(
  express.static(PUBLIC_DIR)
);

app.use(
  "/generated",
  express.static(GENERATED_DIR)
);
app.use(
    "/api/storage",
    storageRoutes
);

/* ============================================================
   HELPERS
============================================================ */

function cleanText(
  value,
  fallback = ""
) {

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {

    return fallback;
  }

  return value.trim();
}


function clamp(
  value,
  min,
  max
) {

  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {

    return min;
  }

  return Math.min(
    Math.max(
      number,
      min
    ),
    max
  );
}


function safeFileName(value) {

  return String(value)

    .toLowerCase()

    .replace(
      /[^a-z0-9]+/g,
      "-"
    )

    .replace(
      /^-+|-+$/g,
      ""
    )

    .slice(
      0,
      70
    );
}

function readVideoLibrary() {

  try {

    if (!fs.existsSync(LIBRARY_FILE)) {

      return [];

    }

    const content =
      fs.readFileSync(
        LIBRARY_FILE,
        "utf8"
      );

    if (!content.trim()) {

      return [];

    }

    const library =
      JSON.parse(content);

    return Array.isArray(library)
      ? library
      : [];

  } catch (error) {

    console.error(
      "LIBRARY READ ERROR:",
      error
    );

    return [];

  }

}


function writeVideoLibrary(library) {

  fs.writeFileSync(
    LIBRARY_FILE,
    JSON.stringify(
      library,
      null,
      2
    ),
    "utf8"
  );

}
function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", args, {
      windowsHide: true
    });

    let stderr = "";

    ffmpeg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    ffmpeg.on("error", (error) => {
      reject(error);
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `FFmpeg failed with code ${code}\n${stderr}`
          )
        );
      }
    });
  });
}
async function addContinuousBackgroundMusic({
    videoPath,
    musicStyle,
    musicVolume,
    targetDuration,
    outputPath
}) {

    if (
        !videoPath ||
        !fs.existsSync(videoPath)
    ) {
        throw new Error(
            "Final video was not found."
        );
    }

    if (
        !musicStyle ||
        musicStyle === "none"
    ) {
        return videoPath;
    }

    const musicDir =
        path.join(
            __dirname,
            "..",
            "generated",
            "music"
        );

    const musicPath =
        path.join(
            musicDir,
            `${musicStyle}-background.mp3`
        );

    if (!fs.existsSync(musicPath)) {
        throw new Error(
            `Background music file not found: ${musicPath}`
        );
    }

    const volume =
        Math.max(
            0,
            Math.min(
                100,
                Number(musicVolume) || 0
            )
        ) / 100;

    console.log(
        `🎵 Adding continuous ${musicStyle} music`
    );

    console.log(
        `🎵 Music volume: ${volume}`
    );

    console.log(
        `🎵 Music duration target: ${targetDuration.toFixed(2)} seconds`
    );

    const args = [
        "-y",

        "-i",
        videoPath,

        "-stream_loop",
        "-1",

        "-i",
        musicPath,

        "-filter_complex",

        [
            `[1:a]volume=${volume.toFixed(2)}[music]`,
            `[0:a][music]amix=inputs=2:duration=first:dropout_transition=0[audio]`
        ].join(";"),

        "-map",
        "0:v:0",

        "-map",
        "[audio]",

        "-t",
        targetDuration.toFixed(3),

        "-c:v",
        "libx264",

        "-preset",
        "medium",

        "-crf",
        "18",

        "-pix_fmt",
        "yuv420p",

        "-c:a",
        "aac",

        "-b:a",
        "192k",

        "-movflags",
        "+faststart",

        outputPath
    ];

    await runFFmpeg(args);

    if (!fs.existsSync(outputPath)) {
        throw new Error(
            "Final video with background music was not created."
        );
    }

    console.log(
        "✅ Continuous background music added."
    );

    return outputPath;
}

async function getMediaDuration(filePath) {
    return new Promise((resolve, reject) => {

        const args = [
            "-v",
            "error",

            "-show_entries",
            "format=duration",

            "-of",
            "default=noprint_wrappers=1:nokey=1",

            filePath
        ];

        const ffprobe =
            spawn("ffprobe", args);

        let output = "";
        let errorOutput = "";

        ffprobe.stdout.on(
            "data",
            (data) => {
                output += data.toString();
            }
        );

        ffprobe.stderr.on(
            "data",
            (data) => {
                errorOutput += data.toString();
            }
        );

        ffprobe.on(
            "close",
            (code) => {

                if (code !== 0) {
                    return reject(
                        new Error(
                            `ffprobe failed: ${errorOutput}`
                        )
                    );
                }

                const duration =
                    Number(output.trim());

                if (!Number.isFinite(duration)) {
                    return reject(
                        new Error(
                            "Could not determine media duration."
                        )
                    );
                }

                resolve(duration);
            }
        );

        ffprobe.on(
            "error",
            (error) => {
                reject(error);
            }
        );
    });
}


async function enforceFinalVideoDuration({
    inputPath,
    outputPath,
    targetDuration
}) {

    if (
        !inputPath ||
        !fs.existsSync(inputPath)
    ) {
        throw new Error(
            "Input video for final duration enforcement was not found."
        );
    }

    console.log(
        `⏱️ Enforcing final duration: ${targetDuration.toFixed(2)} seconds`
    );

    const args = [
        "-y",

        "-i",
        inputPath,

        "-t",
        targetDuration.toFixed(3),

        "-c:v",
        "libx264",

        "-preset",
        "medium",

        "-crf",
        "18",

        "-pix_fmt",
        "yuv420p",

        "-c:a",
        "aac",

        "-b:a",
        "192k",

        "-movflags",
        "+faststart",

        outputPath
    ];

    await runFFmpeg(args);

    if (!fs.existsSync(outputPath)) {
        throw new Error(
            "Final duration-enforced MP4 was not created."
        );
    }

    const actualDuration =
        await getMediaDuration(outputPath);

    console.log(
        `⏱️ FINAL MP4 DURATION: ${actualDuration.toFixed(2)} seconds`
    );

    return outputPath;
}
/* ============================================================
   HEALTH CHECK
============================================================ */

app.get(
  "/api/health",
  (req, res) => {

    res.json({

      success: true,

      message:
        "WonderTale AI backend is running",

      imageGeneration:
  Boolean(
    CLOUDFLARE_API_TOKEN
  ),

storyGeneration:
  Boolean(
    CLOUDFLARE_API_TOKEN
  ),

videoGeneration:
  true,

imageModel:
  "@cf/black-forest-labs/flux-2-klein-4b",

videoModel:
  "Cloudflare Images + FFmpeg",
      timestamp:
        new Date().toISOString()

    });

  }
);


/* ============================================================
   STORY GENERATION
   STAGE 1
============================================================ */

app.post(
  "/api/stories/generate",
  async (req, res) => {

    try {

      const prompt =
        cleanText(req.body.prompt);

      if (!prompt) {
        return res.status(400).json({
          success: false,
          message: "Please enter a story idea."
        });
      }


      const characterAnchor =
        cleanText(req.body.characterAnchor);

      const sceneCount =
        clamp(
          req.body.sceneCount || 8,
          4,
          16
        );

      const storyLength =
        Number(req.body.storyLength || 1);

      if (
        !Number.isFinite(storyLength) ||
        storyLength <= 0
      ) {
        throw new Error("Invalid story length.");
      }

      const totalDurationSeconds =
        storyLength * 60;

      const sceneDuration =
        totalDurationSeconds / sceneCount;

      const wordsPerSecond = 2.2;

      const targetWordsPerScene =
        Math.max(
          8,
          Math.floor(
            sceneDuration *
            wordsPerSecond
          )
        );

      const maxWordsPerScene =
        Math.ceil(
          targetWordsPerScene * 1.10
        );

      const aspectRatio =
        cleanText(
          req.body.aspectRatio,
          "16:9"
        );

      const voiceProfile =
        cleanText(
          req.body.voiceProfile,
          "Warm Narrative Voice"
        );

      /* ------------------------------------------------------
         SYSTEM PROMPT
      ------------------------------------------------------ */

      const systemPrompt = `
You are WonderTale AI Story Engine.

Create a cinematic children's story.

The user requires EXACTLY ${sceneCount} scenes.

Total video duration:
${totalDurationSeconds} seconds.

Each scene duration:
${sceneDuration.toFixed(2)} seconds.

Each scene narration should contain approximately
${targetWordsPerScene} words.

Maximum narration per scene:
${maxWordsPerScene} words.

IMPORTANT:
Return ONLY a valid JSON object.

Do NOT use markdown.
Do NOT use code fences.
Do NOT write explanations before or after the JSON.

The JSON must follow this exact structure:

{
  "title": "Story Title",
  "concept": "Short story concept",
  "characters": [
    {
      "name": "Character name",
      "role": "Character role",
      "description": "Detailed visual appearance"
    }
  ],
  "scenes": [
    {
      "sceneNumber": 1,
      "phase": "opening",
      "title": "Scene title",
      "narration": "Short narration",
      "imagePrompt": "Detailed cinematic image description",
      "videoPrompt": "Detailed movement and camera description",
      "duration": ${sceneDuration.toFixed(2)}
    }
  ]
}

RULES:

1. Create exactly ${sceneCount} scenes.
2. Scene numbers must be 1 through ${sceneCount}.
3. Every scene must advance the story.
4. Keep recurring characters visually consistent.
5. Image prompts must describe characters, environment,
   lighting, composition and important visual details.
6. Video prompts must describe character movement,
   environmental movement and camera movement.
7. Narration must be child-friendly.
8. Each narration must stay within the word limit.
9. Never include markdown.
10. Never include comments.
11. Never include trailing commas.
12. Return valid JSON only.
`.trim();

      /* ------------------------------------------------------
         USER PROMPT
      ------------------------------------------------------ */

      const userPrompt = `
STORY IDEA:

${prompt}

CHARACTER SEED:

${characterAnchor ||
  "Create suitable recurring characters."}

ASPECT RATIO:

${aspectRatio}

VOICE PROFILE:

${voiceProfile}

VIDEO DURATION:

${totalDurationSeconds} seconds

NUMBER OF SCENES:

${sceneCount}

SCENE DURATION:

${sceneDuration.toFixed(2)} seconds

Create the complete cinematic children's story now.

Remember:

EXACTLY ${sceneCount} scenes.

JSON ONLY.
`.trim();

      console.log(
        "=========================================="
      );

      console.log(
        "Generating story..."
      );

      console.log(
        `Scenes: ${sceneCount}`
      );

      console.log(
        `Duration: ${totalDurationSeconds}s`
      );

    
/* ------------------------------------------------------
   CLOUDFLARE STORY AI
------------------------------------------------------ */

const model =
    "@cf/meta/llama-3.1-8b-instruct-fp8-fast";

const aiResponse =
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${CLOUDFLARE_API_TOKEN}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          messages: [

            {
              role: "system",
              content:
                systemPrompt
            },

            {
              role: "user",
              content:
                userPrompt
            }

          ],

          temperature: 0.4,

          max_tokens: 7000

        })

      }
    );

      /* ------------------------------------------------------
         API ERROR
      ------------------------------------------------------ */

      if (!aiResponse.ok) {

        const errorText =
          await aiResponse.text();

        throw new Error(
          `Story AI failed (${aiResponse.status}): ${errorText}`
        );
      }

      /* ------------------------------------------------------
         READ AI RESPONSE
      ------------------------------------------------------ */
      const aiData =
    await aiResponse.json();

console.log(
    "Cloudflare Story AI response received."
);

let content =
    aiData?.result?.response;

if (!content) {

    console.error(
        "FULL CLOUDFLARE RESPONSE:",
        JSON.stringify(
            aiData,
            null,
            2
        )
    );

    throw new Error(
        "No story output returned by Cloudflare AI."
    );
}

      /* ------------------------------------------------------
         HANDLE POSSIBLE CONTENT FORMAT
      ------------------------------------------------------ */

      if (
        Array.isArray(content)
      ) {

        content =
          content
            .map(item => {

              if (
                typeof item === "string"
              ) {
                return item;
              }

              return item?.text || "";

            })
            .join("");

      }

      if (
        typeof content !== "string"
      ) {

        content =
          JSON.stringify(content);

      }

      content =
        content.trim();

      console.log(
        "AI story output length:",
        content.length
      );

      /* ------------------------------------------------------
         REMOVE MARKDOWN FENCES IF PRESENT
      ------------------------------------------------------ */

      content =
        content
          .replace(
            /^```json\s*/i,
            ""
          )
          .replace(
            /^```\s*/i,
            ""
          )
          .replace(
            /\s*```$/i,
            ""
          )
          .trim();

      /* ------------------------------------------------------
         EXTRACT JSON OBJECT
      ------------------------------------------------------ */

      const firstBrace =
        content.indexOf("{");

      const lastBrace =
        content.lastIndexOf("}");

      if (
        firstBrace === -1 ||
        lastBrace === -1 ||
        lastBrace <= firstBrace
      ) {

        console.error(
          "INVALID AI OUTPUT:",
          content
        );

        throw new Error(
          "AI did not return a JSON object."
        );
      }

      content =
        content.substring(
          firstBrace,
          lastBrace + 1
        );

      /* ------------------------------------------------------
         PARSE JSON
      ------------------------------------------------------ */

      let story;

      try {

        story =
          JSON.parse(content);

      } catch (jsonError) {

        console.error(
          "JSON PARSE ERROR:",
          jsonError.message
        );

        console.error(
          "AI CONTENT:",
          content
        );

        throw new Error(
          "AI returned malformed JSON."
        );
      }

      /* ------------------------------------------------------
         VALIDATE STORY
      ------------------------------------------------------ */

      if (
        !story ||
        typeof story !== "object"
      ) {
        throw new Error(
          "AI returned an invalid story object."
        );
      }

      if (
        !Array.isArray(
          story.scenes
        )
      ) {
        throw new Error(
          "AI story does not contain a scenes array."
        );
      }

      /* ------------------------------------------------------
         NORMALIZE SCENES
      ------------------------------------------------------ */

      story.scenes =
        story.scenes
          .slice(
            0,
            sceneCount
          )
          .map(
            (scene, index) => ({

              sceneNumber:
                index + 1,

              phase:
                cleanText(
                  scene.phase,
                  "story"
                ),

              title:
                cleanText(
                  scene.title,
                  `Scene ${index + 1}`
                ),

              narration:
                cleanText(
                  scene.narration
                ),

              imagePrompt:
                cleanText(
                  scene.imagePrompt
                ),

              videoPrompt:
                cleanText(
                  scene.videoPrompt ||
                  scene.imagePrompt
                ),

              duration:
                sceneDuration,

              imageURL:
                null,

              imageFileURL:
                null,

              videoURL:
                null,

              videoStatus:
                "waiting"

            })
          );

      /* ------------------------------------------------------
         HARD SCENE COUNT CHECK
      ------------------------------------------------------ */

      if (
        story.scenes.length !== sceneCount
      ) {

        throw new Error(
          `AI returned ${story.scenes.length} scenes instead of ${sceneCount}.`
        );
      }

      /* ------------------------------------------------------
         STORY ID + SETTINGS
      ------------------------------------------------------ */

      story.id =
        `story_${Date.now()}`;

      story.settings = {

        aspectRatio,

        voiceProfile,

        storyLength,

        totalDurationSeconds,

        sceneCount,

        sceneDuration,

        subtitles:
          req.body.subtitles ||
          "off",

        backgroundMusic:
          req.body.backgroundMusic ||
          "none",

        musicVolume:
          Number(
            req.body.musicVolume ||
            20
          )

      };

      console.log(
        `✅ Story generated: ${story.title}`
      );

      console.log(
        `✅ Scenes generated: ${story.scenes.length}`
      );

      console.log(
        "=========================================="
      );

      return res.json({

        success: true,

        story

      });

    } catch (error) {

      console.error(
        "STORY ERROR:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          error.message ||
          "Story generation failed."

      });

    }

  }
);
function generateLocalImage({
  prompt,
  outputPath,
  width = 576,
  height = 320
}) {

  return new Promise(
    (resolve, reject) => {

      const input = JSON.stringify({

        prompt,

        outputPath,

        width,

        height

      });


      console.log(
        "🖼️ Starting local image generation..."
      );


      const pythonProcess =
        spawn(
          LOCAL_IMAGE_PYTHON,
          [
            LOCAL_IMAGE_SCRIPT
          ],
          {
            cwd:
              LOCAL_IMAGE_AI_DIR,

            windowsHide:
              true
          }
        );


      let stdout = "";

      let stderr = "";


      pythonProcess.stdout.on(
        "data",
        (data) => {

          const text =
            data.toString();

          stdout += text;

          console.log(
            "LOCAL IMAGE:",
            text.trim()
          );

        }
      );


      pythonProcess.stderr.on(
        "data",
        (data) => {

          const text =
            data.toString();

          stderr += text;

          console.log(
            "LOCAL IMAGE:",
            text.trim()
          );

        }
      );


      pythonProcess.on(
        "error",
        (error) => {

          reject(error);

        }
      );


      pythonProcess.on(
        "close",
        (code) => {

          if (code !== 0) {

            return reject(
              new Error(
                stderr ||
                `Local image generator exited with code ${code}`
              )
            );

          }


          try {

            const result =
              JSON.parse(
                stdout.trim()
              );


            if (
              !result.success
            ) {

              return reject(
                new Error(
                  "Local image generation failed."
                )
              );

            }


            resolve(result);

          } catch (error) {

            reject(
              new Error(
                `Invalid local image response: ${stdout}`
              )
            );

          }

        }
      );


      pythonProcess.stdin.write(
        input
      );

      pythonProcess.stdin.end();

    }
  );

}


/* ============================================================
   IMAGE GENERATION
   STAGE 2
============================================================ */

app.post(
  "/api/images/generate",
  async (req, res) => {

    try {

      const prompt =
        cleanText(
          req.body.prompt
        );

      const sceneNumber =
        Number(
          req.body.sceneNumber
        ) || 1;

      const storyId =
        cleanText(
          req.body.storyId,
          `story_${Date.now()}`
        );

      const aspectRatio =
        cleanText(
          req.body.aspectRatio,
          "16:9"
        );

      if (!prompt) {

        return res.status(400).json({

          success: false,

          message:
            "Image prompt required."

        });

      }


      /* ------------------------------------------------------
         WONDER TALE IMAGE PROMPT
      ------------------------------------------------------ */

      const finalPrompt = `

${prompt}

VISUAL STYLE:

Beautiful cinematic fantasy animation.

High-quality 3D animated feature film.

Magical fairy-tale atmosphere.

Beautiful expressive characters.

Detailed environment.

Rich colors.

Soft cinematic lighting.

Volumetric light.

Natural depth of field.

Professional movie composition.

Whimsical and visually appealing.

CHARACTER CONSISTENCY:

Keep recurring characters visually consistent.

Maintain the same facial features,
hair, clothing, body proportions,
colors and accessories described in the story.

COMPOSITION:

Create a clear cinematic scene.

Place the main characters prominently.

Create strong foreground,
middle-ground and background depth.

Make the scene visually interesting
for a children's story video.

IMPORTANT:

No text.

No subtitles.

No letters.

No logos.

No watermark.

No UI elements.

No borders.

`.trim();

console.log(
            `Generating CLOUDFARE FLUX image for scene ${sceneNumber}...`
      );


      /* ------------------------------------------------------
         IMAGE SIZE
      ------------------------------------------------------ */

      let width = 1024;

      let height = 576;


      if (
        aspectRatio === "1:1"
      ) {

        width = 1024;

        height = 1024;

      }

      else if (
        aspectRatio === "9:16"
      ) {

        width = 576;

        height = 1024;

      }


      /* ------------------------------------------------------
         CLOUDFLARE API
      ------------------------------------------------------ */

      const accountId =
        process.env.CLOUDFLARE_ACCOUNT_ID;

      const apiToken =
        process.env.CLOUDFLARE_API_TOKEN;

      if (
        !accountId ||
        !apiToken
      ) {

        throw new Error(
          "Cloudflare credentials are missing."
        );

      }


      const model =
        "@cf/black-forest-labs/flux-2-klein-4b";

/* ------------------------------------------------------
   CLOUDFLARE IMAGE GENERATION
   AUTOMATIC SAFETY RETRY
------------------------------------------------------ */

let response;
let data;

let promptToUse =
  finalPrompt;

const maxAttempts =
  2;


for (
  let attempt = 1;
  attempt <= maxAttempts;
  attempt++
) {

  console.log(
    `Cloudflare Flux attempt ${attempt}/${maxAttempts}...`
  );


  const form =
    new FormData();


  form.append(
    "prompt",
    promptToUse
  );


  form.append(
    "width",
    String(width)
  );


  form.append(
    "height",
    String(height)
  );


  response =
    await fetch(

      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,

      {

        method:
          "POST",

        headers: {

          Authorization:
            `Bearer ${apiToken}`

        },

        body:
          form

      }

    );


  /* ----------------------------------------------------
     SUCCESS
  ---------------------------------------------------- */

  if (
    response.ok
  ) {

    data =
      await response.json();

    break;

  }


  /* ----------------------------------------------------
     READ ERROR
  ---------------------------------------------------- */

  const errorText =
    await response.text();


  console.error(
    `Cloudflare attempt ${attempt} failed:`,
    errorText
  );


  /* ----------------------------------------------------
     SAFETY FLAG
  ---------------------------------------------------- */

  const flagged =
    errorText.includes(
      "3030"
    ) ||
    errorText.toLowerCase().includes(
      "output has been flagged"
    );


  if (
    flagged &&
    attempt < maxAttempts
  ) {

    console.log(
      "⚠️ Prompt was flagged. Retrying with safer prompt..."
    );

promptToUse = `
A wholesome family-friendly children's fantasy storybook illustration.

Create a magical, peaceful and friendly scene from a children's fairy tale.
Show fictional fantasy characters in a safe, non-threatening situation.

Beautiful expressive characters.
Detailed magical environment.
Rich colors.
Soft cinematic lighting.
Volumetric light.
Natural depth of field.
Professional movie composition.
Whimsical and visually appealing.

Create a colorful cinematic 3D animated feature-film style illustration.

The characters should appear friendly and safe.
No violence.
No weapons.
No blood.
No injury.
No horror.
No frightening imagery.
No adult themes.

No text.
No subtitles.
No letters.
No logos.
No watermark.
No UI elements.
No borders.
`.trim();

    continue;

  }


  throw new Error(
    `Cloudflare image generation failed (${response.status}): ${errorText}`
  );

}


/* ------------------------------------------------------
   VERIFY RESULT
------------------------------------------------------ */

if (
  !data ||
  !data.result ||
  !data.result.image
) {

  throw new Error(
    "Cloudflare returned no image."
  );

}

     
      /* ------------------------------------------------------
         BASE64 → JPEG
      ------------------------------------------------------ */

      const imageBuffer =
        Buffer.from(
          data.result.image,
          "base64"
        );


      if (
        !imageBuffer.length
      ) {

        throw new Error(
          "Cloudflare returned an empty image."
        );

      }


      /* ------------------------------------------------------
         FILE NAME
      ------------------------------------------------------ */

      const fileName =
        `${safeFileName(
          storyId
        )}-scene-${sceneNumber}-${Date.now()}.jpg`;


      const filePath =
        path.join(
          IMAGE_DIR,
          fileName
        );


      fs.writeFileSync(
        filePath,
        imageBuffer
      );


      /* ------------------------------------------------------
         BROWSER DATA URL
      ------------------------------------------------------ */

      const base64 =
        imageBuffer.toString(
          "base64"
        );


      const dataURL =
        `data:image/jpeg;base64,${base64}`;


      const savedFile =
        `/generated/images/${fileName}`;


      console.log(
        `✅ Cloudflare image saved: ${savedFile}`
      );


      /* ------------------------------------------------------
         RESPONSE
      ------------------------------------------------------ */

      return res.json({

        success:
          true,

        sceneNumber,

        imageURL:
          dataURL,

        savedFile,

        generator:
          "cloudflare-flux-2-klein-4b",

        width,

        height

      });


    } catch (error) {

      console.error(
        "CLOUDFLARE IMAGE ERROR:",
        error
      );


      return res.status(500).json({

        success:
          false,

        message:
          error.message ||
          "Cloudflare image generation failed."

      });

    }
  }

  );

/* ============================================================
   VIDEO GENERATION
   STAGE 3
   CLOUDFLARE IMAGE + FFMPEG
============================================================ */

app.post(
  "/api/videos/generate",
  async (req, res) => {

    try {

      const {

        storyId,

        sceneNumber = 1,

        videoPrompt,

        imageFileURL,

        imageURL,

        duration = 5,

        aspectRatio = "16:9"

      } = req.body;


      /* ------------------------------------------------------
         VALIDATE IMAGE
      ------------------------------------------------------ */

      const imageSource =
        imageFileURL ||
        imageURL;


      if (!imageSource) {

        return res.status(400).json({

          success: false,

          message:
            "Cloudflare scene image is required."

        });

      }


      /* ------------------------------------------------------
         SAFE DURATION
      ------------------------------------------------------ */

      const safeDuration =
        clamp(
          duration,
          2,
          60
        );


      /* ------------------------------------------------------
         RESOLVE IMAGE PATH
      ------------------------------------------------------ */

      const imageFileName =
        path.basename(
          imageSource
        );


      const imagePath =
        path.join(
          IMAGE_DIR,
          imageFileName
        );


      if (!fs.existsSync(imagePath)) {

        throw new Error(
          `Scene image was not found: ${imagePath}`
        );

      }


      /* ------------------------------------------------------
         VIDEO SIZE
      ------------------------------------------------------ */

      let width = 1280;
      let height = 720;


      if (
        aspectRatio === "9:16"
      ) {

        width = 720;
        height = 1280;

      }
      else if (
        aspectRatio === "1:1"
      ) {

        width = 1080;
        height = 1080;

      }


      /* ------------------------------------------------------
         LOGGING
      ------------------------------------------------------ */

      console.log(
        "=========================================="
      );

      console.log(
        `Generating VIDEO for Scene ${sceneNumber}`
      );

      console.log(
        "Generator: Cloudflare Image + FFmpeg"
      );

      console.log(
        `Duration: ${safeDuration}s`
      );

      console.log(
        `Aspect Ratio: ${aspectRatio}`
      );

      console.log(
        `Image: ${imagePath}`
      );


      /* ------------------------------------------------------
         OUTPUT FILE
      ------------------------------------------------------ */

      const safeStory =
        safeFileName(
          storyId ||
          "story"
        );


      const filename =
        `${safeStory}-scene-${sceneNumber}-${Date.now()}.mp4`;


      const outputPath =
        path.join(
          VIDEO_DIR,
          filename
        );


      /* ------------------------------------------------------
         FFmpeg CINEMATIC MOTION
      ------------------------------------------------------ */

      const fps = 25;

      const totalFrames =
        Math.max(
          1,
          Math.ceil(
            safeDuration * fps
          )
        );


      const videoFilter =

        `zoompan=` +

        `z='min(zoom+0.0015,1.12)':` +

        `x='iw/2-(iw/zoom/2)':` +

        `y='ih/2-(ih/zoom/2)':` +

        `d=${totalFrames}:` +

        `s=${width}x${height}:` +

        `fps=${fps}`;


      const ffmpegArgs = [

        "-y",

        "-loop",
        "1",

        "-i",
        imagePath,

        "-vf",
        videoFilter,

        "-t",
        safeDuration.toFixed(3),

        "-an",

        "-c:v",
        "libx264",

        "-preset",
        "medium",

        "-crf",
        "18",

        "-pix_fmt",
        "yuv420p",

        "-movflags",
        "+faststart",

        outputPath

      ];


      console.log(
        "🎬 Creating cinematic scene motion..."
      );


      await runFFmpeg(
        ffmpegArgs
      );


      /* ------------------------------------------------------
         VERIFY OUTPUT
      ------------------------------------------------------ */

      if (
        !fs.existsSync(
          outputPath
        )
      ) {

        throw new Error(
          "FFmpeg completed but scene MP4 was not created."
        );

      }


      const stats =
        fs.statSync(
          outputPath
        );


      if (
        stats.size === 0
      ) {

        throw new Error(
          "Generated scene MP4 is empty."
        );

      }


      /* ------------------------------------------------------
         PUBLIC URL
      ------------------------------------------------------ */

      const publicURL =
        `/generated/videos/${filename}`;


      console.log(
        `✅ VIDEO SAVED: ${publicURL}`
      );

      console.log(
        `Size: ${stats.size} bytes`
      );

      console.log(
        "=========================================="
      );


      /* ------------------------------------------------------
         RESPONSE
      ------------------------------------------------------ */

      return res.json({

        success: true,

        storyId,

        sceneNumber,

        duration:
          safeDuration,

        aspectRatio,

        model:
          "Cloudflare Images + FFmpeg",

        videoURL:
          publicURL,

        savedFile:
          publicURL,

        imageFileURL:
          imageSource,

        message:
          `Scene ${sceneNumber} video generated successfully.`

      });


    } catch (error) {

      console.error(
        "❌ VIDEO GENERATION ERROR:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          error.message ||
          "Video generation failed."

      });

    }

  }
);



/* ============================================================
   AUDIO / VOICE GENERATION
   STAGE 4
============================================================ */

app.post("/api/audio/generate", async (req, res) => {
  try {
    const {
      storyId,
      sceneNumber = 1,
      narration,
      voice = "nova"
    } = req.body;

    if (!narration || !narration.trim()) {
      return res.status(400).json({
        success: false,
        message: "Narration text is required."
      });
    }

    const finalNarration = narration
      .trim()
      .slice(0, 5000);

    const safeStory = safeFileName(
      storyId || "story"
    );

    const filename =
      `${safeStory}-scene-${sceneNumber}-${Date.now()}.mp3`;

    const outputPath =
      path.join(AUDIO_DIR, filename);

    console.log("==========================================");
    console.log(`Generating LOCAL VOICE for Scene ${sceneNumber}`);
    console.log(`Voice profile: ${voice}`);
    console.log(`Output: ${outputPath}`);

    const pythonScript =
      path.join(
        __dirname,
        "..",
        "tts",
        "generate_voice.py"
      );

    const pythonCommand =
      process.platform === "win32"
        ? "python"
        : "python3";

    const pythonProcess = spawn(
      pythonCommand,
      [
        pythonScript,
        finalNarration,
        voice,
        outputPath
      ],
      {
        windowsHide: true
      }
    );

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on(
      "data",
      (data) => {
        stdout += data.toString();
        console.log(
          data.toString().trim()
        );
      }
    );

    pythonProcess.stderr.on(
      "data",
      (data) => {
        stderr += data.toString();
        console.error(
          data.toString().trim()
        );
      }
    );

    pythonProcess.on(
      "error",
      (error) => {
        console.error(
          "Python process error:",
          error
        );

        return res.status(500).json({
          success: false,
          message:
            "Could not start Python TTS engine: " +
            error.message
        });
      }
    );

    pythonProcess.on(
      "close",
      (code) => {

        if (code !== 0) {
          console.error(
            "TTS process failed."
          );

          return res.status(500).json({
            success: false,
            message:
              stderr ||
              stdout ||
              "Voice generation failed."
          });
        }

        if (!fs.existsSync(outputPath)) {
          return res.status(500).json({
            success: false,
            message:
              "Voice generation completed but MP3 file was not created."
          });
        }

        const fileSize =
          fs.statSync(outputPath).size;

        if (fileSize === 0) {
          return res.status(500).json({
            success: false,
            message:
              "Generated MP3 file is empty."
          });
        }

        const publicURL =
          `/generated/audio/${filename}`;

        console.log(
          `VOICE SAVED: ${publicURL}`
        );

        return res.json({
          success: true,
          storyId,
          sceneNumber,
          voice,
          audioURL: publicURL,
          savedFile: publicURL,
          fileSize,
          message:
            `Scene ${sceneNumber} narration generated successfully.`
        });
      }
    );

  } catch (error) {

    console.error(
      "LOCAL AUDIO ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Voice generation failed."
    });
  }
});
app.post("/api/video/render", async (req, res) => {

    try {

        const {
    storyId,
    title,
    scenes,

    storyLength,

    totalDurationSeconds,

    sceneCount,

    sceneDuration,

    aspectRatio = "16:9",

    subtitles = "off",

    backgroundMusic = "none",

    musicVolume = 20

} = req.body;
const requestedStoryLength =
    Number(storyLength);

const targetDuration =
    Number(
        totalDurationSeconds ||
        (
            Number.isFinite(requestedStoryLength) &&
            requestedStoryLength > 0
                ? requestedStoryLength * 60
                : 0
        )
    );

const requestedSceneCount =
    Number(
        sceneCount ||
        scenes?.length ||
        1
    );

const calculatedSceneDuration =
    Number(
        sceneDuration ||
        (
            targetDuration > 0
                ? targetDuration / requestedSceneCount
                : 5
        )
    );

if (
    !Number.isFinite(targetDuration) ||
    targetDuration <= 0
) {
    throw new Error(
        "Invalid target video duration."
    );
}

if (
    !Number.isFinite(calculatedSceneDuration) ||
    calculatedSceneDuration <= 0
) {
    throw new Error(
        "Invalid scene duration."
    );
}

console.log(
    `🎬 MASTER VIDEO DURATION: ${targetDuration.toFixed(2)} seconds`
);

console.log(
    `🎬 SCENE COUNT: ${requestedSceneCount}`
);

console.log(
    `🎬 SCENE DURATION: ${calculatedSceneDuration.toFixed(2)} seconds`
);
const finalDuration =
    Number(
        totalDurationSeconds ||
        (
            Number(storyLength || 1) *
            60
        )
    );

if (
    !Number.isFinite(finalDuration) ||
    finalDuration <= 0
) {
    throw new Error(
        "Invalid final video duration."
    );
}

const finalSceneCount =
    Number(
        sceneCount ||
        scenes?.length ||
        1
    );

const finalSceneDuration =
    Number(
        sceneDuration ||
        (
            finalDuration /
            finalSceneCount
        )
    );

console.log(
    "=========================================="
);

console.log(
    "FINAL VIDEO TIMELINE"
);

console.log(
    `Target duration: ${finalDuration.toFixed(2)} seconds`
);

console.log(
    `Scenes: ${finalSceneCount}`
);

console.log(
    `Scene duration: ${finalSceneDuration.toFixed(2)} seconds`
);

console.log(
    "=========================================="
);

        // --------------------------------------------------
        // VALIDATION
        // --------------------------------------------------

        if (!storyId) {

            return res.status(400).json({
                success: false,
                error: "storyId is required."
            });

        }


        if (!Array.isArray(scenes) || scenes.length === 0) {

            return res.status(400).json({
                success: false,
                error: "At least one scene is required."
            });

        }


        // --------------------------------------------------
        // VIDEO SIZE
        // --------------------------------------------------

        let width = 1280;
        let height = 720;


        if (aspectRatio === "9:16") {

            width = 720;
            height = 1280;

        }


        if (aspectRatio === "1:1") {

            width = 1080;
            height = 1080;

        }


        // --------------------------------------------------
        // OUTPUT DIRECTORY
        // --------------------------------------------------

        if (!fs.existsSync(VIDEO_DIR)) {

            fs.mkdirSync(
                VIDEO_DIR,
                {
                    recursive: true
                }
            );

        }


        const sceneVideoFiles = [];


        // --------------------------------------------------
        // RENDER EVERY SCENE
        // --------------------------------------------------

        for (let i = 0; i < scenes.length; i++) {

            const scene = scenes[i];

            const sceneNumber =
                scene.sceneNumber || i + 1;


            console.log(
                `🎬 Rendering scene ${sceneNumber}/${scenes.length}`
            );


            if (!scene.imageFileURL) {

                throw new Error(
                    `Scene ${sceneNumber} is missing imageFileURL.`
                );

            }


            if (!scene.audioURL) {

                throw new Error(
                    `Scene ${sceneNumber} is missing audioURL.`
                );

            }


            // --------------------------------------------------
            // SAFE FILE NAMES
            // --------------------------------------------------

            const imageFileName =
                path.basename(
                    scene.imageFileURL
                );


            const audioFileName =
                path.basename(
                    scene.audioURL
                );


            const imagePath =
                path.join(
                    IMAGE_DIR,
                    imageFileName
                );


            const audioPath =
                path.join(
                    AUDIO_DIR,
                    audioFileName
                );


            const sceneOutputName =
                `${safeFileName(storyId)}-scene-${sceneNumber}.mp4`;


            const sceneOutputPath =
                path.join(
                    VIDEO_DIR,
                    sceneOutputName
                );


            // --------------------------------------------------
            // RENDER SCENE
            // --------------------------------------------------

          await renderScene({
    imagePath,
    audioPath,
    outputPath: sceneOutputPath,
    width,
    height,
    subtitles: subtitles === "on",
    subtitleText: cleanText(scene.narration || ""),
    backgroundMusic: "none",
    musicVolume: 0,
    targetSceneDuration: calculatedSceneDuration
});

            sceneVideoFiles.push(
                sceneOutputPath
            );

        }


        // --------------------------------------------------
        // CREATE CONCAT FILE
        // --------------------------------------------------

        const concatFilePath =
            path.join(
                VIDEO_DIR,
                `${safeFileName(storyId)}-concat.txt`
            );


        const concatContent =
            sceneVideoFiles
                .map(file => {

                    const normalized =
                        file
                            .replace(/\\/g, "/")
                            .replace(/'/g, "'\\''");

                    return `file '${normalized}'`;

                })
                .join("\n");


        fs.writeFileSync(
            concatFilePath,
            concatContent,
            "utf8"
        );


        // --------------------------------------------------
        // FINAL MP4
        // --------------------------------------------------

        const finalFilename =
            `${safeFileName(storyId)}-final.mp4`;


        const finalVideoPath =
            path.join(
                VIDEO_DIR,
                finalFilename
            );


        console.log(
            "🎞️ Combining scene videos..."
        );


      const concatenatedVideoPath =
    path.join(
        VIDEO_DIR,
        `${storyId}-concatenated.mp4`
    );

await runFFmpeg([
    "-y",

    "-f",
    "concat",

    "-safe",
    "0",

    "-i",
    concatFilePath,

    "-c",
    "copy",

    "-movflags",
    "+faststart",

    concatenatedVideoPath
]);

if (
    !fs.existsSync(concatenatedVideoPath)
) {
    throw new Error(
        "Scene concatenation failed."
    );
}

console.log(
    "✅ All scenes concatenated."
);
let finalRenderPath =
    concatenatedVideoPath;

const musicVideoPath =
    path.join(
        VIDEO_DIR,
        `${storyId}-music.mp4`
    );

if (
    backgroundMusic &&
    backgroundMusic !== "none"
) {

    finalRenderPath =
        await addContinuousBackgroundMusic({
            videoPath:
                concatenatedVideoPath,

            musicStyle:
                backgroundMusic,

            musicVolume,

            targetDuration,

            outputPath:
                musicVideoPath
        });
}
await enforceFinalVideoDuration({
    inputPath: finalRenderPath,
    outputPath: finalVideoPath,
    targetDuration
});
        // --------------------------------------------------
        // CHECK FINAL VIDEO
        // --------------------------------------------------

        if (!fs.existsSync(finalVideoPath)) {

            throw new Error(
                "Final MP4 was not created."
            );

        }


        const stats =
            fs.statSync(
                finalVideoPath
            );


        if (stats.size === 0) {

            throw new Error(
                "Final MP4 is empty."
            );

        }

        // --------------------------------------------------
// GENERATE PERMANENT VIDEO THUMBNAIL
// --------------------------------------------------

let thumbnailURL = "";

try {

    const thumbnailResult =
        await generateVideoThumbnail(
            finalVideoPath,
            storyId
        );

    thumbnailURL =
        thumbnailResult.url;

    console.log(
        "🖼️ Thumbnail created:",
        thumbnailURL
    );

} catch (thumbnailError) {

    console.warn(
        "⚠️ THUMBNAIL GENERATION FAILED:",
        thumbnailError.message
    );

}
        // --------------------------------------------------
        // SAVE TO VIDEO LIBRARY
        // --------------------------------------------------

        const library =
            readVideoLibrary();


        const libraryVideo = {

    id: storyId,

    storyId,

    title:
        title ||
        storyId,

    thumbnailURL:
          thumbnailURL,
    videoURL:
        `/generated/videos/${finalFilename}`,

    fileName:
        finalFilename,

    fileSize:
        stats.size,

    duration:
        targetDuration,

    sceneCount:
        sceneVideoFiles.length,

    aspectRatio,

    subtitles:
        subtitles === "on",

    backgroundMusic,

    musicVolume,

    createdAt:
        new Date().toISOString(),

    status:
        "completed"
};

        // Remove an older version of the same story

        const filteredLibrary =
            library.filter(
                video =>
                    video.id !== storyId
            );


        filteredLibrary.unshift(
            libraryVideo
        );


        writeVideoLibrary(
            filteredLibrary
        );


        // --------------------------------------------------
        // CLEAN TEMP FILE
        // --------------------------------------------------

        try {

            if (
                fs.existsSync(
                    concatFilePath
                )
            ) {

                fs.unlinkSync(
                    concatFilePath
                );

            }

        } catch (cleanupError) {

            console.warn(
                "Could not remove concat file:",
                cleanupError.message
            );

        }
// --------------------------------------------------
// SMART STORAGE CLEANUP
// --------------------------------------------------
// Final video has already been created, validated,
// and saved to the library.
// Now remove temporary images, audio,
// and intermediate video files.

try {

    const cleanupResult =
        cleanupAfterSuccessfulRender(
            storyId
        );

    console.log(
        "SMART STORAGE CLEANUP:",
        cleanupResult
    );

} catch (cleanupError) {

    console.warn(
        "SMART STORAGE CLEANUP FAILED:",
        cleanupError.message
    );

}

        // --------------------------------------------------
        // RESPONSE
        // --------------------------------------------------

        console.log(
            "=========================================="
        );

        console.log(
            "🎉 FINAL VIDEO CREATED"
        );

        console.log(
            "File:",
            finalVideoPath
        );

        console.log(
            "Size:",
            stats.size,
            "bytes"
        );

        console.log(
            "Subtitles:",
            subtitles === "on"
                ? "ON"
                : "OFF"
        );

        console.log(
            "=========================================="
        );


        return res.json({

            success: true,

            storyId,

            videoURL:
                `/generated/videos/${finalFilename}`,

            fileName:
                finalFilename,

            fileSize:
                stats.size,

            sceneCount:
                sceneVideoFiles.length,

            aspectRatio,

            subtitles:
                subtitles === "on"

        });

    } catch (error) {

        console.error(
            "❌ FINAL VIDEO RENDER ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            error:
                error.message ||
                "Failed to render final video."

        });

    }

});

/* ============================================================
   VIDEO LIBRARY
   STAGE 6
============================================================ */


/* ------------------------------------------------------------
   GET ALL VIDEOS
------------------------------------------------------------ */

app.get(
  "/api/library",
  (req, res) => {

    try {

      const library =
        readVideoLibrary();

      return res.json({

        success: true,

        videos:
          library

      });

    } catch (error) {

      console.error(
        "LIBRARY ERROR:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Could not load video library."

      });

    }

  }
);


/* ------------------------------------------------------------
   GET ONE VIDEO
------------------------------------------------------------ */

app.get(
  "/api/library/:id",
  (req, res) => {

    try {

      const library =
        readVideoLibrary();

      const video =
        library.find(
          item =>
            item.id === req.params.id
        );

      if (!video) {

        return res.status(404).json({

          success: false,

          message:
            "Video not found."

        });

      }

      return res.json({

        success: true,

        video

      });

    } catch (error) {

      console.error(
        "LIBRARY ITEM ERROR:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Could not load video."

      });

    }

  }
);


/* ------------------------------------------------------------
   DELETE VIDEO
------------------------------------------------------------ */

app.delete(
  "/api/library/:id",
  (req, res) => {

    try {

      const library =
        readVideoLibrary();

      const video =
        library.find(
          item =>
            item.id === req.params.id
        );

      if (!video) {

        return res.status(404).json({

          success: false,

          message:
            "Video not found."

        });

      }


      /* Delete final video */

      if (video.videoURL) {

        const filename =
          path.basename(
            video.videoURL
          );

        const videoPath =
          path.join(
            VIDEO_DIR,
            filename
          );

        if (
          fs.existsSync(
            videoPath
          )
        ) {

          fs.unlinkSync(
            videoPath
          );

        }

      }


      /* Remove library entry */

      const updatedLibrary =
        library.filter(
          item =>
            item.id !== req.params.id
        );


      writeVideoLibrary(
        updatedLibrary
      );


      return res.json({

        success: true,

        message:
          "Video deleted successfully."

      });

    } catch (error) {

      console.error(
        "LIBRARY DELETE ERROR:",
        error
      );

      return res.status(500).json({

        success: false,

        message:
          "Could not delete video."

      });

    }

  }
);

// ==========================================
// UPDATE LIBRARY WITH YOUTUBE INFORMATION
// ==========================================

app.patch("/api/library/:id/youtube", (req, res) => {
    try {

        const {
            youtubeVideoId,
            youtubeURL,
            thumbnailUploaded = false
        } = req.body;

        if (!youtubeVideoId || !youtubeURL) {
            return res.status(400).json({
                success: false,
                message:
                    "YouTube video ID and URL are required."
            });
        }

        const library =
            readVideoLibrary();

        const videoIndex =
            library.findIndex(
                video =>
                    video.id === req.params.id
            );

        if (videoIndex === -1) {
            return res.status(404).json({
                success: false,
                message:
                    "Video not found in library."
            });
        }

        library[videoIndex].youtube = {
            videoId:
                youtubeVideoId,

            url:
                youtubeURL,

            thumbnailUploaded:
                !!thumbnailUploaded,

            publishedAt:
                new Date().toISOString()
        };

        writeVideoLibrary(library);

        return res.json({
            success: true,
            message:
                "YouTube information saved.",
            video:
                library[videoIndex]
        });

    } catch (error) {

        console.error(
            "LIBRARY YOUTUBE UPDATE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Could not save YouTube information."
        });
    }
});
// ============================================================
// YOUTUBE OAUTH — STAGE 7
// ============================================================

app.get("/auth/youtube", (req, res) => {

     console.log("🔥 YOUTUBE AUTH ROUTE HIT");
    try {

        const authUrl =
            getYouTubeAuthUrl();

        return res.redirect(authUrl);

    } catch (error) {

        console.error(
            "YOUTUBE AUTH ERROR:",
            error
        );

        return res.status(500).send(
            "Could not start YouTube authentication."
        );

    }

});


app.get(
    "/auth/youtube/callback",
    async (req, res) => {

        try {

            const { code } =
                req.query;


            if (!code) {

                return res.status(400).send(
                    "Authorization code was not provided."
                );

            }


            const tokens =
                await exchangeCodeForTokens(
                    code
                );


            console.log(
                "YouTube OAuth tokens received."
            );


            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>WonderTale AI</title>
                </head>

                <body
                    style="
                        font-family: Arial;
                        text-align: center;
                        padding: 60px;
                    "
                >

                    <h1>
                        🎉 YouTube Connected!
                    </h1>

                    <p>
                        Your YouTube account has been
                        successfully connected to WonderTale AI.
                    </p>

                    <p>
                        You can close this window.
                    </p>

                </body>
                </html>
            `);

        } catch (error) {

            console.error(
                "YOUTUBE CALLBACK ERROR:",
                error
            );

            return res.status(500).send(
                "YouTube authentication failed."
            );

        }

    }
);
app.get("/api/youtube/status", async (req, res) => {
    try {
        const youtubeAuth = getAuthenticatedYouTubeClient();

        if (!youtubeAuth) {
            return res.json({
                success: true,
                connected: false
            });
        }

        const youtube = google.youtube({
            version: "v3",
            auth: youtubeAuth
        });

        const response = await youtube.channels.list({
            part: ["snippet"],
            mine: true
        });

        const channel = response.data.items?.[0];

        if (!channel) {
            return res.json({
                success: true,
                connected: false,
                message: "No YouTube channel found."
            });
        }

        return res.json({
            success: true,
            connected: true,
            channel: {
                id: channel.id,
                title: channel.snippet.title,
                thumbnail:
                    channel.snippet.thumbnails?.default?.url || null
            }
        });

    } catch (error) {
        console.error("YOUTUBE STATUS ERROR:", error);

        return res.status(500).json({
            success: false,
            connected: false,
            message: error.message
        });
    }
});
// ==========================================
// YOUTUBE VIDEO UPLOAD
// ==========================================

app.post("/api/youtube/upload", async (req, res) => {
    try {
        const {
            videoFileName,
            title,
            description,
            tags,
            privacyStatus = "unlisted",
            thumbnailFileName
        } = req.body;

        if (!videoFileName) {
            return res.status(400).json({
                success: false,
                message: "videoFileName is required."
            });
        }

        const allowedPrivacy = [
            "private",
            "unlisted",
            "public"
        ];

        if (!allowedPrivacy.includes(privacyStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid privacy status."
            });
        }

        // --------------------------------------
        // VIDEO FILE
        // --------------------------------------

        const safeVideoFileName =
            path.basename(videoFileName);

        const videoPath = path.join(
            VIDEO_DIR,
            safeVideoFileName
        );

        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({
                success: false,
                message: "Video file not found."
            });
        }

        // --------------------------------------
        // UPLOAD VIDEO
        // --------------------------------------

        const result =
            await uploadVideoToYouTube({
                videoPath,
                title,
                description,
                tags,
                privacyStatus
            });

        // --------------------------------------
        // OPTIONAL THUMBNAIL
        // --------------------------------------

        let thumbnailUploaded = false;

        if (thumbnailFileName) {

            const safeThumbnailFileName =
                path.basename(
                    thumbnailFileName
                );

            const thumbnailPath =
                path.join(
                    IMAGE_DIR,
                    safeThumbnailFileName
                );

            if (
                fs.existsSync(
                    thumbnailPath
                )
            ) {

                try {

                    await setYouTubeThumbnail({
                        videoId:
                            result.videoId,

                        thumbnailPath
                    });

                    thumbnailUploaded = true;

                } catch (thumbnailError) {

                    console.error(
                        "⚠️ THUMBNAIL UPLOAD ERROR:",
                        thumbnailError.message
                    );

                }
            }
        }

        return res.json({
            success: true,

            message:
                "Video uploaded successfully!",

            videoId:
                result.videoId,

            videoURL:
                result.videoURL,

            thumbnailUploaded
        });

    } catch (error) {

        console.error(
            "❌ YOUTUBE UPLOAD ERROR:",
            error
        );

        return res.status(500).json({
            success: false,

            message:
                error.message ||
                "YouTube upload failed."
        });
    }
});
/* ============================================================
   FALLBACK ROUTE
============================================================ */

app.use(
  (req, res) => {

    if (
      req.path.startsWith(
        "/api/"
      )
    ) {

      return res.status(404).json({

        success: false,

        message:
          "API endpoint not found."

      });

    }


    res.sendFile(
      path.join(
        PUBLIC_DIR,
        "index.html"
      )
    );

  }
);


/* ============================================================
   SERVER START
============================================================ */

const server = app.listen(PORT,"0.0.0.0", () => {
    console.log("\n==========================================");
    console.log("       WONDER TALE AI STUDIO BACKEND");
    console.log("==========================================");
    console.log(`Server: http://localhost:${PORT}`);
    
    console.log("Image Model: Cloudflare FLUX");
    console.log("Video Generation: Cloudflare + FFmpeg");
    console.log("==========================================\n");
    console.log("✅ SERVER IS LISTENING");
});

server.on("close", () => {
    console.log("❌ SERVER CLOSED");
});

server.on("error", (error) => {
    console.error("❌ SERVER ERROR:", error);
});