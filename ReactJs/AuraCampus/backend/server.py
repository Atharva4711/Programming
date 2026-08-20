"""
AuraCampus Runtime Wrapper
==========================
The platform's supervisor is locked to `uvicorn server:app` and cannot be edited.
So this thin FastAPI process:
  1. Spawns the real Express (Node) backend as a child process on port 8002.
  2. Forwards every /api/* request from :8001 -> :8002 (headers, body, query, method).

All business logic lives in server.js (Express + MongoDB) — the app is a
true MERN stack; Python is only used as a process launcher because the
platform's supervisor requires it.
"""
import os
import atexit
import asyncio
import subprocess
import time
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx

NODE_PORT = int(os.environ.get("NODE_PORT", "8002"))
NODE_URL = f"http://127.0.0.1:{NODE_PORT}"

app = FastAPI(title="AuraCampus (Express behind FastAPI wrapper)")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False,
                   allow_methods=["*"], allow_headers=["*"])

node_proc: subprocess.Popen | None = None
client: httpx.AsyncClient | None = None


def start_node():
    global node_proc
    env = {**os.environ, "NODE_PORT": str(NODE_PORT)}
    node_proc = subprocess.Popen(
        ["node", str(ROOT / "server.js")],
        cwd=str(ROOT), env=env,
    )
    print(f"[wrapper] spawned Node PID={node_proc.pid} on port {NODE_PORT}")


def stop_node():
    global node_proc
    if node_proc and node_proc.poll() is None:
        try:
            node_proc.terminate()
            node_proc.wait(timeout=5)
        except Exception:
            try: node_proc.kill()
            except Exception: pass


atexit.register(stop_node)


@app.on_event("startup")
async def on_start():
    global client
    start_node()
    client = httpx.AsyncClient(base_url=NODE_URL, timeout=60.0)
    # wait until Node is ready
    for _ in range(40):
        try:
            r = await client.get("/api/")
            if r.status_code == 200:
                print("[wrapper] Node is ready")
                return
        except Exception:
            pass
        await asyncio.sleep(0.25)
    print("[wrapper] WARNING: Node did not respond in time")


@app.on_event("shutdown")
async def on_stop():
    global client
    if client:
        await client.aclose()
    stop_node()


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy(path: str, request: Request):
    global client
    body = await request.body()
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length")}
    url = f"/api/{path}"
    r = await client.request(
        request.method, url, content=body,
        headers=headers, params=dict(request.query_params),
    )
    resp_headers = {k: v for k, v in r.headers.items()
                    if k.lower() not in ("content-encoding", "transfer-encoding", "connection")}
    return Response(content=r.content, status_code=r.status_code, headers=resp_headers, media_type=r.headers.get("content-type"))


@app.get("/")
def root():
    return {"ok": True, "stack": "MERN", "note": "Express on 8002 behind FastAPI wrapper"}
