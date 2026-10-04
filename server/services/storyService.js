// server/services/storyService.js

const storyStyles = {
    kids: {
        tone: "fun, magical, emotional and easy for children to understand",
        visualStyle:
            "high-quality 3D animated children's movie, colorful cinematic environment"
    },

    fantasy: {
        tone: "magical, adventurous and mysterious",
        visualStyle:
            "cinematic fantasy animation, magical lighting, detailed environments"
    },

    adventure: {
        tone: "exciting, brave and adventurous",
        visualStyle:
            "cinematic animated adventure movie, dynamic environments"
    }
};


/**
 * Generate a structured story.
 *
 * Stage 2 currently uses a local story engine.
 * The service is intentionally separated so that a real
 * LLM can replace it without changing the frontend.
 */
export function generateStory({
    prompt,
    characterAnchor = "",
    sceneCount = 6,
    storyLength = 10,   
    sceneDuration = 6,
    voiceProfile = "female",
    aspectRatio = "16:9",
    style = "kids"
}) {    const wordsPerMinute = 140;

    const targetWordCount =
        storyLength * wordsPerMinute;

    const targetWordsPerScene =
        Math.round(
            targetWordCount / sceneCount
        );

    if (!prompt || !prompt.trim()) {
        throw new Error("Story prompt is required.");
    }

    const selectedStyle =
        storyStyles[style] || storyStyles.kids;

    const cleanPrompt = prompt.trim();

    const title = createTitle(cleanPrompt);

    const characters = createCharacters(
        cleanPrompt,
        characterAnchor
    );

    const scenes = createScenes({
        prompt: cleanPrompt,
        characters,
        sceneCount,
        sceneDuration,
        selectedStyle
    });

    return {
        id: `story_${Date.now()}`,

        title,

        concept: cleanPrompt,

        characters,

        style,

        voiceProfile,

        aspectRatio,

        sceneDuration,

        sceneCount,

        scenes,

        metadata: {
            generatedAt: new Date().toISOString(),
            engine: "WonderTale Story Engine v1"
        }
    };
}


/**
 * Create a simple title from the user's idea.
 */
function createTitle(prompt) {

    const lower = prompt.toLowerCase();

    if (lower.includes("dragon")) {
        return "The Dragon and the Brave Little Hero";
    }

    if (lower.includes("monster")) {
        return "The Monster Who Wanted a Friend";
    }

    if (lower.includes("space")) {
        return "The Little Explorer of Space";
    }

    if (lower.includes("princess")) {
        return "The Princess and the Secret Kingdom";
    }

    if (lower.includes("robot")) {
        return "The Robot Who Discovered Friendship";
    }

    if (lower.includes("forest")) {
        return "The Secret of the Magical Forest";
    }

    return "The Wonderful Adventure";
}


/**
 * Create the main characters.
 */
function createCharacters(prompt, characterAnchor) {

    const characters = [];

    const mainCharacter =
        characterAnchor?.trim() ||
        "a curious young hero";

    characters.push({
        id: "character_1",
        name: "Main Hero",
        role: "protagonist",
        description: mainCharacter
    });

    const lower = prompt.toLowerCase();

    if (lower.includes("dragon")) {

        characters.push({
            id: "character_2",
            name: "Ember",
            role: "magical companion",
            description:
                "a small friendly dragon with bright eyes and glowing blue wings"
        });
    }

    if (lower.includes("monster")) {

        characters.push({
            id: "character_2",
            name: "Milo",
            role: "misunderstood monster",
            description:
                "a large soft-hearted monster with expressive eyes"
        });
    }

    if (lower.includes("robot")) {

        characters.push({
            id: "character_2",
            name: "Bolt",
            role: "robot companion",
            description:
                "a small friendly futuristic robot with glowing eyes"
        });
    }

    if (characters.length === 1) {

        characters.push({
            id: "character_2",
            name: "Mysterious Friend",
            role: "supporting character",
            description:
                "a friendly mysterious companion who helps the hero"
        });
    }

    return characters;
}


/**
 * Create scene-by-scene story structure.
 */
function createScenes({
    prompt,
    characters,
    sceneCount,
    sceneDuration,
    selectedStyle
}) {

    const scenes = [];

    const hero = characters[0];
    const companion = characters[1];

    for (let i = 0; i < sceneCount; i++) {

        let phase;

        if (i === 0) {
            phase = "opening";
        } else if (i === sceneCount - 1) {
            phase = "ending";
        } else if (i < sceneCount / 2) {
            phase = "discovery";
        } else {
            phase = "conflict";
        }

        const scene = buildScene({
            number: i + 1,
            phase,
            prompt,
            hero,
            companion,
            sceneDuration,
            visualStyle: selectedStyle.visualStyle
        });

        scenes.push(scene);
    }

    return scenes;
}


/**
 * Build an individual scene.
 */
function buildScene({
    number,
    phase,
    prompt,
    hero,
    companion,
    sceneDuration,
    visualStyle
}) {

    let narration;
    let visualDescription;

    switch (phase) {

        case "opening":

            narration =
                `${hero.description} begins an unexpected adventure. ` +
                `Everything seems normal at first, but something mysterious ` +
                `is waiting nearby.`;

            visualDescription =
                `${hero.description} exploring a beautiful magical environment ` +
                `while discovering the first clue to an incredible adventure.`;

            break;


        case "discovery":

            narration =
                `${hero.description} discovers something extraordinary. ` +
                `${companion.description} appears, and the two begin to ` +
                `understand that their meeting was not an accident.`;

            visualDescription =
                `${hero.description} meeting ${companion.description} ` +
                `in a magical environment, both looking surprised and curious.`;

            break;


        case "conflict":

            narration =
                `The adventure suddenly becomes difficult. ` +
                `${hero.description} must find courage and work together ` +
                `with ${companion.description} to overcome the challenge.`;

            visualDescription =
                `${hero.description} and ${companion.description} facing ` +
                `a dramatic but child-friendly challenge in a magical world.`;

            break;


        case "ending":

            narration =
                `After their incredible adventure, ${hero.description} ` +
                `and ${companion.description} discover that courage, kindness ` +
                `and friendship can create the most wonderful endings.`;

            visualDescription =
                `${hero.description} and ${companion.description} celebrating ` +
                `their successful adventure in a beautiful magical landscape ` +
                `during golden sunset.`;

            break;
    }

    const imagePrompt = `
${visualDescription}

Story concept:
${prompt}

Characters:
${hero.description}
${companion.description}

Visual style:
${visualStyle}

Important:
Keep the characters visually consistent.
Same face.
Same clothes.
Same colors.
Same body proportions.

No text.
No subtitles.
No watermark.

Aspect ratio:
cinematic ${sceneDuration}-second video scene.
`.trim();

    return {
        id: `scene_${number}`,

        sceneNumber: number,

        phase,

        duration: sceneDuration,

        narration,

        visualDescription,

        imagePrompt,

        imageUrl: null,

        audioUrl: null,

        status: "pending"
    };
}