const express = require("express");

const {
    getStorageInfo,
    cleanupTemporaryMedia,
    deleteFinalVideo
} = require("../services/storageService");

const router = express.Router();

/*
 * GET STORAGE INFORMATION
 *
 * Returns total storage, video count/size,
 * temporary media count/size, etc.
 */
router.get("/", (req, res) => {

    try {

        const storage =
            getStorageInfo();

        res.json({
            success: true,
            storage
        });

    } catch (error) {

        console.error(
            "STORAGE INFO ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            error: "Unable to read storage information."
        });
    }
});


/*
 * DELETE TEMPORARY IMAGES + AUDIO
 *
 * This is safe to run because it does NOT
 * touch final videos.
 */
router.delete("/temporary", (req, res) => {

    try {

        const deleted =
            cleanupTemporaryMedia();

        const storage =
            getStorageInfo();

        res.json({
            success: true,
            deleted,
            storage
        });

    } catch (error) {

        console.error(
            "TEMPORARY CLEANUP ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            error: "Unable to clean temporary files."
        });
    }
});


/*
 * DELETE ONE FINAL VIDEO
 *
 * Example:
 * DELETE /api/storage/video/story-123-final.mp4
 */
router.delete("/video/:filename", (req, res) => {

    try {

        const filename =
            req.params.filename;

        deleteFinalVideo(filename);

        const storage =
            getStorageInfo();

        res.json({
            success: true,
            message: "Video deleted successfully.",
            filename,
            storage
        });

    } catch (error) {

        console.error(
            "VIDEO DELETE ERROR:",
            error
        );

        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});


module.exports = router;