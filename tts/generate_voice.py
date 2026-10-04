import asyncio
import sys
import os
import edge_tts


VOICE_MAP = {
    "nova": "en-US-JennyNeural",
    "fable": "en-GB-SoniaNeural",
    "coral": "en-US-AriaNeural",
    "rachel": "en-US-AnaNeural",
    "onyx": "en-US-GuyNeural",
    "lily": "en-US-SaraNeural"
}


async def generate_voice(text, voice, output_file):

    selected_voice = VOICE_MAP.get(
        voice,
        "en-US-JennyNeural"
    )

    print("==========================================")
    print("WonderTale AI - Voice Generation")
    print("Voice:", selected_voice)
    print("Output:", output_file)
    print("==========================================")

    communicate = edge_tts.Communicate(
        text,
        selected_voice,
        rate="-6%",
        pitch="-1Hz",
        volume="+0%"
    )

    await communicate.save(output_file)

    if not os.path.exists(output_file):
        raise Exception("Audio file was not created.")

    file_size = os.path.getsize(output_file)

    if file_size == 0:
        raise Exception("Generated audio file is empty.")

    print("VOICE SUCCESS")
    print("File size:", file_size, "bytes")
    print("==========================================")


async def main():

    if len(sys.argv) < 4:
        print(
            "Usage: python generate_voice.py "
            "\"text\" voice output_file"
        )
        sys.exit(1)

    text = sys.argv[1]
    voice = sys.argv[2]
    output_file = sys.argv[3]

    await generate_voice(
        text,
        voice,
        output_file
    )


if __name__ == "__main__":
    asyncio.run(main())