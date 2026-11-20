/* Abertura idêntica à intro-fluxo-v6: PLAY destrava o áudio (narração combinada + trilha),
   toca o vídeo mudo e, ao terminar, fade de 0,7 s para o jogo. Sem texto na tela além do
   botão PLAY. Sem botão de pular. A mix da abertura segue e cruza com a trilha do Unity aos 32 s. */
(function (g) {
 "use strict";
 const tela = document.getElementById("intro-tela");
 const vid = document.getElementById("intro-vid");
 const btn = document.getElementById("bt-play");
 const aud = document.getElementById("intro-audio");
 const root = document.getElementById("experiencia");
 if (!tela || !vid || !btn || !aud) return;

 const CROSSFADE_AT = 32;
 const CROSSFADE_MS = 4000;
 const FADE_MS = 700;
 const VIDEO_FALLBACK = 5600;
 let started = false, entered = false, fading = false, waitingForUnity = false;

 function tamanho() {
  if (!root) return;
  const box = document.getElementById("unity-container");
  const w = (box && box.clientWidth) || root.clientWidth || 450;
  root.style.setProperty("--lado", w + "px");
 }
 function unlockAudio() {
  try {
   var AC = window.AudioContext || window.webkitAudioContext;
   if (AC && !g.__pageAC) g.__pageAC = new AC();
   if (g.__pageAC && g.__pageAC.resume) g.__pageAC.resume();
  } catch (_) {}
  try {
   if (typeof WEBAudio !== "undefined" && WEBAudio.audioContext && WEBAudio.audioContext.resume) {
    WEBAudio.audioContext.resume();
    try {
     var ctx = WEBAudio.audioContext;
     var buf = ctx.createBuffer(1, 1, ctx.sampleRate || 44100);
     var src = ctx.createBufferSource();
     src.buffer = buf; src.connect(ctx.destination); src.start(0);
    } catch (_) {}
   }
  } catch (_) {}
  g.__unityAudioCtx = (typeof WEBAudio !== "undefined" && WEBAudio.audioContext)
   ? WEBAudio.audioContext.state : "pending";
 }
 function keepUnlocked() {
  unlockAudio();
  if (!started) return;
  var st = (typeof WEBAudio !== "undefined" && WEBAudio.audioContext) ? WEBAudio.audioContext.state : "";
  if (st && st !== "running") setTimeout(keepUnlocked, 250);
 }

 function maybeStartGame() {
  if (!entered) return;
  if (!g.unityInstance) return;
  unlockAudio();
  try { g.unityInstance.SendMessage("Wenceslau", "StartGameFromIntro", ""); } catch (_) {}
 }

 function fadeOutIntro(ms) {
  const t0 = performance.now();
  const v0 = aud.volume;
  function step(now) {
   const k = Math.min(1, (now - t0) / ms);
   aud.volume = Math.max(0, v0 * (1 - k));
   if (k < 1) requestAnimationFrame(step);
   else { try { aud.pause(); } catch (_) {} }
  }
  requestAnimationFrame(step);
 }

 function crossfadeToGame() {
  fadeOutIntro(CROSSFADE_MS);
  if (g.unityInstance) {
   try { g.unityInstance.SendMessage("Wenceslau", "ReleaseMainMusic", ""); } catch (_) {}
  } else {
   g.__pendingReleaseMain = true;
  }
 }

 function enterGame() {
  if (entered || fading) return;
  if (!g.unityInstance) {
   waitingForUnity = true;
   var bar = document.getElementById("unity-loading-bar");
   if (bar) bar.style.display = "block";
   return;
  }
  fading = true;
  entered = true;
  tela.classList.add("saindo");
  maybeStartGame();
  setTimeout(function () {
   tela.hidden = true;
   tela.setAttribute("hidden", "");
   try { vid.pause(); } catch (_) {}
  }, FADE_MS);
 }

 function startIntro(ev) {
  if (started) return;
  started = true;
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  paintPlay("on");
  unlockAudio();
  keepUnlocked();
  if (g.unityInstance) {
   try { g.unityInstance.SendMessage("Wenceslau", "UnlockAudio", ""); } catch (_) {}
  }
  try {
   aud.currentTime = 0;
   aud.volume = 0.92;
   aud.muted = false;
   const p = aud.play();
   if (p && p.catch) p.catch(function () {});
  } catch (_) {}
  btn.hidden = true;
  try {
   vid.muted = true;
   vid.playsInline = true;
   vid.setAttribute("playsinline", "");
   vid.setAttribute("webkit-playsinline", "");
   const p = vid.play();
   if (p && p.catch) p.catch(function () { setTimeout(enterGame, 200); });
  } catch (_) { setTimeout(enterGame, 200); }
  vid.onended = enterGame;
  setTimeout(function () { if (!entered && !waitingForUnity) enterGame(); }, VIDEO_FALLBACK);
  setTimeout(crossfadeToGame, CROSSFADE_AT * 1000);
 }

 /* Fonte 5x7 no mesmo espírito dos botões do jogo (P L A Y). */
 const GLYPH = {
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04]
 };
 function drawText(c, s, x, y, sc, color, shadow) {
  const pass = function (ox, oy, col) {
   c.fillStyle = col;
   let cx = x + ox;
   for (const ch of s) {
    const gl = GLYPH[ch];
    if (gl) {
     for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) if (gl[r] & (16 >> b))
      c.fillRect(cx + b * sc, y + oy + r * sc, sc, sc);
    }
    cx += 6 * sc;
   }
  };
  if (shadow) { pass(sc, sc, shadow); pass(-sc, 0, shadow); pass(0, -sc, shadow); pass(sc, 0, shadow); pass(0, sc, shadow); }
  pass(0, 0, color);
 }
 function frameButton(c, w, h, on) {
  c.fillStyle = "#152d38"; c.fillRect(0, 0, w, h);
  c.fillStyle = on ? "#2a8a9c" : "#0b4252"; c.fillRect(1, 1, w - 2, h - 2);
  c.fillStyle = on ? "#0a3a48" : "#1f6f80"; c.fillRect(1, 1, w - 2, 1); c.fillRect(1, 1, 1, h - 2);
  c.fillStyle = on ? "#7fd0d0" : "#062836"; c.fillRect(1, h - 2, w - 2, 1); c.fillRect(w - 2, 1, 1, h - 2);
 }
 function paintPlay(state) {
  const c = btn.firstElementChild;
  if (!c) return;
  const x = c.getContext("2d");
  const w = c.width, h = c.height;
  x.clearRect(0, 0, w, h);
  const on = state === "on";
  frameButton(x, w, h, on);
  const ink = "#152d38";
  const fill = on ? "#0a3a48" : "#ffd55a";
  const tx = 10, ty = 8;
  const tri = [1, 3, 5, 7, 5, 3, 1];
  x.fillStyle = ink;
  for (let r = 0; r < 7; r++) x.fillRect(tx, ty + r * 2, tri[r] * 2 + 2, 2);
  x.fillStyle = fill;
  for (let r = 0; r < 7; r++) x.fillRect(tx + 2, ty + r * 2, tri[r] * 2, 2);
  drawText(x, "PLAY", 30, 9, 2, on ? "#0a3a48" : "#ffd55a", on ? null : "#152d38");
 }

 function onUnityReady(instance) {
  g.unityInstance = instance;
  unlockAudio();
  if (g.__pendingReleaseMain) {
   g.__pendingReleaseMain = false;
   try { instance.SendMessage("Wenceslau", "ReleaseMainMusic", ""); } catch (_) {}
  }
  if (waitingForUnity || (started && !entered && vid.ended)) enterGame();
  else if (entered) maybeStartGame();
 }

 const cv = document.createElement("canvas");
 cv.width = 112; cv.height = 32;
 btn.appendChild(cv);
 paintPlay("off");
 tamanho();
 window.addEventListener("resize", tamanho);
 btn.addEventListener("pointerdown", startIntro, {passive: false});
 btn.addEventListener("pointerup", function (ev) { ev.stopPropagation(); });
 btn.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); });
 btn.addEventListener("keydown", function (ev) {
  if (ev.code === "Enter" || ev.code === "Space") startIntro(ev);
 });

 g.VaporIntro = {
  started: function () { return started; },
  entered: function () { return entered; },
  fading: function () { return fading; },
  fadeMs: FADE_MS,
  onUnityReady: onUnityReady,
  audio: function () {
   return { paused: aud.paused, time: aud.currentTime || 0, volume: aud.volume, ended: aud.ended, ready: aud.readyState, muted: aud.muted };
  },
  video: function () {
   return { paused: vid.paused, time: vid.currentTime || 0, dur: vid.duration || 0, ended: vid.ended, ready: vid.readyState, muted: vid.muted };
  }
 };
})(window);
