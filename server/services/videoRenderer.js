const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");


/* =========================================================
   FFmpeg Runner
========================================================= */

function runFFmpeg(args) {

    return new Promise((resolve, reject) => {

        const ffmpeg = spawn(
            "ffmpeg",
            args,
            {
                windowsHide: true
            }
        );

        let stderr = "";

        ffmpeg.stderr.on(
            "data",
            data => {
                stderr += data.toString();
            }
        );

        ffmpeg.on(
            "error",
            error => {
                reject(error);
            }
        );

        ffmpeg.on(
            "close",
            code => {

                if (code === 0) {

                    resolve();

                } else {

                    reject(
                        new Error(
                            `FFmpeg failed with code ${code}\n${stderr}`
                        )
                    );

                }

            }
        );

    });

}


/* =========================================================
   Directories
========================================================= */

const ROOT_DIR =
    path.join(
        __dirname,
        "..",
        ".."
    );


const GENERATED_DIR =
    path.join(
        ROOT_DIR,
        "generated"
    );


const MUSIC_DIR =
    path.join(
        GENERATED_DIR,
        "music"
    );


if (!fs.existsSync(MUSIC_DIR)) {

    fs.mkdirSync(
        MUSIC_DIR,
        {
            recursive: true
        }
    );

}


/* =========================================================
   Background Music Profiles

   These are generated locally with FFmpeg.
   No external API/payment is required.
========================================================= */

const MUSIC_PROFILES = {

    fantasy: [
        261.63,
        329.63,
        392.00
    ],

    adventure: [
        220.00,
        277.18,
        329.63
    ],

    calm: [
        196.00,
        246.94,
        293.66
    ],

    suspense: [
        110.00,
        116.54,
        123.47
    ]

};


/* =========================================================
   Create Background Music

   Creates a 60-second looping ambient track.
========================================================= */

async function createBackgroundMusic(style) {

    const musicDir = path.join(
        __dirname,
        "..",
        "..",
        "generated",
        "music"
    );

    if (!fs.existsSync(musicDir)) {
        fs.mkdirSync(musicDir, {
            recursive: true
        });
    }

    const frequencies =
        MUSIC_PROFILES[style] ||
        MUSIC_PROFILES.calm;

    const outputPath =
        path.join(
            musicDir,
            `${style}-background.mp3`
        );

    console.log(
        `🎵 Creating ${style} background music...`
    );

    const filterComplex = [
        `[0:a]volume=0.35[a0]`,
        `[1:a]volume=0.25[a1]`,
        `[2:a]volume=0.20[a2]`,
        `[a0][a1][a2]amix=inputs=3:duration=longest:dropout_transition=0[mix]`,
        `[mix]lowpass=f=1800,afade=t=in:st=0:d=2,afade=t=out:st=55:d=5[out]`
    ].join(";");

    const args = [
        "-y",

        "-f",
        "lavfi",
        "-i",
        `sine=frequency=${frequencies[0]}:duration=60`,

        "-f",
        "lavfi",
        "-i",
        `sine=frequency=${frequencies[1]}:duration=60`,

        "-f",
        "lavfi",
        "-i",
        `sine=frequency=${frequencies[2]}:duration=60`,

        "-filter_complex",
        filterComplex,

        "-map",
        "[out]",

        "-t",
        "60",

        "-c:a",
        "libmp3lame",

        "-b:a",
        "128k",

        outputPath
    ];

    await runFFmpeg(args);

    if (!fs.existsSync(outputPath)) {
        throw new Error(
            "Background music was not created."
        );
    }

    console.log(
        `✅ ${style} background music ready`
    );

    return outputPath;
}


/* =========================================================
========================================================= *//* =========================================================
   Escape subtitle text
========================================================= */

function escapeSubtitleText(text) {

    return String(text || "")
        .replace(/\\/g, "\\\\")
        .replace(/:/g, "\\:")
        .replace(/'/g, "\\'")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");

}


/* =========================================================
   Wrap subtitle text
========================================================= */

function wrapSubtitleText(
    text,
    maxCharacters = 52
) {

    const words =
        String(text || "")
            .replace(/\s+/g, " ")
            .trim()
            .split(" ");


    const lines = [];

    let currentLine = "";


    for (const word of words) {

        if (
            currentLine.length +
            word.length +
            1 <=
            maxCharacters
        ) {

            currentLine +=
                currentLine
                    ? ` ${word}`
                    : word;

        } else {

            if (currentLine) {

                lines.push(
                    currentLine
                );

            }

            currentLine = word;

        }

    }


    if (currentLine) {

        lines.push(
            currentLine
        );

    }


    /*
     * Keep subtitles readable.
     */

    return lines
        .slice(0, 4)
        .join("\\N");

}


