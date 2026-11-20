(function () {
  "use strict";

  var DIR = {
    Up: { label: "Arriba", arrow: "↑", rot: "0deg" },
    Right: { label: "Derecha", arrow: "→", rot: "90deg" },
    Down: { label: "Abajo", arrow: "↓", rot: "180deg" },
    Left: { label: "Izquierda", arrow: "←", rot: "270deg" }
  };

  var ARROW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4.5 18.5 13H14.2v6.5h-4.4V13H5.5Z"></path></svg>';
  var STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path class="star-line" d="M12 3.4 14.5 8.7l5.8.7-4.3 3.9 1.2 5.7L12 16.3 6.8 19l1.2-5.7L3.7 9.4l5.8-.7Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"></path>' +
    '<path class="star-fill" d="M12 2.8 14.7 8.6l6.3.7-4.7 4.2 1.3 6.2L12 16.4 6.4 19.7 7.7 13.5 3 9.3l6.3-.7Z" fill="currentColor"></path>' +
    "</svg>";

  var cheats = [];
  var kind = "Todos";
  var favs = new Set();

  var listEl = document.getElementById("lista");
  var countEl = document.getElementById("cuenta");
  var errorEl = document.getElementById("error");
  var noticeEl = document.getElementById("aviso");
  var searchEl = document.getElementById("q");
  var formEl = document.getElementById("buscar");

  function fold(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function platform() {
    return document.documentElement.dataset.plat === "xbox" ? "xbox" : "ps5";
  }

  function syncPlatformAria() {
    var current = platform();
    ["ps5", "xbox"].forEach(function (id) {
      var button = document.getElementById("plat-" + id);
      button.setAttribute("aria-checked", id === current ? "true" : "false");
    });
  }

  function loadFavs() {
    try {
      var raw = JSON.parse(localStorage.getItem("gta6-favoritos") || "[]");
      if (!Array.isArray(raw)) return new Set();
      return new Set(raw.filter(function (name) { return typeof name === "string"; }));
    } catch (err) {
      return new Set();
    }
  }

  function saveFavs() {
    localStorage.setItem("gta6-favoritos", JSON.stringify(Array.from(favs)));
  }

  function sequenceOf(cheat) {
    var seq = cheat[platform()];
    if (!Array.isArray(seq) || seq.length === 0) return null;
    return seq;
  }

  function codeText(seq) {
    return seq.map(function (dir) {
      return DIR[dir] ? DIR[dir].arrow : dir;
    }).join(" ");
  }

  function codeLabel(seq) {
    return seq.map(function (dir) {
      return DIR[dir] ? DIR[dir].label : dir;
    }).join(", ");
  }

  function keycaps(seq) {
    return seq.map(function (dir) {
      var info = DIR[dir];
      if (!info) return '<span class="keycap">' + esc(dir) + "</span>";
      return '<span class="keycap" style="--rot:' + info.rot + '" title="' + info.label + '">' + ARROW_SVG + "</span>";
    }).join("");
  }

  function haystack(cheat) {
    return fold([cheat.name, cheat.what, cheat.unlock || "", cheat.kind].join(" "));
  }

  function render() {
    var query = fold(searchEl.value.trim());
    var shown = cheats.filter(function (cheat) {
      if (kind !== "Todos" && cheat.kind !== kind) return false;
      if (!query) return true;
      return haystack(cheat).indexOf(query) !== -1;
    });

    if (shown.length === 0) {
      countEl.textContent = "Ningún truco coincide con la búsqueda.";
      countEl.classList.add("is-empty");
    } else if (shown.length === cheats.length) {
      countEl.textContent = cheats.length + " trucos";
      countEl.classList.remove("is-empty");
    } else {
      countEl.textContent = shown.length + " de " + cheats.length + " trucos";
      countEl.classList.remove("is-empty");
    }

    listEl.innerHTML = shown.map(cardHtml).join("");
    listEl.setAttribute("aria-busy", "false");
  }

  function cardHtml(cheat) {
    var seq = sequenceOf(cheat);
    var pressed = favs.has(cheat.name);
    var favLabel = (pressed ? "Quitar " : "Guardar ") + cheat.name + (pressed ? " de favoritos" : " en favoritos");
    var codeBlock;

    if (seq) {
      var text = codeText(seq);
      codeBlock =
        '<div class="keys" role="img" aria-label="Código: ' + esc(codeLabel(seq)) + '">' + keycaps(seq) + "</div>" +
        '<button type="button" class="copy" data-code="' + esc(text) + '" aria-label="Copiar código de ' + esc(cheat.name) + '">Copiar</button>';
    } else {
      codeBlock =
        '<p class="pending">Código aún no confirmado</p>' +
        '<button type="button" class="copy" aria-disabled="true" aria-label="No se puede copiar el código de ' + esc(cheat.name) + ' porque aún no está confirmado">Copiar</button>';
    }

    var unlock = cheat.unlock
      ? '<p class="unlock"><span class="unlock-label">Desbloqueo</span> ' + esc(cheat.unlock) + "</p>"
      : "";

    return (
      '<article class="cheat" data-kind="' + esc(cheat.kind) + '">' +
        '<div class="cheat-top">' +
          "<h3 class=\"cheat-name\">" + esc(cheat.name) + "</h3>" +
          '<span class="badge">' + esc(cheat.kind) + "</span>" +
          '<button type="button" class="fav" data-name="' + esc(cheat.name) + '" aria-pressed="' + (pressed ? "true" : "false") + '" aria-label="' + esc(favLabel) + '">' + STAR_SVG + "</button>" +
        "</div>" +
        '<p class="cheat-what">' + esc(cheat.what) + "</p>" +
        '<div class="code-row">' + codeBlock + "</div>" +
        unlock +
      "</article>"
    );
  }

  function setKind(next) {
    kind = next;
    document.querySelectorAll(".chip").forEach(function (chip) {
      chip.setAttribute("aria-checked", chip.dataset.kind === next ? "true" : "false");
    });
    render();
  }

  function setPlatform(next) {
    if (next !== "ps5" && next !== "xbox") return;
    document.documentElement.dataset.plat = next;
    try { localStorage.setItem("gta6-plataforma", next); } catch (err) {}
    syncPlatformAria();
    render();
  }

  function wireRadios(container, choose) {
    container.addEventListener("keydown", function (ev) {
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].indexOf(ev.key) === -1) return;
      var buttons = Array.prototype.slice.call(container.querySelectorAll('[role="radio"]'));
      var index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      ev.preventDefault();
      var dir = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : -1;
      var next = buttons[(index + dir + buttons.length) % buttons.length];
      next.focus();
      choose(next);
    });
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      try {
        var area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        var ok = document.execCommand("copy");
        area.remove();
        return ok;
      } catch (fallbackErr) {
        return false;
      }
    }
  }

  function bind() {
    favs = loadFavs();
    syncPlatformAria();

    formEl.addEventListener("submit", function (ev) { ev.preventDefault(); });
    searchEl.addEventListener("input", render);

    document.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () { setKind(chip.dataset.kind); });
    });
    wireRadios(document.querySelector(".chips"), function (button) { setKind(button.dataset.kind); });

    document.getElementById("plat-ps5").addEventListener("click", function () { setPlatform("ps5"); });
    document.getElementById("plat-xbox").addEventListener("click", function () { setPlatform("xbox"); });
    wireRadios(document.querySelector(".segment"), function (button) {
      setPlatform(button.id === "plat-xbox" ? "xbox" : "ps5");
    });

    listEl.addEventListener("click", function (ev) {
      var fav = ev.target.closest(".fav");
      if (fav) {
        var name = fav.getAttribute("data-name");
        var on = !favs.has(name);
        if (on) favs.add(name);
        else favs.delete(name);
        try { saveFavs(); } catch (err) {}
        fav.setAttribute("aria-pressed", on ? "true" : "false");
        fav.setAttribute("aria-label", (on ? "Quitar " : "Guardar ") + name + (on ? " de favoritos" : " en favoritos"));
        return;
      }

      var copy = ev.target.closest(".copy");
      if (!copy || copy.getAttribute("aria-disabled") === "true") return;
      var text = copy.getAttribute("data-code");
      copyText(text).then(function (ok) {
        noticeEl.textContent = ok
          ? "Código copiado: " + text
          : "No se pudo copiar el código.";
        copy.classList.toggle("is-done", ok);
        copy.textContent = ok ? "Copiado" : "Copiar";
        clearTimeout(copy._timer);
        copy._timer = setTimeout(function () {
          copy.classList.remove("is-done");
          copy.textContent = "Copiar";
        }, 1600);
      });
    });
  }

  async function init() {
    bind();
    try {
      var response = await fetch(new URL("cheats.json", document.baseURI));
      if (!response.ok) throw new Error("HTTP " + response.status);
      var data = await response.json();
      if (!Array.isArray(data)) throw new Error("formato");
      cheats = data;
      errorEl.hidden = true;
      render();
    } catch (err) {
      listEl.setAttribute("aria-busy", "false");
      countEl.textContent = "";
      errorEl.hidden = false;
      errorEl.textContent = "No se pudieron cargar los trucos. Recarga la página.";
    }
  }

  init();
})();
