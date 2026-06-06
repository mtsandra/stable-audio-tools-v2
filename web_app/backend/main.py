"""FastAPI backend for the Sound Object Generator.

Calls /run/generate on the running gradio_flowedit.py server.
Audio travels as base64 in JSON — no file-serving needed, works through any tunnel.

Start with:
    python web_app/backend/main.py --gradio-url https://xxxx.gradio.live

Requires:
    pip install fastapi "uvicorn[standard]" python-multipart httpx
"""
import argparse
import base64
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import httpx
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ── Storage ───────────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).parent.parent / "data"
AUDIO_DIR = DATA_DIR / "audio"
SOUND_OBJECTS_FILE = DATA_DIR / "sound_objects.json"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

_gradio_url: str = ""

app = FastAPI(title="Sound Object Generator")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")


# ── Sound object persistence ──────────────────────────────────────────────────
def _load_sound_objects():
    if SOUND_OBJECTS_FILE.exists():
        return json.loads(SOUND_OBJECTS_FILE.read_text())
    return []


def _save_sound_objects(objects):
    SOUND_OBJECTS_FILE.write_text(json.dumps(objects, indent=2))


# ── API routes ────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"status": "ok", "gradio_url": _gradio_url}


@app.post("/api/generate")
async def generate(
    audio: UploadFile = File(...),
    src_prompt: str = Form(...),
    tar_prompt: str = Form(...),
    lfe_steps: int = Form(20),
    n_avg: int = Form(10),
    src_lfe_cfg_scale: float = Form(1.0),
    tar_lfe_cfg_scale: float = Form(3.0),
    num_intermediates: int = Form(9),
    sample_center: float = Form(0.5),
    sample_std: float = Form(0.15),
    seed: int = Form(-1),
):
    audio_bytes = await audio.read()
    audio_b64 = base64.b64encode(audio_bytes).decode()

    payload = {
        "src_prompt": src_prompt,
        "tar_prompt": tar_prompt,
        "audio_b64": audio_b64,
        "lfe_steps": lfe_steps,
        "n_avg": n_avg,
        "src_lfe_cfg_scale": src_lfe_cfg_scale,
        "tar_lfe_cfg_scale": tar_lfe_cfg_scale,
        "num_intermediates": num_intermediates,
        "sample_center": sample_center,
        "sample_std": sample_std,
        "seed": seed,
    }

    async with httpx.AsyncClient(follow_redirects=True, timeout=600) as client:
        try:
            resp = await client.post(f"{_gradio_url}/run/generate", json=payload)
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise HTTPException(502, f"Gradio error: {e.response.text[:2000]}")
        except Exception as e:
            raise HTTPException(502, f"Generation failed: {e}")

    data = resp.json()
    generation_id = str(uuid.uuid4())

    def save_b64_audio(b64_str: str, filename: str) -> str:
        (AUDIO_DIR / filename).write_bytes(base64.b64decode(b64_str))
        return f"/audio/{filename}"

    intermediates = []
    for i, item in enumerate(data.get("intermediates", [])):
        filename = f"{generation_id}_inter_{i}.wav"
        url = save_b64_audio(item["audio_b64"], filename)
        intermediates.append({"audio_url": url, "label": item["label"]})

    final_item = data.get("final", {})
    final_filename = f"{generation_id}_final.wav"
    final_url = save_b64_audio(final_item["audio_b64"], final_filename)
    final = {"audio_url": final_url, "label": final_item.get("label", "Final")}

    return {
        "generation_id": generation_id,
        "intermediates": intermediates,
        "final": final,
        "src_prompt": src_prompt,
        "tar_prompt": tar_prompt,
    }


class SaveSoundObjectRequest(BaseModel):
    name: str
    prompt: str
    audio_url: str
    generation_id: Optional[str] = None
    is_final: bool = False


@app.post("/api/sound-objects")
def create_sound_object(req: SaveSoundObjectRequest):
    objects = _load_sound_objects()
    obj = {
        "id": str(uuid.uuid4()),
        "name": req.name,
        "prompt": req.prompt,
        "audio_url": req.audio_url,
        "generation_id": req.generation_id,
        "is_final": req.is_final,
        "created_at": datetime.utcnow().isoformat(),
    }
    objects.append(obj)
    _save_sound_objects(objects)
    return obj


@app.get("/api/sound-objects")
def list_sound_objects():
    return _load_sound_objects()


class UpdateSoundObjectRequest(BaseModel):
    name: Optional[str] = None
    prompt: Optional[str] = None


@app.put("/api/sound-objects/{obj_id}")
def update_sound_object(obj_id: str, req: UpdateSoundObjectRequest):
    objects = _load_sound_objects()
    for obj in objects:
        if obj["id"] == obj_id:
            if req.name is not None:
                obj["name"] = req.name
            if req.prompt is not None:
                obj["prompt"] = req.prompt
            _save_sound_objects(objects)
            return obj
    raise HTTPException(404, "Sound object not found")


@app.delete("/api/sound-objects/{obj_id}")
def delete_sound_object(obj_id: str):
    objects = _load_sound_objects()
    filtered = [o for o in objects if o["id"] != obj_id]
    if len(filtered) == len(objects):
        raise HTTPException(404, "Sound object not found")
    _save_sound_objects(filtered)
    return {"ok": True}


# ── Entry point ───────────────────────────────────────────────────────────────
def main():
    global _gradio_url

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--gradio-url",
        default=os.environ.get("GRADIO_URL", "http://localhost:7860"),
    )
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    _gradio_url = args.gradio_url.rstrip("/")
    print(f"Using Gradio server: {_gradio_url}")
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
