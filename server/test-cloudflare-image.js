require("dotenv").config();

const fs = require("fs");

const ACCOUNT_ID =
    process.env.CLOUDFLARE_ACCOUNT_ID;

const API_TOKEN =
    process.env.CLOUDFLARE_API_TOKEN;

const MODEL =
    "@cf/black-forest-labs/flux-2-klein-4b";

const prompt = `
A beautiful magical fairy-tale forest at night,
a cute little golden dragon standing beside a young
princess wearing an elegant blue dress,
glowing fireflies floating around them,
moonlight shining through giant trees,
cinematic children's animated movie,
beautiful expressive characters,
rich detailed environment,
professional 3D animation quality,
dreamy magical atmosphere,
high quality composition,
no text, no letters, no logo, no watermark
`.trim();

async function generate() {

    console.log("Generating Cloudflare image...");

    const form = new FormData();

    form.append("prompt", prompt);

    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`,
        {
            method: "POST",

            headers: {
                "Authorization":
                    `Bearer ${API_TOKEN}`
            },

            body: form
        }
    );

    console.log(
        "HTTP STATUS:",
        response.status
    );

    if (!response.ok) {

        console.error(
            "CLOUDFLARE ERROR:",
            await response.text()
        );

        return;
    }

    const data =
        await response.json();

    if (
        !data.result ||
        !data.result.image
    ) {

        console.error(
            "IMAGE DATA NOT FOUND:",
            data
        );

        return;
    }

    const imageBuffer =
        Buffer.from(
            data.result.image,
            "base64"
        );

    fs.writeFileSync(
        "cloudflare-test.jpg",
        imageBuffer
    );

    console.log(
        "✅ IMAGE SAVED: cloudflare-test.jpg"
    );

    console.log(
        "SIZE:",
        imageBuffer.length,
        "bytes"
    );
}

generate().catch(
    console.error
);