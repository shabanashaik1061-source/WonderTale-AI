const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const GENERATED_DIR =
    path.join(__dirname, "..", "..", "generated");

const THUMBNAIL_DIR =
    path.join(GENERATED_DIR, "thumbnails");

function ensureThumbnailDirectory() {

    if (!fs.existsSync(THUMBNAIL_DIR)) {

        fs.mkdirSync(
            THUMBNAIL_DIR,
            { recursive: true }
        );

    }

}

function generateVideoThumbnail(
    videoPath,
    storyId
) {

    return new Promise(
        (resolve, reject) => {

            try {

                ensureThumbnailDirectory();

                if (!fs.existsSync(videoPath)) {

                    return reject(
                        new Error(
                            "Final video not found."
                        )
                    );

                }

                if (!storyId) {

                    return reject(
                        new Error(
                            "Story ID is required."
                        )
                    );

                }

                const thumbnailFilename =
                    `${storyId}-thumbnail.jpg`;

                const thumbnailPath =
                    path.join(
                        THUMBNAIL_DIR,
                        thumbnailFilename
                    );

                const ffmpeg =
                    spawn(
                        "ffmpeg",
                        [
                            "-y",

                            "-ss",
                            "00:00:02",

                            "-i",
                            videoPath,

                            "-frames:v",
                            "1",

                            "-q:v",
                            "2",

                            thumbnailPath
                        ]
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

                        if (
                            code !== 0 ||
                            !fs.existsSync(
                                thumbnailPath
                            )
                        ) {

                            return reject(
                                new Error(
                                    `Thumbnail generation failed: ${stderr}`
                                )
                            );

                        }

                        resolve({
                            filename:
                                thumbnailFilename,

                            path:
                                thumbnailPath,

                            url:
                                `/generated/thumbnails/${thumbnailFilename}`
                        });

                    }
                );

            } catch (error) {

                reject(error);

            }

        }
    );

}

module.exports = {
    generateVideoThumbnail
};