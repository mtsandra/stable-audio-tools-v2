"""Standalone FlowEdit inference server — no Gradio required.

Run on the GPU server:
    python inference_server.py --model-config config.json --ckpt-path model.ckpt [--model-half]
    python inference_server.py --pretrained-name stabilityai/stable-audio-open-1.0 [--model-half]

Then on your LOCAL machine, open an SSH tunnel once:
    ssh -L 7861:localhost:7861 user@gpu-server

Then start the web app backend (also on local machine):
    python web_app/backend/main.py --gradio-url http://localhost:7861

The backend already speaks this server's protocol — no changes needed there.
"""

import argparse
import base64
import gc
import io
import json
import traceback

import numpy as np
import torch
import torchaudio
import uvicorn
from einops import rearrange
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from scipy.stats import norm as scipy_norm
from torchaudio import transforms as T

from stable_audio_tools.inference.generation import generate_diffusion_latent_flowedit
from stable_audio_tools.models.factory import create_model_from_config
from stable_audio_tools.models.pretrained import get_pretrained_model
from stable_audio_tools.models.utils import copy_state_dict, load_ckpt_state_dict

# ── Globals set at startup ────────────────────────────────────────────────────
model = None
sample_rate = 44100
sample_size = 2097152

app = FastAPI(title="FlowEdit Inference Server")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ── Helpers (same logic as gradio_flowedit.py) ────────────────────────────────
def _t_to_step(t: float, lfe_steps: int) -> int:
    return int(np.clip(np.round((1.0 - t) * (lfe_steps - 1)), 0, lfe_steps - 1))


def _gaussian_step_indices(lfe_steps, n_samples, center=0.5, std=0.15, forced_t_values=(0.95,)):
    if lfe_steps <= 0:
        return []
    forced_set = {_t_to_step(float(np.clip(t, 0.0, 1.0)), lfe_steps) for t in forced_t_values}
    n_gaussian = max(0, n_samples - len(forced_set))
    gaussian_set = set()
    if n_gaussian > 0:
        quantiles = np.linspace(1 / (n_gaussian + 1), n_gaussian / (n_gaussian + 1), n_gaussian)
        t_values = np.clip(scipy_norm.ppf(quantiles, loc=center, scale=std), 0.0, 1.0)
        for t in t_values:
            gaussian_set.add(_t_to_step(float(t), lfe_steps))
    return sorted(forced_set | gaussian_set)


def _run_flowedit(src_conditioning, tar_conditioning, init_audio, device, seed,
                  src_inv_cfg_scale, tar_inv_cfg_scale, src_lfe_cfg_scale, tar_lfe_cfg_scale,
                  lfe_steps, n_avg, intermediate_latents_steps):
    src_tensors = model.conditioner(src_conditioning, device)
    tar_tensors = model.conditioner(tar_conditioning, device)
    sampled, intermediate_sampled = generate_diffusion_latent_flowedit(
        model,
        src_inv_cfg_scale=float(src_inv_cfg_scale),
        tar_inv_cfg_scale=float(tar_inv_cfg_scale),
        src_lfe_cfg_scale=float(src_lfe_cfg_scale),
        tar_lfe_cfg_scale=float(tar_lfe_cfg_scale),
        src_conditioning_tensors=src_tensors,
        tar_conditioning_tensors=tar_tensors,
        n_avg=int(n_avg),
        batch_size=1,
        sample_size=sample_size,
        seed=int(seed),
        device=device,
        init_audio=init_audio,
        deterministic_inverse=True,
        noise_amt=0.0,
        inv_steps=0,
        lfe_steps=int(lfe_steps),
        return_intermediate_latents=True,
        intermediate_latents_steps=intermediate_latents_steps,
    )
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    gc.collect()
    return sampled, intermediate_sampled


def _tensor_to_b64(tensor):
    audio = rearrange(tensor, "b d n -> d (b n)").to(torch.float32).cpu()
    peak = audio.abs().max().clamp(min=1e-8)
    audio_int16 = audio.div(peak).clamp(-1, 1).mul(32767).to(torch.int16)
    buf = io.BytesIO()
    torchaudio.save(buf, audio_int16, sample_rate, format="wav")
    return base64.b64encode(buf.getvalue()).decode()


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "sample_rate": sample_rate, "sample_size": sample_size}


