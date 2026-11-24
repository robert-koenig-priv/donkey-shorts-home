/* The Donkey Shorts — "Alle abspielen" für die SoundCloud-Player im Audio-Bereich.
   Spielt alle Tracks nacheinander ab und beginnt nach dem letzten wieder beim ersten.
   "Nächster Song" springt zum nächsten Track.
   Startet man einen Track manuell, werden die anderen pausiert und die Reihe läuft
   ab diesem Track weiter. Nutzt die SoundCloud Widget API (w.soundcloud.com/player/api.js).
   Läuft nur im Freundes-Modus (html.friends), sonst ist der Audio-Bereich ausgeblendet. */
(function () {
  "use strict";

  var btn = document.getElementById("playAllBtn");
  if (!btn || !document.documentElement.classList.contains("friends")) return;

  var frames = [].slice.call(document.querySelectorAll("#audio iframe.sc-player"));
  if (!frames.length) return;

  var widgets = [];
  var ready = [];      // Promise je Player: aufgelöst, sobald er Befehle annimmt
  var current = -1;   // Index des aktuellen Tracks
  var active = false; // läuft gerade die "Alle abspielen"-Reihe?
  var setupPromise = null;

  function loadApi() {
    return new Promise(function (resolve, reject) {
      if (window.SC && window.SC.Widget) return resolve();
      var s = document.createElement("script");
      s.src = "https://w.soundcloud.com/player/api.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function setup() {
    if (setupPromise) return setupPromise;
    setupPromise = loadApi().then(function () {
      var E = SC.Widget.Events;
      frames.forEach(function (frame, i) {
        var w = SC.Widget(frame);
        widgets[i] = w;
        ready[i] = new Promise(function (resolve) { w.bind(E.READY, resolve); });

        w.bind(E.PLAY, function () {
          if (i !== current) { current = i; mark(); }
          pauseOthers(i);
        });

        w.bind(E.FINISH, function () {
          if (active && i === current) playAt((i + 1) % frames.length, true);
        });

        // Manuelles Pausieren im Player beendet die Reihe. Kurz warten, denn am
        // Track-Ende kommt ebenfalls ein PAUSE, dann ist "current" aber schon weiter.
        w.bind(E.PAUSE, function () {
          setTimeout(function () {
            if (active && i === current) setActive(false);
          }, 600);
        });
      });
    });
    return setupPromise;
  }

  function pauseOthers(i) {
    widgets.forEach(function (w, j) { if (j !== i) w.pause(); });
  }

  function mark() {
    frames.forEach(function (f, j) {
      var card = f.closest(".audio-card");
      if (card) card.classList.toggle("is-playing", j === current);
    });
  }

  function playAt(i, fromStart) {
    current = i;
    mark();
    var w = widgets[i];
    // Befehle an einen noch nicht bereiten Player gehen verloren, daher warten.
    ready[i].then(function () {
      if (current !== i) return;
      if (fromStart) w.seekTo(0);
      w.play();
    });
    var card = frames[i].closest(".audio-card");
    if (card && fromStart) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setActive(on) {
    active = on;
    btn.textContent = on ? "⏸ Stopp" : "▶ Alle abspielen";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  btn.addEventListener("click", function () {
    if (active) {
      setActive(false);
      if (current >= 0) widgets[current].pause();
      return;
    }
    // Lazy-Player sofort laden, damit alle Tracks bereitstehen.
    frames.forEach(function (f) { f.loading = "eager"; });
    setActive(true);
    setup().then(function () {
      playAt(current < 0 ? 0 : current, false);
    }).catch(function () {
      setActive(false);
    });
  });

  // "Nächster Song": springt zum nächsten Track (nach dem letzten zum ersten)
  // und lässt die Reihe von dort aus weiterlaufen.
  var nextBtn = document.getElementById("playNextBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      frames.forEach(function (f) { f.loading = "eager"; });
      setActive(true);
      setup().then(function () {
        if (current >= 0) widgets[current].pause();
        playAt((current + 1) % frames.length, true);
      }).catch(function () {
        setActive(false);
      });
    });
  }

  // API früh laden, damit auch beim manuellen Abspielen nur ein Track gleichzeitig läuft.
  setup().catch(function () {});
})();
