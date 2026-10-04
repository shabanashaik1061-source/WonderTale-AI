import sys
import json
from pathlib import Path

import openvino_genai as ov_genai
from PIL import Image


BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = (
    BASE_DIR /
    "stable-diffusion-xl-base-1.0-int8-ov"
)


try:
    request = json.loads(
        sys.stdin.read()
    )

    prompt = request["prompt"]

    output_path = Path(
        request["outputPath"]
    )

except Exception as error:

    print(
        f"INPUT ERROR: {error}",
        file=sys.stderr
    )

    sys.exit(1)


print(
    "Loading SDXL...",
    file=sys.stderr
)

print(
    f"Model: {MODEL_PATH}",
    file=sys.stderr
)

print(
    "Device: GPU",
    file=sys.stderr
)


pipe = ov_genai.Text2ImagePipeline(
    str(MODEL_PATH),
    "GPU"
)


print(
    "Generating SDXL image...",
    file=sys.stderr
)


image_tensor = pipe.generate(

    prompt,

    width=1024,

    height=1024,

    num_inference_steps=20,

    num_images_per_prompt=1
)


print(
    "Converting image...",
    file=sys.stderr
)


image = Image.fromarray(
    image_tensor.data[0]
)


output_path.parent.mkdir(
    parents=True,
    exist_ok=True
)


image.save(
    output_path,
    format="PNG"
)


print(
    f"IMAGE_SAVED:{output_path}",
    file=sys.stderr
)


print(
    json.dumps({
        "success": True,
        "path": str(output_path)
    })
)