@app.post("/run/generate")
async def generate(request: Request):
    import asyncio
    try:
        body = await request.json()

        src_prompt = body["src_prompt"]
        tar_prompt = body["tar_prompt"]
        lfe_steps  = int(body.get("lfe_steps", 20))
        n_avg      = int(body.get("n_avg", 10))
        src_cfg    = float(body.get("src_lfe_cfg_scale", 1.0))
        tar_cfg    = float(body.get("tar_lfe_cfg_scale", 3.0))
        num_inter  = int(body.get("num_intermediates", 9))
        center     = float(body.get("sample_center", 0.5))
        std        = float(body.get("sample_std", 0.15))
        seed       = int(body.get("seed", -1))

        audio_bytes = base64.b64decode(body["audio_b64"])
        in_sr, waveform = torchaudio.load(io.BytesIO(audio_bytes))

        if in_sr != sample_rate:
            waveform = T.Resample(in_sr, sample_rate)(waveform)
        if waveform.shape[-1] > sample_size:
            waveform = waveform[..., :sample_size]

        model_dtype = next(model.parameters()).dtype
        waveform = waveform.to(model_dtype)
        init_audio = (sample_rate, waveform)

        device = next(model.parameters()).device
        if seed == -1:
            seed = int(np.random.randint(0, 2**32 - 1, dtype=np.uint32))

        step_indices = _gaussian_step_indices(lfe_steps, num_inter, center, std)
        t_labels = [round(1.0 - idx / max(lfe_steps - 1, 1), 3) for idx in step_indices]

        seconds_total = sample_size // sample_rate
        src_cond = [{"prompt": src_prompt, "seconds_start": 0, "seconds_total": seconds_total}]
        tar_cond = [{"prompt": tar_prompt, "seconds_start": 0, "seconds_total": seconds_total}]

        sampled, intermediate_sampled = await asyncio.to_thread(
            _run_flowedit,
            src_conditioning=src_cond, tar_conditioning=tar_cond,
            init_audio=init_audio, device=device, seed=seed,
            src_inv_cfg_scale=src_cfg, tar_inv_cfg_scale=tar_cfg,
            src_lfe_cfg_scale=src_cfg, tar_lfe_cfg_scale=tar_cfg,
            lfe_steps=lfe_steps, n_avg=n_avg,
            intermediate_latents_steps=step_indices,
        )

        return JSONResponse({
            "intermediates": [
                {"label": f"t={t}", "audio_b64": _tensor_to_b64(inter)}
                for t, inter in zip(t_labels, intermediate_sampled)
            ],
            "final": {"label": "Final", "audio_b64": _tensor_to_b64(sampled)},
            "seed": seed,
        })

    except Exception:
        tb = traceback.format_exc()
        print(f"[inference_server] ERROR:\n{tb}")
        return JSONResponse({"error": tb}, status_code=500)


# ── Startup ───────────────────────────────────────────────────────────────────
def load_model(args):
    global model, sample_rate, sample_size

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    if args.pretrained_name:
        print(f"Loading pretrained model: {args.pretrained_name}")
        model, model_config = get_pretrained_model(args.pretrained_name)
    else:
        with open(args.model_config) as f:
            model_config = json.load(f)
        print("Creating model from config")
        model = create_model_from_config(model_config)
        print(f"Loading checkpoint: {args.ckpt_path}")
        copy_state_dict(model, load_ckpt_state_dict(args.ckpt_path))

    sample_rate = model_config["sample_rate"]
    sample_size = model_config["sample_size"]

    if args.pretransform_ckpt_path:
        model.pretransform.load_state_dict(
            load_ckpt_state_dict(args.pretransform_ckpt_path), strict=False
        )

    model.to(device).eval().requires_grad_(False)
    if args.model_half:
        model.to(torch.float16)

    print(f"Model ready  sample_rate={sample_rate}  sample_size={sample_size}  half={args.model_half}")


def main():
    parser = argparse.ArgumentParser(description="FlowEdit inference server")
    parser.add_argument("--pretrained-name", type=str)
    parser.add_argument("--model-config", type=str)
    parser.add_argument("--ckpt-path", type=str)
    parser.add_argument("--pretransform-ckpt-path", type=str)
    parser.add_argument("--model-half", action="store_true", default=True)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7861)
    args = parser.parse_args()

    load_model(args)
    print(f"Listening on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
