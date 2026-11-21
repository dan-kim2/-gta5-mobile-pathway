(() => {
  const $ = (id) => document.getElementById(id);
  const urlInput = $("bridgeUrl");
  const tokenInput = $("token");
  const statusDot = $("statusDot");
  const statusText = $("statusText");
  const inputState = $("inputState");
  let socket = null;
  let authenticated = false;
  const heldKeys = new Set();
  const heldMouse = new Set();
  const KEY_MAP = {space:"space",shift:"shift",w:"w",a:"a",s:"s",d:"d",e:"e",f:"f",r:"r"};

  function status(state, message) {
    statusDot.className = "dot" + (state === "online" ? " online" : state === "error" ? " error" : "");
    statusText.textContent = message;
    inputState.textContent = authenticated ? "INPUT READY" : "INPUT IDLE";
  }
  function send(payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !authenticated) return false;
    socket.send(JSON.stringify(payload));
    return true;
  }
  function key(code, down) {
    const normalized = KEY_MAP[code] || code;
    if (down && !heldKeys.has(normalized)) {
      heldKeys.add(normalized);
      send({type:"key", key:normalized, down:true});
    } else if (!down && heldKeys.has(normalized)) {
      heldKeys.delete(normalized);
      send({type:"key", key:normalized, down:false});
    }
  }
  function mouse(button, down) {
    if (down && !heldMouse.has(button)) {
      heldMouse.add(button);
      send({type:"mouse_button", button, down:true});
    } else if (!down && heldMouse.has(button)) {
      heldMouse.delete(button);
      send({type:"mouse_button", button, down:false});
    }
  }
  function releaseAll() {
    if (socket && socket.readyState === WebSocket.OPEN && authenticated) send({type:"release_all"});
    heldKeys.clear();
    heldMouse.clear();
    document.querySelectorAll(".face,.wide-control").forEach(el => el.classList.remove("active"));
  }
  function disconnect() {
    releaseAll();
    authenticated = false;
    if (socket) { socket.close(); socket = null; }
    $("connectBtn").disabled = false;
    $("disconnectBtn").disabled = true;
    status("offline", "Disconnected");
  }
  function connect() {
    const url = urlInput.value.trim();
    const token = tokenInput.value;
    if (!/^wss?:\/\//i.test(url) || !token) {
      status("error", "Enter bridge URL + token");
      return;
    }
    try {
      socket = new WebSocket(url);
      status("offline", "Connecting…");
      $("connectBtn").disabled = true;
      socket.addEventListener("open", () => {
        socket.send(JSON.stringify({type:"auth", token}));
      });
      socket.addEventListener("message", event => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (data.type === "auth_ok") {
          authenticated = true;
          status("online", "Connected");
          $("disconnectBtn").disabled = false;
        } else if (data.type === "error") {
          status("error", data.message || "Bridge error");
          disconnect();
        }
      });
      socket.addEventListener("close", () => {
        authenticated = false;
        heldKeys.clear(); heldMouse.clear();
        $("connectBtn").disabled = false;
        $("disconnectBtn").disabled = true;
        status("offline", "Disconnected");
      });
      socket.addEventListener("error", () => status("error", "Connection failed"));
    } catch (err) {
      status("error", "Invalid connection URL");
      $("connectBtn").disabled = false;
    }
  }
  $("connectBtn").addEventListener("click", connect);
  $("disconnectBtn").addEventListener("click", disconnect);
  $("releaseBtn").addEventListener("click", releaseAll);

  // Hold buttons: pointer events support touch, mouse, and stylus.
  document.querySelectorAll("[data-key]").forEach(el => {
    const code = el.dataset.key;
    el.addEventListener("pointerdown", e => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); key(code,true); });
    ["pointerup","pointercancel","lostpointercapture"].forEach(type => el.addEventListener(type, e => { e.preventDefault(); key(code,false); }));
  });
  document.querySelectorAll("[data-mouse]").forEach(el => {
    const button = el.dataset.mouse;
    el.addEventListener("pointerdown", e => { e.preventDefault(); el.setPointerCapture?.(e.pointerId); mouse(button,true); });
    ["pointerup","pointercancel","lostpointercapture"].forEach(type => el.addEventListener(type, e => { e.preventDefault(); mouse(button,false); }));
  });

  // Virtual movement pad sends key transitions as the stick crosses directional zones.
  const pad = $("movePad"), stick = pad.querySelector(".stick");
  let activePointer = null, activeDirections = new Set();
  function updateStick(e) {
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    let dx = e.clientX-cx, dy = e.clientY-cy;
    const max = rect.width*.31, distance = Math.hypot(dx,dy);
    if (distance > max) { dx = dx/distance*max; dy = dy/distance*max; }
    stick.style.left = (50 + dx/rect.width*100) + "%";
    stick.style.top = (50 + dy/rect.height*100) + "%";
    const threshold = max*.28, next = new Set();
    if (dy < -threshold) next.add("w");
    if (dy > threshold) next.add("s");
    if (dx < -threshold) next.add("a");
    if (dx > threshold) next.add("d");
    activeDirections.forEach(k => { if (!next.has(k)) key(k,false); });
    next.forEach(k => { if (!activeDirections.has(k)) key(k,true); });
    activeDirections = next;
  }
  function resetStick() {
    activeDirections.forEach(k => key(k,false));
    activeDirections.clear(); activePointer = null;
    stick.style.left = "50%"; stick.style.top = "50%";
  }
  pad.addEventListener("pointerdown", e => { e.preventDefault(); activePointer=e.pointerId; pad.setPointerCapture(e.pointerId); updateStick(e); });
  pad.addEventListener("pointermove", e => { if (e.pointerId===activePointer) updateStick(e); });
  ["pointerup","pointercancel","lostpointercapture"].forEach(t => pad.addEventListener(t, resetStick));

  // Camera/look zone emits relative mouse deltas.
  const look = $("lookPad");
  let lookPointer = null, lastX = 0, lastY = 0;
  look.addEventListener("pointerdown", e => { e.preventDefault(); lookPointer=e.pointerId; lastX=e.clientX; lastY=e.clientY; look.setPointerCapture(e.pointerId); });
  look.addEventListener("pointermove", e => {
    if (e.pointerId!==lookPointer) return;
    const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY;
    if (dx || dy) send({type:"mouse_move",dx:Math.round(dx*1.6),dy:Math.round(dy*1.6)});
  });
  ["pointerup","pointercancel","lostpointercapture"].forEach(t => look.addEventListener(t, () => { lookPointer=null; }));

  // Physical keyboard support when the page is open on a PC.
  const keyAliases = {" ":"space","Spacebar":"space","Shift":"shift"};
  window.addEventListener("keydown", e => {
    if (["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)) return;
    const k = keyAliases[e.key] || e.key.toLowerCase();
    if (KEY_MAP[k]) { e.preventDefault(); key(k,true); }
  });
  window.addEventListener("keyup", e => {
    const k = keyAliases[e.key] || e.key.toLowerCase();
    if (KEY_MAP[k]) { e.preventDefault(); key(k,false); }
  });
  window.addEventListener("blur", releaseAll);
  document.addEventListener("visibilitychange", () => { if (document.hidden) releaseAll(); });
  status("offline", "Disconnected");
})();