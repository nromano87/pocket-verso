(() => {
  "use strict";

  // Pocket Verso — all state lives in the URL fragment.
  // No fetch, no XHR, no beacons, no storage, no image hosts.
  // The photograph is drawn in-canvas from a seed so a shared
  // link reproduces the same face without leaving this origin.

  const $ = (id) => document.getElementById(id);
  const captionEl = $("caption");
  const versoEl = $("verso");
  const cardEl = $("card");
  const statusEl = $("status");
  const softnessEl = $("softness");
  const placeChip = $("place-chip");
  const canvas = $("photo");
  const ctx = canvas.getContext("2d");
  const printFace = $("print-face");
  const printVerso = $("print-verso");
  const printPhoto = $("print-photo");

  const GREETING_CARD = [
    "thinking of you",
    "wish you were here",
    "with love",
    "best wishes",
    "congratulations",
    "happy birthday",
    "sincerely",
    "warm regards",
  ];

  // Thrift-drawer places — filed by picture, not by the life on the reverse.
  const PLACES = [
    { id: "pier", label: "Fog over a pier", draw: drawPier },
    { id: "beach", label: "Assorted beaches", draw: drawBeach },
    { id: "falls", label: "Niagara drawer", draw: drawFalls },
    { id: "ridge", label: "Unlabeled ridge", draw: drawRidge },
    { id: "harbor", label: "Harbor at dusk", draw: drawHarbor },
    { id: "market", label: "Night market light", draw: drawMarket },
  ];

  let seed = 1;

  function mulberry32(a) {
    return function rand() {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function placeFor(s) {
    return PLACES[Math.abs(s) % PLACES.length];
  }

  function newSeed() {
    return (Math.floor(Math.random() * 0xffffffff) || 1) >>> 0;
  }

  function encodeCard(caption, verso, s) {
    const payload = JSON.stringify({
      f: caption,
      v: verso,
      s: s >>> 0,
    });
    const bytes = new TextEncoder().encode(payload);
    let bin = "";
    bytes.forEach((b) => {
      bin += String.fromCharCode(b);
    });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeCard(hash) {
    const raw = (hash || "").replace(/^#/, "").trim();
    if (!raw) return null;
    try {
      const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
      const bin = atob(b64 + pad);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const data = JSON.parse(new TextDecoder().decode(bytes));
      return {
        f: typeof data.f === "string" ? data.f.slice(0, 80) : "",
        v: typeof data.v === "string" ? data.v.slice(0, 480) : "",
        s: Number.isFinite(data.s) ? data.s >>> 0 : newSeed(),
      };
    } catch (_) {
      return null;
    }
  }

  function words(s) {
    return (s.toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => w.length > 2);
  }

  function faceText() {
    const cap = captionEl.value.trim();
    return cap || placeFor(seed).label;
  }

  function softnessReport(face, verso) {
    const f = face.trim();
    const v = verso.trim();
    if (!v) {
      return {
        ok: true,
        text: "Verso is empty. An unfinished blank is still a verso.",
      };
    }

    const fw = new Set(words(f));
    const vw = words(v);
    const shared = vw.filter((w) => fw.has(w));
    const overlap = vw.length ? shared.length / vw.length : 0;
    const lower = v.toLowerCase();
    const greeting = GREETING_CARD.find((g) => lower.includes(g));

    if (greeting) {
      return {
        ok: false,
        text: `That verso is starting to sound like a greeting card (“${greeting}”). Soften it, or throw it out.`,
      };
    }
    if (overlap >= 0.55 && vw.length >= 4) {
      return {
        ok: false,
        text: "The note is repeating the picture. A verso that matches the face becomes a second photograph.",
      };
    }
    if (v.length > Math.max(f.length, 24) * 1.8 && v.length > 120) {
      return {
        ok: false,
        text: "The reverse is longer and louder than the face. Keep it softer than the picture.",
      };
    }
    return {
      ok: true,
      text: "Soft enough. The reverse is still a note, not a second face.",
    };
  }

  function fillSky(rand, top, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 5; i++) {
      const x = rand() * canvas.width;
      const y = rand() * canvas.height * 0.35;
      const r = 40 + rand() * 90;
      const cg = ctx.createRadialGradient(x, y, 4, x, y, r);
      cg.addColorStop(0, "rgba(255,255,255,0.22)");
      cg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = cg;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  function vignette() {
    const g = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.45,
      canvas.width * 0.2,
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width * 0.72
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(28,22,16,0.42)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function filmGrain(rand) {
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 16) {
      const n = (rand() - 0.5) * 28;
      d[i] = clamp(d[i] + n);
      d[i + 1] = clamp(d[i + 1] + n * 0.9);
      d[i + 2] = clamp(d[i + 2] + n * 0.75);
    }
    ctx.putImageData(img, 0, 0);
  }

  function clamp(n) {
    return n < 0 ? 0 : n > 255 ? 255 : n;
  }

  function warmWash() {
    ctx.fillStyle = "rgba(210, 170, 110, 0.12)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawPier(rand) {
    fillSky(rand, "#9bb0c4", "#d8c3a4");
    const waterY = canvas.height * 0.58;
    const wg = ctx.createLinearGradient(0, waterY, 0, canvas.height);
    wg.addColorStop(0, "#6d8498");
    wg.addColorStop(1, "#3e5366");
    ctx.fillStyle = wg;
    ctx.fillRect(0, waterY, canvas.width, canvas.height - waterY);
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = `rgba(220,230,240,${0.04 + rand() * 0.08})`;
      ctx.beginPath();
      const y = waterY + rand() * (canvas.height - waterY);
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(
        canvas.width * 0.3,
        y + 4,
        canvas.width * 0.7,
        y - 4,
        canvas.width,
        y + 2
      );
      ctx.stroke();
    }
    const fog = ctx.createLinearGradient(0, waterY - 40, 0, waterY + 30);
    fog.addColorStop(0, "rgba(230,235,240,0)");
    fog.addColorStop(0.5, "rgba(230,235,240,0.55)");
    fog.addColorStop(1, "rgba(230,235,240,0.1)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, waterY - 50, canvas.width, 90);
    ctx.fillStyle = "#3a2f28";
    const pierY = waterY + 8;
    ctx.fillRect(canvas.width * 0.12, pierY, canvas.width * 0.55, 10);
    for (let i = 0; i < 7; i++) {
      const x = canvas.width * 0.15 + i * 42;
      ctx.fillRect(x, pierY, 6, 55 + rand() * 20);
    }
    warmWash();
    vignette();
    filmGrain(rand);
  }

  function drawBeach(rand) {
    fillSky(rand, "#7ea0c4", "#f0d2a8");
    const horizon = canvas.height * 0.48;
    const sea = ctx.createLinearGradient(0, horizon, 0, canvas.height * 0.72);
    sea.addColorStop(0, "#4f7fa3");
    sea.addColorStop(1, "#79b0c8");
    ctx.fillStyle = sea;
    ctx.fillRect(0, horizon, canvas.width, canvas.height * 0.3);
    const sandGrad = ctx.createLinearGradient(0, canvas.height * 0.68, 0, canvas.height);
    sandGrad.addColorStop(0, "#e4c796");
    sandGrad.addColorStop(1, "#c9a06a");
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, canvas.height * 0.68, canvas.width, canvas.height * 0.32);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.68);
    for (let x = 0; x <= canvas.width; x += 20) {
      ctx.lineTo(x, canvas.height * 0.68 + Math.sin(x * 0.05 + rand()) * 4);
    }
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const x = canvas.width * (0.2 + rand() * 0.6);
      const y = canvas.height * (0.72 + rand() * 0.08);
      ctx.fillStyle = rand() > 0.5 ? "#c45c4a" : "#dfc56a";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 18, y + 10);
      ctx.lineTo(x - 18, y + 10);
      ctx.closePath();
      ctx.fill();
    }
    warmWash();
    vignette();
    filmGrain(rand);
  }

  function drawFalls(rand) {
    fillSky(rand, "#6d87a3", "#c5d0d8");
    ctx.fillStyle = "#4a5560";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.35);
    ctx.lineTo(canvas.width * 0.45, canvas.height * 0.4);
    ctx.lineTo(canvas.width * 0.55, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3d474f";
    ctx.beginPath();
    ctx.moveTo(canvas.width, canvas.height * 0.38);
    ctx.lineTo(canvas.width * 0.58, canvas.height * 0.42);
    ctx.lineTo(canvas.width * 0.5, canvas.height);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 26; i++) {
      const x = canvas.width * 0.42 + rand() * canvas.width * 0.16;
      ctx.strokeStyle = `rgba(220,235,245,${0.15 + rand() * 0.35})`;
      ctx.lineWidth = 1 + rand() * 2;
      ctx.beginPath();
      ctx.moveTo(x, canvas.height * 0.4);
      ctx.lineTo(x + (rand() - 0.5) * 10, canvas.height * 0.92);
      ctx.stroke();
    }
    const mist = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.78,
      10,
      canvas.width * 0.5,
      canvas.height * 0.78,
      120
    );
    mist.addColorStop(0, "rgba(240,245,250,0.55)");
    mist.addColorStop(1, "rgba(240,245,250,0)");
    ctx.fillStyle = mist;
    ctx.fillRect(0, canvas.height * 0.55, canvas.width, canvas.height * 0.45);
    warmWash();
    vignette();
    filmGrain(rand);
  }

  function drawRidge(rand) {
    fillSky(rand, "#5b6f8a", "#d7b58c");
    const layers = [
      ["#6b7c6a", 0.55],
      ["#4f5f52", 0.68],
      ["#3a4640", 0.82],
    ];
    layers.forEach(([color, base], idx) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      let x = 0;
      while (x <= canvas.width) {
        const y = canvas.height * base - rand() * 40 - idx * 8;
        ctx.lineTo(x, y);
        x += 18 + rand() * 30;
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();
    });
    warmWash();
    vignette();
    filmGrain(rand);
  }

  function drawHarbor(rand) {
    fillSky(rand, "#2a3348", "#c47a5a");
    const waterY = canvas.height * 0.62;
    const wg = ctx.createLinearGradient(0, waterY, 0, canvas.height);
    wg.addColorStop(0, "#2c3d55");
    wg.addColorStop(1, "#1a2535");
    ctx.fillStyle = wg;
    ctx.fillRect(0, waterY, canvas.width, canvas.height - waterY);
    const sunX = canvas.width * (0.7 + rand() * 0.15);
    const sunY = canvas.height * 0.42;
    const sun = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 60);
    sun.addColorStop(0, "rgba(255,210,140,0.95)");
    sun.addColorStop(1, "rgba(255,210,140,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(sunX - 60, sunY - 60, 120, 120);
    for (let i = 0; i < 6; i++) {
      const x = canvas.width * (0.1 + i * 0.12 + rand() * 0.03);
      ctx.strokeStyle = "rgba(20,24,30,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, waterY + 8);
      ctx.lineTo(x, waterY - 40 - rand() * 35);
      ctx.stroke();
      ctx.fillStyle = "rgba(30,34,42,0.7)";
      ctx.beginPath();
      ctx.moveTo(x, waterY + 6);
      ctx.lineTo(x + 28, waterY + 10);
      ctx.lineTo(x - 4, waterY + 14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,180,120,0.12)";
    ctx.fillRect(sunX - 20, waterY, 40, canvas.height - waterY);
    warmWash();
    vignette();
    filmGrain(rand);
  }

  function drawMarket(rand) {
    fillSky(rand, "#1a1e2c", "#3a2a28");
    for (let i = 0; i < 8; i++) {
      const x = i * 78 + rand() * 10;
      const y = canvas.height * (0.48 + rand() * 0.08);
      ctx.fillStyle = rand() > 0.5 ? "#6b3030" : "#3d4a38";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 50, y + 8);
      ctx.lineTo(x + 44, y + 34);
      ctx.lineTo(x - 6, y + 28);
      ctx.closePath();
      ctx.fill();
      const lx = x + 20;
      const ly = y + 18;
      const glow = ctx.createRadialGradient(lx, ly, 2, lx, ly, 28);
      glow.addColorStop(0, "rgba(255,190,90,0.55)");
      glow.addColorStop(1, "rgba(255,190,90,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(lx - 28, ly - 28, 56, 56);
    }
    ctx.fillStyle = "rgba(10,12,18,0.55)";
    for (let i = 0; i < 14; i++) {
      const x = rand() * canvas.width;
      const h = 20 + rand() * 30;
      ctx.fillRect(x, canvas.height - h - 10, 8 + rand() * 10, h);
    }
    warmWash();
    vignette();
    filmGrain(rand);
  }

  function paint() {
    const place = placeFor(seed);
    const rand = mulberry32(seed || 1);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    place.draw(rand);
    placeChip.textContent = place.label;
    canvas.setAttribute("aria-label", `Postcard photograph: ${place.label}`);
    printPhoto.src = canvas.toDataURL("image/png");
  }

  function syncHash() {
    const token = encodeCard(captionEl.value, versoEl.value, seed);
    const next = `#${token}`;
    if (location.hash !== next) {
      history.replaceState(null, "", next);
    }
    updateSoftness();
    printFace.textContent = faceText();
    printVerso.textContent = versoEl.value || "—";
  }

  function updateSoftness() {
    const report = softnessReport(faceText(), versoEl.value);
    if (!versoEl.value.trim() && !captionEl.value.trim()) {
      softnessEl.hidden = true;
      return;
    }
    softnessEl.hidden = false;
    softnessEl.textContent = report.text;
    softnessEl.classList.toggle("ok", report.ok);
  }

  function loadFromHash() {
    const data = decodeCard(location.hash);
    if (data) {
      captionEl.value = data.f;
      versoEl.value = data.v;
      seed = data.s || newSeed();
      paint();
      printFace.textContent = faceText();
      printVerso.textContent = data.v || "—";
      updateSoftness();
      statusEl.textContent =
        "Loaded from the link. Photograph redrawn locally from the seed — nothing was fetched.";
      return;
    }
    seed = newSeed();
    captionEl.value = "";
    versoEl.value = "";
    paint();
    syncHash();
    statusEl.textContent = "A photograph from the drawer. Drawn here; no image host involved.";
  }

  function setFlipped(flipped) {
    cardEl.classList.toggle("is-flipped", flipped);
    $("flip").textContent = flipped ? "Show the face" : "Flip the card";
  }

  $("flip").addEventListener("click", () => {
    setFlipped(!cardEl.classList.contains("is-flipped"));
  });

  $("reshuffle").addEventListener("click", () => {
    const prev = placeFor(seed).id;
    let next = newSeed();
    let guard = 0;
    while (placeFor(next).id === prev && guard++ < 12) next = newSeed();
    seed = next;
    paint();
    setFlipped(false);
    syncHash();
    statusEl.textContent = `Another drawer slot: ${placeFor(seed).label}. Still local.`;
  });

  $("copy-link").addEventListener("click", async () => {
    syncHash();
    try {
      await navigator.clipboard.writeText(location.href);
      statusEl.textContent = "Link copied. Same photograph, same note — still no server.";
    } catch (_) {
      statusEl.textContent = "Copy failed. Select the address bar — the card is already in the URL.";
    }
  });

  $("print-card").addEventListener("click", () => {
    syncHash();
    paint();
    window.print();
  });

  $("clear").addEventListener("click", () => {
    captionEl.value = "";
    versoEl.value = "";
    seed = newSeed();
    setFlipped(false);
    paint();
    syncHash();
    statusEl.textContent = "Thrown out. A new photograph slid forward in the drawer.";
  });

  captionEl.addEventListener("input", syncHash);
  versoEl.addEventListener("input", syncHash);
  window.addEventListener("hashchange", loadFromHash);

  // No third-party calls. Invariant for auditors:
  // this file never calls fetch, XMLHttpRequest, sendBeacon, or WebSocket.
  loadFromHash();
})();
