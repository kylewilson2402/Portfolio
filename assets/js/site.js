/* KYONIC / SIGNAL — site behaviour */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function store(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- static noise painter (shared by intro + page flash) ---------- */
  function staticNoise(canvas, tint) {
    var ctx = canvas.getContext("2d");
    var w = canvas.width = 160, h = canvas.height = 90;
    var img = ctx.createImageData(w, h), d = img.data, raf = 0, on = true;
    function frame() {
      for (var i = 0; i < d.length; i += 4) {
        var v = Math.random() * 255 | 0;
        var band = (i / 4 / w | 0) % 7 === 0 ? 0.55 : 1;
        if (tint && Math.random() < 0.06) { d[i] = 43; d[i + 1] = 59; d[i + 2] = 255; }
        else { d[i] = d[i + 1] = d[i + 2] = v * band; }
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      if (on) raf = requestAnimationFrame(frame);
    }
    frame();
    return function stop() { on = false; cancelAnimationFrame(raf); };
  }

  /* ---------- INTRO (home only, once per session) ---------- */
  var intro = document.getElementById("intro");
  if (intro) {
    var seen = store("kyonic-intro");
    if (seen || reduce) {
      doc.classList.add("no-intro");
      intro.remove();
      startHero(0);
    } else {
      document.body.style.overflow = "hidden";
      var stop = staticNoise(intro.querySelector("canvas"), true);
      var pct = intro.querySelector("[data-pct]");
      var bars = intro.querySelectorAll(".bars i");
      var status = intro.querySelector("[data-status]");
      var t0 = performance.now(), done = false, timers = [];
      (function count() {
        if (done) return;
        var p = Math.min(100, Math.round((performance.now() - t0) / 14));
        if (pct) pct.textContent = String(p).padStart(3, "0");
        for (var i = 0; i < bars.length; i++) bars[i].classList.toggle("on", p >= (i + 1) * 24);
        if (p < 100) requestAnimationFrame(count);
      })();
      var finish = function () {
        if (done) return; done = true;
        timers.forEach(clearTimeout);
        intro.classList.add("is-out");
        setTimeout(function () {
          stop(); intro.classList.add("is-gone");
          document.body.style.overflow = "";
          store("kyonic-intro", "1");
          startHero(120);
          setTimeout(function () { intro.remove(); }, 600);
        }, 620);
      };
      timers.push(setTimeout(function () { intro.classList.add("is-tuned"); if (status) status.textContent = "Signal locked"; }, 650));
      timers.push(setTimeout(function () { intro.classList.add("is-switch"); if (status) status.textContent = "Switching colourway"; }, 2250));
      timers.push(setTimeout(finish, 3050));
      intro.addEventListener("click", finish);
      document.addEventListener("keydown", function k(e) { if (!done) { finish(); } document.removeEventListener("keydown", k); });
    }
  } else {
    pageFlashIn();
  }

  /* ---------- hero: typing roles + periodic glitch ---------- */
  function startHero(delay) {
    var wm = document.querySelector(".hero .wordmark");
    if (wm && !reduce) {
      setTimeout(function () { glitch(wm); }, delay + 250);
      setInterval(function () { if (!document.hidden) glitch(wm); }, 5200);
      wm.addEventListener("mouseenter", function () { glitch(wm); });
    }
    var roles = document.querySelector("[data-roles]");
    if (roles) {
      var list = JSON.parse(roles.getAttribute("data-roles"));
      var out = roles.querySelector(".txt"), ri = 0, ci = 0, del = false;
      if (reduce) { out.textContent = list.join(" · "); return; }
      (function type() {
        var word = list[ri];
        out.textContent = word.slice(0, ci);
        if (!del && ci < word.length) { ci++; setTimeout(type, 55); }
        else if (!del) { del = true; setTimeout(type, 1800); }
        else if (ci > 0) { ci--; setTimeout(type, 22); }
        else { del = false; ri = (ri + 1) % list.length; setTimeout(type, 250); }
      })();
    }
  }
  function glitch(el) {
    el.classList.remove("is-glitch"); void el.offsetWidth; el.classList.add("is-glitch");
    setTimeout(function () { el.classList.remove("is-glitch"); }, 450);
  }

  /* ---------- page flash: brief static on arrival / departure ---------- */
  function pageFlashIn() {
    if (reduce) return;
    var f = document.createElement("div");
    f.className = "flash is-on"; f.innerHTML = "<canvas></canvas>";
    document.body.appendChild(f);
    var stop = staticNoise(f.querySelector("canvas"), true);
    setTimeout(function () { f.classList.add("is-fade"); }, 140);
    setTimeout(function () { stop(); f.remove(); }, 650);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || reduce || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || a.target === "_blank" || /^(mailto|tel|https?):/i.test(href) || a.hasAttribute("download")) return;
    e.preventDefault();
    var f = document.createElement("div");
    f.className = "flash"; f.innerHTML = "<canvas></canvas>";
    document.body.appendChild(f);
    staticNoise(f.querySelector("canvas"), true);
    requestAnimationFrame(function () { f.classList.add("is-on"); });
    setTimeout(function () { window.location.href = a.href; }, 180);
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted) document.querySelectorAll(".flash").forEach(function (f) { f.remove(); }); });

  /* ---------- nav ---------- */
  var nav = document.querySelector(".nav");
  if (nav) {
    var lastY = 0;
    var onScroll = function () {
      var y = window.scrollY;
      nav.classList.toggle("is-solid", y > 40);
      if (!nav.classList.contains("is-open")) nav.classList.toggle("is-hidden", y > 400 && y > lastY + 4);
      if (y < lastY - 4) nav.classList.remove("is-hidden");
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    var mb = nav.querySelector(".menu-btn");
    if (mb) mb.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      mb.setAttribute("aria-expanded", open); mb.textContent = open ? "Close" : "Menu";
      document.body.style.overflow = open ? "hidden" : "";
    });
    nav.querySelectorAll(".nav-links a").forEach(function (a) { a.addEventListener("click", function () { if (nav.classList.contains("is-open")) mb.click(); }); });
  }

  /* ---------- clock / timecode ---------- */
  var clocks = document.querySelectorAll("[data-clock]");
  var tcs = document.querySelectorAll("[data-tc]");
  var tStart = Date.now();
  function tickClock() {
    var now = new Date();
    var s = "";
    try { s = now.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }); } catch (e) { s = now.toTimeString().slice(0, 8); }
    clocks.forEach(function (c) { c.textContent = "NYC " + s; });
    var el = (Date.now() - tStart) / 1000, f = Math.floor((el % 1) * 24);
    var tc = [Math.floor(el / 3600), Math.floor(el / 60) % 60, Math.floor(el) % 60, f].map(function (n) { return String(n).padStart(2, "0"); }).join(":");
    tcs.forEach(function (c) { c.textContent = "TC " + tc; });
  }
  if (clocks.length || tcs.length) { tickClock(); setInterval(tickClock, 1000 / 12); }

  /* ---------- reveal on scroll ---------- */
  var rev = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    rev.forEach(function (r) { io.observe(r); });
  } else rev.forEach(function (r) { r.classList.add("is-in"); });

  /* ---------- tile glitch layers (uses the tile's own image) ---------- */
  document.querySelectorAll(".tile-media").forEach(function (m) {
    var img = m.querySelector("img"); if (!img) return;
    ["lr", "lc"].forEach(function (c) { var l = document.createElement("span"); l.className = "layer " + c; l.style.backgroundImage = "url('" + img.getAttribute("src") + "')"; m.appendChild(l); });
  });

  /* ---------- lightbox ---------- */
  var frames = Array.prototype.slice.call(document.querySelectorAll("[data-lb]"));
  if (frames.length) {
    var lb = document.createElement("div");
    lb.className = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Image viewer");
    lb.innerHTML = '<div class="lb-top"><span class="lb-cap"></span><button type="button" data-x>Close ✕</button></div><div class="lb-img"><img alt=""></div><div class="lb-bot"><button type="button" data-p>← Prev</button><span class="lb-n mono" style="align-self:center;font-size:12px;color:var(--paper-dim)"></span><button type="button" data-n>Next →</button></div>';
    document.body.appendChild(lb);
    var lbImg = lb.querySelector("img"), cap = lb.querySelector(".lb-cap"), num = lb.querySelector(".lb-n"), cur = 0, group = [], lastFocus;
    function show(i) {
      cur = (i + group.length) % group.length;
      var f = group[cur], im = f.querySelector("img");
      lbImg.src = f.getAttribute("data-full") || im.currentSrc || im.src;
      lbImg.alt = im.alt; cap.textContent = f.getAttribute("data-cap") || im.alt;
      num.textContent = (cur + 1) + " / " + group.length;
    }
    function open(f) {
      var g = f.getAttribute("data-lb");
      group = frames.filter(function (x) { return x.getAttribute("data-lb") === g; });
      lastFocus = f; show(group.indexOf(f));
      lb.classList.add("is-open"); document.body.style.overflow = "hidden"; lb.querySelector("[data-x]").focus();
    }
    function close() { lb.classList.remove("is-open"); document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
    frames.forEach(function (f) { f.addEventListener("click", function () { open(f); }); });
    lb.querySelector("[data-x]").addEventListener("click", close);
    lb.querySelector("[data-p]").addEventListener("click", function () { show(cur - 1); });
    lb.querySelector("[data-n]").addEventListener("click", function () { show(cur + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-img")) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Escape") close(); else if (e.key === "ArrowRight") show(cur + 1); else if (e.key === "ArrowLeft") show(cur - 1);
    });
  }

  /* ---------- year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (y) { y.textContent = new Date().getFullYear(); });
})();
