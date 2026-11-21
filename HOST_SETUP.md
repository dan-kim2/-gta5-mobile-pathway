# Host PC setup — browser streaming

This is the shortest route to the goal: run the real game on a Windows gaming PC, then open its stream from the Android phone's browser.

## What must exist first

- A Windows PC capable of running the installed GTA V version at a playable frame rate.
- A legitimate GTA V installation associated with the user's Rockstar/Steam/Epic account.
- A GPU/encoder supported by the streaming host.
- A reliable local network. For best results, connect the PC to the router by Ethernet and use 5 GHz Wi-Fi for the phone.
- The Android phone needs a modern browser and enough hardware decoding capability for the selected stream settings.

The Lenovo B50-30 class of older laptop should **not** be assumed capable of running GTA V. Test the game locally before investing time in streaming setup.

## Browser-first option: Moonlight-Web

Moonlight-Web is a separate third-party open-source project. It is not made by Rockstar or the official Moonlight team.

1. Open the [Moonlight-Web latest releases](https://github.com/linckosz/moonlight-web/releases/latest).
2. On a Windows x64 gaming PC, download the asset named `MoonlightWeb-installer-<version>-win-x64.exe`. Do not use the ARM64 installer unless the PC is Windows on ARM.
3. Review the project's README, release notes, and installer provenance before running it.
4. Install it on the gaming PC. Follow the installer and first-run setup; secure the administrator interface with a unique password.
5. Make sure GTA V is installed and launches normally on that PC.
6. From the PC browser, open the local Moonlight-Web interface (the project documents `https://localhost`). Check its current guide for the correct LAN address and certificate behavior.
7. On the Android phone connected to the same Wi-Fi, open the PC's LAN address in Chrome. Accept a certificate warning only if you have independently confirmed that the address is your own PC and you understand the local certificate prompt.
8. Select the PC display/session, start the stream, and use the built-in touch controls. Start conservatively at 720p and 30 FPS; raise quality only if the phone and network remain smooth.

Official upstream project: https://github.com/linckosz/moonlight-web

## Alternative: Sunshine + Moonlight Android

If browser access is not essential, use [Sunshine](https://github.com/LizardByte/Sunshine) on the host PC and the official [Moonlight Android client](https://github.com/moonlight-stream/moonlight-android) on the phone. Pair them on the same network and stream the desktop or GTA V. This is a different path from browser-only play.

## Network and safety

- Begin on the same private Wi-Fi network. Do not expose administration pages or the custom input bridge to the public internet.
- Do not create router port-forwarding rules until you understand the security implications and have followed the streaming project's official remote-access guide.
- Do not share the host's administrator password, pairing PIN, or private access link.
- If the PC cannot run GTA V locally, streaming software cannot fix that. A capable remote/cloud gaming host would be needed, with GTA V licensing and provider compatibility checked separately.

## Role of this repository

This repository's `index.html`, `app.js`, and `bridge.py` are an experimental custom controller/input bridge. They do not decode or stream game video and are not required for Moonlight-Web's built-in touch controls. Do not run the custom bridge unless you specifically want to test it as a separate input path.