/* =========================================================
   Create ASS subtitle file
========================================================= */

function createSubtitleFile({
    subtitleText,
    outputPath,
    width,
    height
}) {

    const wrappedText =
        wrapSubtitleText(
            subtitleText
        );


    const escapedText =
        escapeSubtitleText(
            wrappedText
        );


    const fontSize =
        Math.max(
            32,
            Math.round(
                width * 0.032
            )
        );


    const assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: WonderTale,Arial,${fontSize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H99000000,1,0,0,0,100,100,0,0,1,3,1,2,50,50,45,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,9:59:59.00,WonderTale,,0,0,0,,${escapedText}
`;


    fs.writeFileSync(
        outputPath,
        assContent,
        "utf8"
    );

}
function getMediaDuration(filePath) {

    return new Promise((resolve, reject) => {

        const ffprobe = spawn(
            "ffprobe",
            [
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                filePath
            ],
            {
                windowsHide: true
            }
        );


        let output = "";
        let errorOutput = "";


        ffprobe.stdout.on(
            "data",
            data => {

                output +=
                    data.toString();

            }
        );


        ffprobe.stderr.on(
            "data",
            data => {

                errorOutput +=
                    data.toString();

            }
        );


        ffprobe.on(
            "error",
            error => {

                reject(error);

            }
        );


        ffprobe.on(
            "close",
            code => {

                if (code !== 0) {

                    reject(
                        new Error(
                            `FFprobe failed with code ${code}\n${errorOutput}`
                        )
                    );

                    return;

                }


                const duration =
                    Number(
                        output.trim()
                    );


                if (
                    !Number.isFinite(duration) ||
                    duration <= 0
                ) {

                    reject(
                        new Error(
                            "Invalid media duration."
                        )
                    );

                    return;

                }


                resolve(duration);

            }
        );

    });

}

/* =========================================================
   Render Scene
========================================================= */

async function renderScene({

    imagePath,
    audioPath,
    outputPath,

    width = 1280,
    height = 720,

    subtitles = false,
    subtitleText = "",

    backgroundMusic = "none",
    musicVolume = 20,

    targetSceneDuration = null

}) {

    /* -----------------------------------------------------
       Validate target scene duration
    ----------------------------------------------------- */

    targetSceneDuration =
        Number(targetSceneDuration);

    if (
        !Number.isFinite(targetSceneDuration) ||
        targetSceneDuration <= 0
    ) {

        throw new Error(
            "Invalid scene duration."
        );

    }

    console.log(
        `⏱️ Target scene duration: ${targetSceneDuration.toFixed(2)} seconds`
    );


    /* -----------------------------------------------------
       Validate image
    ----------------------------------------------------- */

    if (!fs.existsSync(imagePath)) {

        throw new Error(
            `Image not found: ${imagePath}`
        );

    }
    /* -----------------------------------------------------
       Validate narration
    ----------------------------------------------------- */

    if (!fs.existsSync(audioPath)) {

        throw new Error(
            `Audio not found: ${audioPath}`
        );

    }


    console.log(
        "=========================================="
    );

    console.log(
        "🎬 RENDERING SCENE"
    );

    console.log(
        "Image:",
        imagePath
    );

    console.log(
        "Narration:",
        audioPath
    );

    console.log(
        "Subtitles:",
        subtitles
            ? "ON"
            : "OFF"
    );

    console.log(
        "Music:",
        backgroundMusic
    );

    console.log(
        "Music Volume:",
        musicVolume
    );

    console.log(
        "Size:",
        `${width}x${height}`
    );

    console.log(
        "=========================================="
    );


    /* -----------------------------------------------------
       Get exact narration duration
    ----------------------------------------------------- */

    const narrationDuration =
        await getMediaDuration(audioPath);


    console.log(
        `🎙️ Narration duration: ${narrationDuration.toFixed(2)} seconds`
    );


    if (
        !narrationDuration ||
        narrationDuration <= 0
    ) {

        throw new Error(
            "Could not determine narration duration."
        );

    }


    /* -----------------------------------------------------
       Generate / load background music
    ----------------------------------------------------- */

    let musicPath = null;


    if (
        backgroundMusic &&
        backgroundMusic !== "none"
    ) {

        musicPath =
            await createBackgroundMusic(
                backgroundMusic
            );

    }


    /* -----------------------------------------------------
       Video filter
       
       IMPORTANT:
       Do NOT use zoompan with a huge fixed frame count.
       The narration duration controls the scene length.
    ----------------------------------------------------- */

    const fps = 30;

const totalFrames =
    Math.max(
        1,
        Math.ceil(targetSceneDuration * fps)
    );


const videoFilters = [

    /*
     * Create a slightly larger image first.
     * This gives zoompan room to move.
     */

    `scale=${Math.round(width * 1.15)}:${Math.round(height * 1.15)}:force_original_aspect_ratio=increase`,

    `crop=${Math.round(width * 1.15)}:${Math.round(height * 1.15)}`,

    /*
     * Cinematic slow zoom + horizontal movement.
     */

    `zoompan=z='min(zoom+0.0008,1.15)':x='if(eq(on,1),0,x+0.15)':y='(ih-oh)/2':d=${totalFrames}:s=${width}x${height}:fps=${fps}`

];


    /* -----------------------------------------------------
       Subtitle file
    ----------------------------------------------------- */

    let subtitleFile = null;


    if (
        subtitles &&
        subtitleText &&
        subtitleText.trim()
    ) {

        subtitleFile =
            path.join(
                path.dirname(outputPath),
                `${path.basename(
                    outputPath,
                    path.extname(outputPath)
                )}.ass`
            );


        createSubtitleFile({

            subtitleText,

            outputPath:
                subtitleFile,

            width,

            height

        });


        const subtitlePath =
            subtitleFile
                .replace(/\\/g, "/")
                .replace(/:/g, "\\:");


        videoFilters.push(
            `subtitles='${subtitlePath}'`
        );

    }


    videoFilters.push(
        "format=yuv420p"
    );


    const videoFilter =
        videoFilters.join(",");


    /* -----------------------------------------------------
       AUDIO + VIDEO
    ----------------------------------------------------- */

    let args;


    if (musicPath) {

        /*
         * Narration = input 1
         * Music     = input 2
         */

        const volume =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(musicVolume) || 0
                )
            ) / 100;


        const musicVolumeFilter =
            volume.toFixed(2);


        const audioFilter = [

            `[1:a]volume=1.0[narration]`,

            `[2:a]volume=${musicVolumeFilter}[music]`,

            `[narration][music]amix=inputs=2:duration=first:dropout_transition=2[mixed]`,

            `[mixed]loudnorm=I=-16:TP=-1.5:LRA=11[a]`

        ].join(";");


        args = [

            "-y",

            /*
             * Loop the image.
             */

            "-loop",
            "1",

            "-i",
            imagePath,

            /*
             * Narration.
             */

            "-i",
            audioPath,

            /*
             * Loop background music.
             */

            "-stream_loop",
            "-1",

            "-i",
            musicPath,

            "-filter_complex",

            `[0:v]${videoFilter}[v];${audioFilter}`,

            "-map",
            "[v]",

            "-map",
            "[a]",

            /*
             * EXACT narration duration.
             */

            "-t",
targetSceneDuration.toFixed(3),

            "-c:v",
            "libx264",

            "-preset",
            "medium",

            "-crf",
            "23",

            "-c:a",
            "aac",

            "-b:a",
            "192k",

            "-movflags",
            "+faststart",

            outputPath

        ];

    } else {

        /*
         * No music.
         */

        args = [

            "-y",

            /*
             * Loop image.
             */

            "-loop",
            "1",

            "-i",
            imagePath,

            /*
             * Narration.
             */

            "-i",
            audioPath,

            "-filter_complex",

            `[0:v]${videoFilter}[v]`,

            "-map",
            "[v]",

            "-map",
            "1:a",

            /*
             * EXACT narration duration.
             */

            "-t",
            targetSceneDuration.toFixed(3),

            "-c:v",
            "libx264",

            "-preset",
            "medium",

            "-crf",
            "23",

            "-c:a",
            "aac",

            "-b:a",
            "192k",

            "-movflags",
            "+faststart",

            outputPath

        ];

    }


    /* -----------------------------------------------------
       Run FFmpeg
    ----------------------------------------------------- */

    try {

        await runFFmpeg(
            args
        );

    } finally {

        /*
         * Remove temporary subtitle file.
         */

        if (
            subtitleFile &&
            fs.existsSync(subtitleFile)
        ) {

            try {

                fs.unlinkSync(
                    subtitleFile
                );

            } catch (error) {

                console.warn(
                    "Could not remove subtitle file:",
                    error.message
                );

            }

        }

    }


    /* -----------------------------------------------------
       Validate output
    ----------------------------------------------------- */

    if (
        !fs.existsSync(outputPath)
    ) {

        throw new Error(
            "FFmpeg completed but scene video was not created."
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
            "Generated scene video is empty."
        );

    }


    console.log(
        "✅ Scene rendered successfully"
    );

    console.log(
        "Scene duration:",
        targetSceneDuration.toFixed(3),
        "seconds"
    );

    console.log(
        "File size:",
        stats.size,
        "bytes"
    );


    return outputPath;

}
/* =========================================================
   Export
========================================================= */

module.exports = {

    renderScene

};
