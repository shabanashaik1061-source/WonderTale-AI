const fs = require("fs");
const path = require("path");

const GENERATED_DIR = path.join(__dirname, "..", "..", "generated");

const VIDEO_DIR = path.join(GENERATED_DIR, "videos");
const IMAGE_DIR = path.join(GENERATED_DIR, "images");
const AUDIO_DIR = path.join(GENERATED_DIR, "audio");
const MUSIC_DIR = path.join(GENERATED_DIR, "music");
const STORY_DIR = path.join(GENERATED_DIR, "stories");
const THUMBNAIL_DIR = path.join(GENERATED_DIR, "thumbnails");

const TEMPORARY_DIRS = [
    IMAGE_DIR,
    AUDIO_DIR
];

const INTERMEDIATE_VIDEO_SUFFIXES = [
    "-scene-",
    "-concatenated.mp4",
    "-music.mp4"
];

const TEMPORARY_VIDEO_EXTENSIONS = [
    ".txt"
];

function ensureDirectories() {
    const directories = [
        GENERATED_DIR,
        VIDEO_DIR,
        IMAGE_DIR,
        AUDIO_DIR,
        MUSIC_DIR,
        STORY_DIR,
        THUMBNAIL_DIR
    ];

    for (const directory of directories) {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }
    }
}

function getDirectorySize(directory) {
    if (!fs.existsSync(directory)) {
        return 0;
    }

    let total = 0;

    const items = fs.readdirSync(directory, {
        withFileTypes: true
    });

    for (const item of items) {
        const itemPath = path.join(directory, item.name);

        if (item.isDirectory()) {
            total += getDirectorySize(itemPath);
        } else {
            try {
                total += fs.statSync(itemPath).size;
            } catch {
                // Ignore files that disappear while scanning.
            }
        }
    }

    return total;
}

function getFileCount(directory) {
    if (!fs.existsSync(directory)) {
        return 0;
    }

    let count = 0;

    const items = fs.readdirSync(directory, {
        withFileTypes: true
    });

    for (const item of items) {
        const itemPath = path.join(directory, item.name);

        if (item.isDirectory()) {
            count += getFileCount(itemPath);
        } else {
            count++;
        }
    }

    return count;
}

function getStorageInfo() {
    ensureDirectories();

    const videosSize = getDirectorySize(VIDEO_DIR);
    const imagesSize = getDirectorySize(IMAGE_DIR);
    const audioSize = getDirectorySize(AUDIO_DIR);
    const musicSize = getDirectorySize(MUSIC_DIR);
    const storiesSize = getDirectorySize(STORY_DIR);
    const thumbnailsSize = getDirectorySize(THUMBNAIL_DIR);

    const totalSize =
        videosSize +
        imagesSize +
        audioSize +
        musicSize +
        storiesSize +
        thumbnailsSize;

    return {
        totalBytes: totalSize,

        videos: {
            bytes: videosSize,
            files: getFileCount(VIDEO_DIR)
        },

        images: {
            bytes: imagesSize,
            files: getFileCount(IMAGE_DIR)
        },

        audio: {
            bytes: audioSize,
            files: getFileCount(AUDIO_DIR)
        },

        music: {
            bytes: musicSize,
            files: getFileCount(MUSIC_DIR)
        },

        stories: {
            bytes: storiesSize,
            files: getFileCount(STORY_DIR)
        },

        thumbnails: {
            bytes: thumbnailsSize,
            files: getFileCount(THUMBNAIL_DIR)
        }
    };
}

function deleteFileSafe(filePath) {
    if (!fs.existsSync(filePath)) {
        return false;
    }

    try {
        fs.unlinkSync(filePath);
        return true;
    } catch (error) {
        console.error(
            "Failed to delete:",
            filePath,
            error.message
        );

        return false;
    }
}

/**
 * Delete temporary images and audio.
 *
 * IMPORTANT:
 * This should only be called AFTER the final MP4
 * has been successfully created and validated.
 */
function cleanupTemporaryMedia() {
    let deleted = 0;

    for (const directory of TEMPORARY_DIRS) {
        if (!fs.existsSync(directory)) {
            continue;
        }

        const files = fs.readdirSync(directory);

        for (const file of files) {
            const filePath = path.join(directory, file);

            if (fs.statSync(filePath).isFile()) {
                if (deleteFileSafe(filePath)) {
                    deleted++;
                }
            }
        }
    }

    return deleted;
}

/**
 * Delete intermediate files belonging to one story.
 *
 * Keeps:
 *   story-XXXX-final.mp4
 *
 * Deletes:
 *   story-XXXX-scene-*.mp4
 *   story-XXXX-concatenated.mp4
 *   story-XXXX-music.mp4
 *   story-XXXX-concat.txt
 */
function cleanupStoryIntermediates(storyId) {
    if (!storyId || !fs.existsSync(VIDEO_DIR)) {
        return 0;
    }

    let deleted = 0;

    const files = fs.readdirSync(VIDEO_DIR);

    for (const file of files) {

        const belongsToStory =
            file.startsWith(`${storyId}-`) ||
            file.startsWith(`${storyId}_`);

        if (!belongsToStory) {
            continue;
        }

        // NEVER delete the final video.
        if (file === `${storyId}-final.mp4`) {
            continue;
        }

        const isIntermediate =
            INTERMEDIATE_VIDEO_SUFFIXES.some(
                suffix => file.includes(suffix)
            ) ||
            TEMPORARY_VIDEO_EXTENSIONS.some(
                extension => file.endsWith(extension)
            );

        if (!isIntermediate) {
            continue;
        }

        const filePath = path.join(
            VIDEO_DIR,
            file
        );

        if (deleteFileSafe(filePath)) {
            deleted++;
        }
    }

    return deleted;
}

/**
 * Cleanup everything temporary for one completed story.
 *
 * IMPORTANT:
 * Call this ONLY after final.mp4 has been
 * successfully created and validated.
 */
function cleanupAfterSuccessfulRender(storyId) {

    const deletedVideoFiles =
        cleanupStoryIntermediates(storyId);

    const deletedMediaFiles =
        cleanupTemporaryMedia();

    return {
        deletedVideoFiles,
        deletedMediaFiles,
        totalDeleted:
            deletedVideoFiles +
            deletedMediaFiles
    };
}

/**
 * Delete one final video.
 */
function deleteFinalVideo(filename) {

    if (!filename) {
        throw new Error(
            "Video filename is required."
        );
    }

    // Security: only allow a plain filename.
    if (
        filename.includes("/") ||
        filename.includes("\\") ||
        filename.includes("..")
    ) {
        throw new Error(
            "Invalid video filename."
        );
    }

    // Only final.mp4 files can be deleted here.
    if (!filename.endsWith("-final.mp4")) {
        throw new Error(
            "Only final WonderTale videos can be deleted."
        );
    }

    const filePath =
        path.join(VIDEO_DIR, filename);

    if (!fs.existsSync(filePath)) {
        throw new Error(
            "Video not found."
        );
    }

    fs.unlinkSync(filePath);

    return true;
}

module.exports = {
    getStorageInfo,
    cleanupTemporaryMedia,
    cleanupStoryIntermediates,
    cleanupAfterSuccessfulRender,
    deleteFinalVideo
};
