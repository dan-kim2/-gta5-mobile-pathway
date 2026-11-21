# GTA V Mobile Pathway

A phone-first control surface and a small, authenticated LAN input bridge for controlling a **legally installed copy of Grand Theft Auto V** running on a Windows PC.

> **Reality check:** this repository does not contain GTA V, a game engine, game assets, or a way to run GTA V natively on an Android phone. The game must run on a compatible PC. You still need a separate, low-latency video/desktop streaming solution to see the PC screen on your phone. This project handles browser-side controls and forwards input to the PC.

## Current status

- Mobile-first touch controller and desktop keyboard support.
- WebSocket connection status and configurable bridge URL/token.
- Python input bridge for a trusted local network.
- Press/release handling so controls do not remain stuck after touch cancellation or disconnect.
- No copyrighted game files or third-party game assets.

## Quick start

### 1. On the Windows PC running GTA V

Install Python 3.10+ and then:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:INPUT_BRIDGE_TOKEN = "replace-this-with-a-long-random-secret"
python bridge.py
```

The bridge listens on port **8765**. Find the PC's private LAN IPv4 address (for example, `192.168.1.20`). Do not expose port 8765 to the public internet or configure router port-forwarding.

### 2. On the phone

Serve this folder from the PC on the same Wi-Fi network:

```powershell
py -m http.server 8080 --bind 0.0.0.0
```

Open `http://PC-LAN-IP:8080` in the phone browser. Enter:

- WebSocket URL: `ws://PC-LAN-IP:8765`
- The same token set in `INPUT_BRIDGE_TOKEN`

For production or access beyond a trusted LAN, use HTTPS/WSS behind a properly authenticated and secured gateway. Do not send the token over an untrusted network.

### 3. Video streaming

This project does **not** stream the game video. Use a separate trusted remote-play/desktop-streaming solution on the same PC and phone. The streaming solution must support the PC's display and provide acceptable latency. The control bridge is a separate input path; test compatibility with the chosen streaming client.

## Controls

- Left pad: WASD movement.
- Right pad: mouse-look movement (relative pointer movement).
- A: Space (jump)
- B: F (enter/exit vehicle)
- X: R (reload)
- Y: E (context/action)
- RUN: Left Shift
- AIM: right mouse button
- FIRE: left mouse button
- BRAKE: S

Controls are configurable in `app.js`.

## Safety and limitations

- The bridge injects keyboard and mouse input on the PC. Run it only on a PC you own or are authorized to control.
- Keep it on a trusted private network; use a long random token.
- Windows may require granting Python permission through Windows Firewall for **Private networks only**.
- The bridge uses PyAutoGUI. Some games running with elevated privileges may require the bridge to run at the same privilege level; avoid running anything as administrator unless necessary.
- This is an experimental input prototype, not a certified game client. It does not bypass game protections, licensing, platform restrictions, or anti-cheat.
- Your phone's ability to run the web controller does not guarantee smooth GTA V streaming. Performance depends mainly on the PC, streaming host/client, Wi-Fi, and latency.

## Project layout

- `index.html` — controller interface
- `styles.css` — responsive touch UI
- `app.js` — browser controls and WebSocket protocol
- `bridge.py` — authenticated Windows keyboard/mouse bridge
- `requirements.txt` — Python dependencies

## Protocol

The browser sends JSON messages:

- `{"type":"key","key":"w","down":true}`
- `{"type":"mouse_button","button":"left","down":true}`
- `{"type":"mouse_move","dx":12,"dy":-4}`
- `{"type":"release_all"}`

The bridge requires an initial `{"type":"auth","token":"..."}` message before accepting input.
