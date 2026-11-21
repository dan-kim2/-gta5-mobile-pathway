"""Authenticated LAN-only keyboard/mouse input bridge for the mobile controller.

Run on the Windows PC that is running the game. Do not expose this service to the
public internet. Set INPUT_BRIDGE_TOKEN to a long random secret before starting.
"""
import asyncio
import json
import os
import sys

try:
    import pyautogui
    import websockets
except ImportError as exc:
    raise SystemExit("Missing dependencies. Run: pip install -r requirements.txt") from exc

HOST = os.getenv("INPUT_BRIDGE_HOST", "0.0.0.0")
PORT = int(os.getenv("INPUT_BRIDGE_PORT", "8765"))
TOKEN = os.getenv("INPUT_BRIDGE_TOKEN", "")
if len(TOKEN) < 20:
    raise SystemExit("Set INPUT_BRIDGE_TOKEN to a random secret of at least 20 characters.")

pyautogui.FAILSAFE = True
pyautogui.PAUSE = 0
ALLOWED_KEYS = {"w", "a", "s", "d", "e", "f", "r", "space", "shift"}
ALLOWED_MOUSE = {"left", "right", "middle"}
connected = set()


def release_everything():
    for key in list(ALLOWED_KEYS):
        try:
            pyautogui.keyUp(key)
        except Exception:
            pass
    for button in list(ALLOWED_MOUSE):
        try:
            pyautogui.mouseUp(button=button)
        except Exception:
            pass


async def handler(ws):
    authenticated = False
    connected.add(ws)
    try:
        async for raw in ws:
            if len(raw) > 4096:
                await ws.close(code=1009, reason="Message too large")
                break
            try:
                msg = json.loads(raw)
            except (json.JSONDecodeError, TypeError):
                await ws.send(json.dumps({"type": "error", "message": "Invalid JSON"}))
                continue

            if not authenticated:
                if msg.get("type") == "auth" and isinstance(msg.get("token"), str) and msg["token"] == TOKEN:
                    authenticated = True
                    await ws.send(json.dumps({"type": "auth_ok"}))
                else:
                    await ws.send(json.dumps({"type": "error", "message": "Authentication failed"}))
                    await ws.close(code=1008, reason="Unauthorized")
                    break
                continue

            kind = msg.get("type")
            try:
                if kind == "key":
                    key = msg.get("key")
                    if key not in ALLOWED_KEYS:
                        continue
                    (pyautogui.keyDown if msg.get("down") else pyautogui.keyUp)(key)
                elif kind == "mouse_button":
                    button = msg.get("button")
                    if button not in ALLOWED_MOUSE:
                        continue
                    (pyautogui.mouseDown if msg.get("down") else pyautogui.mouseUp)(button=button)
                elif kind == "mouse_move":
                    dx = max(-250, min(250, int(msg.get("dx", 0))))
                    dy = max(-250, min(250, int(msg.get("dy", 0))))
                    pyautogui.moveRel(dx, dy, duration=0)
                elif kind == "release_all":
                    release_everything()
                else:
                    await ws.send(json.dumps({"type": "error", "message": "Unsupported command"}))
            except Exception as exc:
                await ws.send(json.dumps({"type": "error", "message": f"Input error: {type(exc).__name__}"}))
    finally:
        connected.discard(ws)
        # Safety: release held controls when a controller disconnects.
        release_everything()


async def main():
    print(f"Input bridge listening on {HOST}:{PORT}")
    print("LAN use only. Do not port-forward this service.")
    async with websockets.serve(handler, HOST, PORT, max_size=4096, ping_interval=20, ping_timeout=20):
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        release_everything()
        print("\nBridge stopped.")
