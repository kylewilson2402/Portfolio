/* KYONIC / SIGNAL — flipbook
   <div class="flipbook" data-src="path/p{n}.webp" data-count="17" data-pad="2"
        data-ratio="934/1300" data-blank-before-last data-title="Red Chapters"></div>
   Two page spreads with a 3D page turn on wide screens, one page at a time on phones. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function Flipbook(root) {
    var src = root.getAttribute("data-src");
    var count = parseInt(root.getAttribute("data-count"), 10);
    var pad = parseInt(root.getAttribute("data-pad") || "2", 10);
    var r = (root.getAttribute("data-ratio") || "1/1").split("/");
    var ratio = parseFloat(r[0]) / parseFloat(r[1] || 1);
    var title = root.getAttribute("data-title") || "Book";
    var pdf = root.getAttribute("data-pdf");

    // slots: page objects {n, url} or null for a blank
    var pages = [];
    for (var i = 1; i <= count; i++) pages.push({ n: i, url: src.replace("{n}", String(i).padStart(pad, "0")) });
    var slots = pages.slice();
    if (root.hasAttribute("data-blank-before-last") && slots.length % 2 === 1) slots.splice(slots.length - 1, 0, null);
    if (slots.length % 2 === 1) slots.push(null);
    var L = slots.length / 2;

    var f = 0;       // leaves turned (double mode)
    var s = 0;       // page index (single mode)
    var mode = "", leaves = [], book, stage, single, count$, range, prevB, nextB, busy = false;

    root.setAttribute("tabindex", "0");
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", title + " flipbook. Use the arrow keys to turn pages.");

    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function imgFor(slot, eager) {
      if (!slot) return null;
      var im = new Image(); im.alt = title + ", page " + slot.n; im.decoding = "async"; im.draggable = false;
      if (eager) im.src = slot.url; else im.setAttribute("data-src", slot.url);
      return im;
    }
    function hydrate(scope) { scope.querySelectorAll("img[data-src]").forEach(function (im) { im.src = im.getAttribute("data-src"); im.removeAttribute("data-src"); }); }

    function build() {
      var want = root.clientWidth < 700 ? "single" : "double";
      if (want === mode) { size(); return; }
      if (mode === "double") s = Math.max(0, pageIndexForSpread());
      if (mode === "single") f = spreadForPage(s);
      mode = want;
      root.innerHTML = "";
      stage = el("div", "fb-stage");
      prevB = el("button", "fb-hint prev", "←"); prevB.type = "button"; prevB.setAttribute("aria-label", "Previous page");
      nextB = el("button", "fb-hint next", "→"); nextB.type = "button"; nextB.setAttribute("aria-label", "Next page");
      prevB.addEventListener("click", function (e) { e.stopPropagation(); prev(); });
      nextB.addEventListener("click", function (e) { e.stopPropagation(); next(); });

      if (mode === "double") {
        book = el("div", "fb-book");
        leaves = [];
        for (var i = 0; i < L; i++) {
          var leaf = el("div", "fb-leaf"), fr = el("div", "fb-face front"), bk = el("div", "fb-face back");
          var a = slots[2 * i], b = slots[2 * i + 1];
          if (a) fr.appendChild(imgFor(a, Math.abs(i - f) <= 1)); else fr.classList.add("blank");
          if (b) bk.appendChild(imgFor(b, Math.abs(i - f) <= 1)); else bk.classList.add("blank");
          leaf.appendChild(fr); leaf.appendChild(bk); leaf.appendChild(el("div", "shade"));
          if (i < f) leaf.classList.add("is-flipped");
          book.appendChild(leaf); leaves.push(leaf);
        }
        book.addEventListener("click", function (e) {
          var rc = book.getBoundingClientRect();
          if (e.clientX > rc.left + rc.width / 2) next(); else prev();
        });
        stage.appendChild(book);
      } else {
        single = el("div", "fb-single");
        stage.appendChild(single);
        single.addEventListener("click", function (e) {
          var rc = single.getBoundingClientRect();
          if (e.clientX > rc.left + rc.width * 0.4) next(); else prev();
        });
      }
      if (mode === "double") { stage.appendChild(prevB); stage.appendChild(nextB); }
      root.appendChild(stage);

      // swipe
      var sx = null;
      stage.addEventListener("pointerdown", function (e) { sx = e.clientX; });
      stage.addEventListener("pointerup", function (e) { if (sx == null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 45) { dx < 0 ? next() : prev(); } });

      var bar = el("div", "fb-bar");
      count$ = el("span", "fb-count");
      range = el("input", "fb-range"); range.type = "range"; range.min = 0; range.step = 1;
      range.max = mode === "double" ? L : pages.length - 1;
      range.setAttribute("aria-label", "Jump to page");
      range.addEventListener("input", function () { go(parseInt(range.value, 10)); });
      var fs = el("button", "fb-btn", "Fullscreen"); fs.type = "button";
      fs.addEventListener("click", function () {
        if (document.fullscreenElement) document.exitFullscreen();
        else if (root.requestFullscreen) root.requestFullscreen();
      });
      if (mode === "single") { prevB.classList.add("inline"); nextB.classList.add("inline"); bar.appendChild(prevB); }
      bar.appendChild(count$);
      if (mode === "single") bar.appendChild(nextB);
      bar.appendChild(range);
      if (root.requestFullscreen) bar.appendChild(fs);
      if (pdf) { var dl = el("a", "fb-btn", "PDF ↓"); dl.href = pdf; dl.setAttribute("download", ""); bar.appendChild(dl); }
      root.appendChild(bar);
      var tip = el("div", "fb-tip", mode === "double" ? "Click the right page to turn · arrow keys work too" : "Tap or swipe to turn the page");
      root.appendChild(tip);
      size(); render(true);
    }

    function size() {
      var fsMode = document.fullscreenElement === root;
      var maxH = fsMode ? window.innerHeight - 140 : Math.min(window.innerHeight * 0.8, 880);
      if (mode === "double") {
        var avail = root.clientWidth - 130;
        var pw = Math.min(avail / 2, maxH * ratio), ph = pw / ratio;
        book.style.width = (pw * 2) + "px"; book.style.height = ph + "px";
      } else {
        var w = Math.min(root.clientWidth - 8, (maxH) * ratio);
        single.style.width = w + "px"; single.style.height = (w / ratio) + "px";
      }
    }

    function zFix() {
      leaves.forEach(function (lf, i) { lf.style.zIndex = i < f ? (i + 1) : (L - i + L); });
    }
    function pageIndexForSpread() { // first visible real page for current spread
      if (f === 0) return 0;
      var idx = slots[2 * f - 1] || slots[2 * f];
      return idx ? idx.n - 1 : pages.length - 1;
    }
    function spreadForPage(p) {
      var pos = slots.indexOf(pages[p]);
      return Math.min(L, Math.ceil(pos / 2));
    }

    function render(instant) {
      if (mode === "double") {
        zFix();
        var shift = f === 0 ? -25 : (f === L ? 25 : 0);
        book.style.transform = "translateX(" + shift + "%)";
        for (var k = Math.max(0, f - 2); k <= Math.min(L - 1, f + 1); k++) hydrate(leaves[k]);
        prevB.disabled = f === 0; nextB.disabled = f === L;
        range.value = f;
        var a = slots[2 * f - 1], b = slots[2 * f];
        var label;
        if (f === 0) label = "Cover";
        else if (f === L) label = "Back cover";
        else label = [a, b].filter(Boolean).map(function (x) { return x.n; }).join("–");
        count$.textContent = label + " / " + pages.length;
      } else {
        if (instant || !single.firstChild) {
          single.innerHTML = "";
          var pg = el("div", "pg"); pg.appendChild(imgFor(pages[s], true)); single.appendChild(pg);
        }
        prevB.disabled = s === 0; nextB.disabled = s === pages.length - 1;
        range.value = s;
        count$.textContent = (s === 0 ? "Cover" : s === pages.length - 1 ? "Back cover" : "Page " + (s + 1)) + " / " + pages.length;
        if (pages[s + 1]) { var pre = new Image(); pre.src = pages[s + 1].url; }
      }
    }

    function turn(i, dir, delay) {
      var lf = leaves[i];
      setTimeout(function () {
        lf.style.zIndex = 500 + i;
        lf.classList.add("is-moving");
        if (dir > 0) lf.classList.add("is-flipped"); else lf.classList.remove("is-flipped");
        setTimeout(function () { lf.classList.remove("is-moving"); zFix(); }, reduce ? 20 : 900);
      }, delay || 0);
    }

    function next() {
      if (mode === "double") { if (f >= L) return; turn(f, 1); f++; render(); }
      else singleGo(s + 1, 1);
    }
    function prev() {
      if (mode === "double") { if (f <= 0) return; f--; turn(f, -1); render(); }
      else singleGo(s - 1, -1);
    }
    function go(n) {
      if (mode === "double") {
        n = Math.max(0, Math.min(L, n)); if (n === f) return;
        var dir = n > f ? 1 : -1, step = 0;
        if (dir > 0) for (var i = f; i < n; i++) turn(i, 1, (step++) * 70);
        else for (var j = f - 1; j >= n; j--) turn(j, -1, (step++) * 70);
        f = n; render();
      } else singleGo(n, n > s ? 1 : -1);
    }
    function singleGo(n, dir) {
      if (n < 0 || n >= pages.length || n === s || busy) return;
      var old = single.firstChild; s = n;
      if (reduce || !old) { render(true); return; }
      busy = true;
      old.classList.add(dir > 0 ? "out-next" : "out-prev");
      setTimeout(function () {
        single.innerHTML = "";
        var pg = el("div", "pg " + (dir > 0 ? "in-next" : "in-prev")); pg.appendChild(imgFor(pages[s], true)); single.appendChild(pg);
        busy = false; render();
      }, 300);
      render();
    }

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    });
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(build, 120); });
    document.addEventListener("fullscreenchange", function () { setTimeout(build, 60); setTimeout(size, 200); });
    build();
  }

  document.querySelectorAll(".flipbook").forEach(function (fb) { new Flipbook(fb); });
})();
