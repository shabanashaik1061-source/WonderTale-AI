const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const TOKENS_FILE = path.join(
    __dirname,
    "..",
    "data",
    "youtubeTokens.json"
);

function createYouTubeOAuthClient() {
    return new google.auth.OAuth2(
        process.env.YOUTUBE_CLIENT_ID,
        process.env.YOUTUBE_CLIENT_SECRET,
        process.env.YOUTUBE_REDIRECT_URI
    );
}

function getYouTubeAuthUrl() {
    const oauth2Client = createYouTubeOAuthClient();

    return oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly"
        ]
    });
}

function saveYouTubeTokens(tokens) {
    const dataDir = path.dirname(TOKENS_FILE);

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(
        TOKENS_FILE,
        JSON.stringify(tokens, null, 2),
        "utf8"
    );

    console.log("✅ YouTube tokens saved.");
}

function loadYouTubeTokens() {
    try {
        if (!fs.existsSync(TOKENS_FILE)) {
            return null;
        }

        const content = fs.readFileSync(
            TOKENS_FILE,
            "utf8"
        );

        if (!content.trim()) {
            return null;
        }

        return JSON.parse(content);

    } catch (error) {
        console.error(
            "❌ Failed to load YouTube tokens:",
            error.message
        );

        return null;
    }
}

function getAuthenticatedYouTubeClient() {
    const tokens = loadYouTubeTokens();

    if (!tokens) {
        return null;
    }

    const oauth2Client = createYouTubeOAuthClient();

    oauth2Client.setCredentials(tokens);

    oauth2Client.on("tokens", (newTokens) => {
        const updatedTokens = {
            ...tokens,
            ...newTokens
        };

        saveYouTubeTokens(updatedTokens);

        console.log("🔄 YouTube tokens refreshed and saved.");
    });

    return oauth2Client;
}

async function exchangeCodeForTokens(code) {
    const oauth2Client = createYouTubeOAuthClient();

    const { tokens } = await oauth2Client.getToken(code);

    saveYouTubeTokens(tokens);

    return tokens;
}

function isYouTubeConnected() {
    const tokens = loadYouTubeTokens();

    return !!(
        tokens &&
        (tokens.refresh_token || tokens.access_token)
    );
}


// ==========================================
// YOUTUBE VIDEO UPLOAD
// ==========================================

async function uploadVideoToYouTube({
    videoPath,
    title,
    description,
    tags = [],
    privacyStatus = "unlisted"
}) {
    if (!fs.existsSync(videoPath)) {
        throw new Error(
            `Video file not found: ${videoPath}`
        );
    }

    const auth = getAuthenticatedYouTubeClient();

    if (!auth) {
        throw new Error(
            "YouTube is not connected."
        );
    }

    const youtube = google.youtube({
        version: "v3",
        auth
    });

    console.log("🚀 Starting YouTube upload...");
    console.log("Title:", title);
    console.log("Privacy:", privacyStatus);

    const response = await youtube.videos.insert({
        part: ["snippet", "status"],

        requestBody: {
            snippet: {
                title: title || "WonderTale AI Story",
                description:
                    description ||
                    "Created with WonderTale AI Studio.",
                tags: Array.isArray(tags)
                    ? tags
                    : [],
                categoryId: "24"
            },

            status: {
                privacyStatus:
                    privacyStatus || "unlisted",
                selfDeclaredMadeForKids: true
            }
        },

        media: {
            body: fs.createReadStream(videoPath)
        }
    });

    const videoId = response.data.id;

    if (!videoId) {
        throw new Error(
            "YouTube upload completed but no video ID was returned."
        );
    }

    console.log(
        "✅ YouTube upload completed:",
        videoId
    );

    return {
        videoId,
        videoURL:
            `https://www.youtube.com/watch?v=${videoId}`
    };
}

// ==========================================
// YOUTUBE THUMBNAIL
// ==========================================

async function setYouTubeThumbnail({
    videoId,
    thumbnailPath
}) {
    if (!videoId) {
        throw new Error("YouTube video ID is required.");
    }

    if (!fs.existsSync(thumbnailPath)) {
        throw new Error(
            `Thumbnail file not found: ${thumbnailPath}`
        );
    }

    const auth =
        getAuthenticatedYouTubeClient();

    if (!auth) {
        throw new Error(
            "YouTube is not connected."
        );
    }

    const youtube = google.youtube({
        version: "v3",
        auth
    });

    console.log(
        "🖼️ Uploading YouTube thumbnail..."
    );

    await youtube.thumbnails.set({
        videoId,
        media: {
            body: fs.createReadStream(
                thumbnailPath
            )
        }
    });

    console.log(
        "✅ YouTube thumbnail uploaded."
    );

    return {
        success: true
    };
}
module.exports = {
    createYouTubeOAuthClient,
    getYouTubeAuthUrl,
    exchangeCodeForTokens,
    saveYouTubeTokens,
    loadYouTubeTokens,
    getAuthenticatedYouTubeClient,
    isYouTubeConnected,
    uploadVideoToYouTube,
    setYouTubeThumbnail
};