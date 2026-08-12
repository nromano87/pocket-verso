(() => {
  "use strict";

  // Pocket Verso — all state lives in the URL fragment.
  // No fetch, no XHR, no beacons, no storage. A stranger's card
  // never leaves the tab unless they copy the link themselves.

  const $ = (id) => document.getElementById(id);
  const faceEl = $("face");
  const versoEl = $("verso");
  const cardEl = $("card");
  const statusEl = $("status");
  const softnessEl = $("softness");
  const printFace = $("print-face");
  const printVerso = $("print-verso");

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

  function encodeCard(face, verso) {
    const payload = JSON.stringify({ f: face, v: verso });
    const bytes = new TextEncoder().encode(payload);
    let bin = "";
    bytes.forEach((b) => {
      bin += String.fromCharCode(b);
    });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeCard(hash) {
    const raw = (hash || "").replace(/^#/, "").trim();
    if (!raw) return { f: "", v: "" };
    try {
      const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
      const bin = atob(b64 + pad);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const json = new TextDecoder().decode(bytes);
      const data = JSON.parse(json);
      return {
        f: typeof data.f === "string" ? data.f.slice(0, 480) : "",
        v: typeof data.v === "string" ? data.v.slice(0, 480) : "",
      };
    } catch (_) {
      return { f: "", v: "" };
    }
  }

  function words(s) {
    return (s.toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => w.length > 2);
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
    if (!f) {
      return {
        ok: true,
        text: "No face yet — the reverse is waiting for something to stand behind.",
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
    if (v.length > f.length * 1.6 && v.length > 120) {
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

  function syncHash() {
    const token = encodeCard(faceEl.value, versoEl.value);
    const next = token ? `#${token}` : "#";
    if (location.hash !== next && location.hash !== (token ? `#${token}` : "")) {
      history.replaceState(null, "", token ? next : location.pathname + location.search);
    }
    updateSoftness();
    printFace.textContent = faceEl.value || "—";
    printVerso.textContent = versoEl.value || "—";
  }

  function updateSoftness() {
    const report = softnessReport(faceEl.value, versoEl.value);
    if (!faceEl.value.trim() && !versoEl.value.trim()) {
      softnessEl.hidden = true;
      return;
    }
    softnessEl.hidden = false;
    softnessEl.textContent = report.text;
    softnessEl.classList.toggle("ok", report.ok);
  }

  function loadFromHash() {
    const data = decodeCard(location.hash);
    faceEl.value = data.f;
    versoEl.value = data.v;
    printFace.textContent = data.f || "—";
    printVerso.textContent = data.v || "—";
    updateSoftness();
    if (data.f || data.v) {
      statusEl.textContent = "Loaded from the link. Nothing was fetched — the card was in the URL.";
    }
  }

  function setFlipped(flipped) {
    cardEl.classList.toggle("is-flipped", flipped);
    $("flip").textContent = flipped ? "Show the face" : "Flip the card";
  }

  $("flip").addEventListener("click", () => {
    setFlipped(!cardEl.classList.contains("is-flipped"));
  });

  $("copy-link").addEventListener("click", async () => {
    syncHash();
    const url = location.href;
    try {
      await navigator.clipboard.writeText(url);
      statusEl.textContent = "Link copied. Anyone who opens it gets both sides — still no server.";
    } catch (_) {
      statusEl.textContent = "Copy failed. Select the address bar instead — the card is already in the URL.";
    }
  });

  $("print-card").addEventListener("click", () => {
    syncHash();
    window.print();
  });

  $("clear").addEventListener("click", () => {
    faceEl.value = "";
    versoEl.value = "";
    setFlipped(false);
    history.replaceState(null, "", location.pathname + location.search);
    updateSoftness();
    statusEl.textContent = "Thrown out. The drawer is empty again.";
  });

  faceEl.addEventListener("input", syncHash);
  versoEl.addEventListener("input", syncHash);
  window.addEventListener("hashchange", loadFromHash);

  // No third-party calls. Invariant for auditors:
  // this file never calls fetch, XMLHttpRequest, sendBeacon, or WebSocket.
  loadFromHash();
})();
