/* ============================================================
   Menusprijzen.nl — shared behaviour
   - injects the dark header + footer (one source of truth)
   - hero live-search + header search modal (client-side index)
   - price-history line charts (Chart.js, loaded per page)
   - prijsvergelijker compare widget
   ============================================================ */
(function () {
  "use strict";

  var NAV = [
    { href: "index.html",           label: "Home" },
    { href: "restaurants.html",     label: "Restaurants", badge: ["pop", "Populair"] },
    { href: "prijsvergelijker.html",label: "Prijsvergelijker", badge: ["tip", "Tip!"] },
    { href: "nieuws.html",          label: "Nieuws" },
    { href: "recepten.html",        label: "Recepten" },
    { href: "trends.html",          label: "Trends", badge: ["new", "Nieuw"] },
    { href: "zelf-maken.html",      label: "Zelf maken" },
    { href: "over-ons.html",        label: "Over ons" }
  ];

  var FOOTER_LINKS = [
    { href: "privacy.html",             label: "Cookie- en privacybeleid" },
    { href: "voorwaarden.html",         label: "Algemene voorwaarden" },
    { href: "over-ons.html",            label: "Over ons" },
    { href: "contact.html",             label: "Contact" }
  ];

  /* what the search box can find — pages + tracked chains */
  var SEARCH_INDEX = [
    { t: "McDonald's prijzen",     u: "mcdonalds-prijzen.html", k: "Prijslijst" },
    { t: "KFC prijzen",            u: "kfc-prijzen.html",   k: "Prijslijst" },
    { t: "Burger King prijzen",    u: "burger-king-prijzen.html", k: "Prijslijst" },
    { t: "Subway prijzen",         u: "subway-prijzen.html", k: "Prijslijst" },
    { t: "Starbucks prijzen",      u: "starbucks-prijzen.html", k: "Prijslijst" },
    { t: "Domino's Pizza prijzen", u: "dominos-prijzen.html", k: "Prijslijst" },
    { t: "New York Pizza prijzen", u: "new-york-pizza-prijzen.html", k: "Prijslijst" },
    { t: "FEBO prijzen",           u: "febo-prijzen.html", k: "Prijslijst" },
    { t: "Kwalitaria prijzen",     u: "kwalitaria-prijzen.html", k: "Prijslijst" },
    { t: "Dunkin' Donuts prijzen", u: "dunkin-donuts-prijzen.html", k: "Prijslijst" },
    { t: "De Beren prijzen",       u: "de-beren-prijzen.html", k: "Prijslijst" },
    { t: "Döner Company prijzen",  u: "doner-company-prijzen.html", k: "Prijslijst" },
    { t: "Big Mac saus recept",      u: "big-mac-saus-recept.html", k: "Recepten" },
    { t: "KFC deals en aanbiedingen",u: "kfc-deals.html", k: "Deals" },
    { t: "Alle restaurants",       u: "restaurants.html",       k: "Overzicht" },
    { t: "Prijsvergelijker",       u: "prijsvergelijker.html",  k: "Tool" },
    { t: "Fakeaway recepten",      u: "recepten.html",          k: "Recepten" },
    { t: "Prijstrends fastfood",   u: "trends.html",            k: "Trends" },
    { t: "Laatste nieuws",         u: "nieuws.html",            k: "Nieuws" }
  ];

  var current = (location.pathname.split("/").pop() || "index.html");

  /* ---------- header ---------- */
  function buildHeader() {
    var links = NAV.map(function (n) {
      var active = n.href === current ? " is-active" : "";
      var b = n.badge ? ' <span class="badge badge--' + n.badge[0] + '">' + n.badge[1] + "</span>" : "";
      return '<a class="' + active.trim() + '" href="' + n.href + '">' + n.label + b + "</a>";
    }).join("");

    return '' +
      '<header class="site-header"><div class="wrap site-header__inner">' +
        '<a class="brand" href="index.html">menus<span>prijzen.nl</span></a>' +
        '<nav class="nav" id="nav">' + links + '</nav>' +
        '<div style="display:flex;gap:10px">' +
          '<button class="header-search" id="searchBtn" aria-label="Zoeken">' + iconSearch() + '</button>' +
          '<button class="nav-toggle" id="navToggle" aria-label="Menu" aria-expanded="false">' + iconMenu() + '</button>' +
        '</div>' +
      '</div></header>' +
      '<div class="search-modal" id="searchModal" role="dialog" aria-label="Zoeken">' +
        '<div class="search-modal__box">' + iconSearch() +
          '<input type="search" id="modalSearch" placeholder="Zoek een restaurant of prijslijst…" autocomplete="off">' +
        '</div>' +
        '<div class="livesearch__results" id="modalResults" style="position:static;max-width:640px;margin:6px auto 0;display:none"></div>' +
      '</div>';
  }

  function buildFooter() {
    var links = FOOTER_LINKS.map(function (l) {
      return '<a href="' + l.href + '">' + l.label + "</a>";
    }).join("");
    return '' +
      '<footer class="site-footer"><div class="wrap site-footer__inner">' +
        "<p>&copy; " + new Date().getFullYear() + " Menusprijzen.nl — Alle rechten voorbehouden</p>" +
        "<nav>" + links + "</nav>" +
      "</div></footer>";
  }

  /* ---------- search ---------- */
  function renderResults(box, q) {
    q = q.trim().toLowerCase();
    if (q.length < 2) { box.style.display = "none"; return; }
    var hits = SEARCH_INDEX.filter(function (i) { return i.t.toLowerCase().indexOf(q) > -1; }).slice(0, 8);
    if (!hits.length) {
      box.innerHTML = '<div class="empty">Niets gevonden voor &ldquo;' + escapeHtml(q) + '&rdquo;</div>';
    } else {
      box.innerHTML = hits.map(function (h) {
        return '<a href="' + h.u + '">' + escapeHtml(h.t) + '<span class="k">' + h.k + "</span></a>";
      }).join("");
    }
    box.style.display = "block";
  }

  function wireSearch() {
    var heroInput = document.getElementById("heroSearch");
    var heroBox = document.getElementById("heroResults");
    if (heroInput && heroBox) {
      heroInput.addEventListener("input", function () { renderResults(heroBox, heroInput.value); });
      document.addEventListener("click", function (e) {
        if (!heroBox.contains(e.target) && e.target !== heroInput) heroBox.style.display = "none";
      });
    }

    var btn = document.getElementById("searchBtn");
    var modal = document.getElementById("searchModal");
    var mInput = document.getElementById("modalSearch");
    var mBox = document.getElementById("modalResults");
    btn.addEventListener("click", function () {
      modal.classList.add("is-open");
      setTimeout(function () { mInput.focus(); }, 30);
    });
    modal.addEventListener("click", function (e) { if (e.target === modal) modal.classList.remove("is-open"); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") modal.classList.remove("is-open"); });
    mInput.addEventListener("input", function () { renderResults(mBox, mInput.value); });
  }

  function wireNavToggle() {
    var t = document.getElementById("navToggle");
    var nav = document.getElementById("nav");
    t.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      t.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- scroll to top ---------- */
  function wireToTop() {
    var b = document.createElement("button");
    b.className = "to-top";
    b.setAttribute("aria-label", "Naar boven");
    b.innerHTML = iconUp();
    b.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    document.body.appendChild(b);
    addEventListener("scroll", function () { b.classList.toggle("is-shown", scrollY > 600); }, { passive: true });
  }

  /* ---------- price charts ---------- */
  var COLORS = ["#2563eb", "#10b981", "#f43f5e", "#f59e0b", "#8b5cf6"];
  function initCharts() {
    if (typeof Chart === "undefined") return;
    document.querySelectorAll("canvas[data-price-chart]").forEach(function (cv) {
      var cfg = JSON.parse(document.getElementById(cv.dataset.priceChart).textContent);
      new Chart(cv, {
        type: "line",
        data: {
          labels: cfg.labels,
          datasets: cfg.series.map(function (s, i) {
            return {
              label: s.label,
              data: s.data,
              borderColor: COLORS[i % COLORS.length],
              backgroundColor: COLORS[i % COLORS.length],
              tension: 0.3, fill: false, pointRadius: 3
            };
          })
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true, padding: 18 } },
            tooltip: { mode: "index", intersect: false,
              callbacks: { label: function (c) { return c.dataset.label + ": €" + c.parsed.y.toFixed(2).replace(".", ","); } } }
          },
          scales: { y: { ticks: { callback: function (v) { return "€" + v.toFixed(2).replace(".", ","); } } } }
        }
      });
    });
  }

  /* ---------- prijsvergelijker widget ---------- */
  function initCompare() {
    var root = document.getElementById("compare");
    if (!root) return;
    var data = JSON.parse(document.getElementById("compareData").textContent);
    var tabs = root.querySelector(".cmp-tabs");
    var rows = root.querySelector(".cmp-rows");
    var keys = Object.keys(data);

    tabs.innerHTML = keys.map(function (k, i) {
      return '<button class="cmp-tab' + (i === 0 ? " is-active" : "") + '" data-k="' + k + '">' + k + "</button>";
    }).join("");

    function paint(key) {
      var list = data[key].slice().sort(function (a, b) { return a.price - b.price; });
      var max = Math.max.apply(null, list.map(function (x) { return x.price; }));
      var min = list[0].price;
      rows.innerHTML = list.map(function (x) {
        return '<div class="cmp-row' + (x.price === min ? " is-cheap" : "") + '">' +
            '<span class="cmp-row__name">' + x.name + "</span>" +
            '<span class="cmp-row__track"><span class="cmp-row__fill" data-w="' + (x.price / max * 100) + '"></span></span>' +
            '<span class="cmp-row__price">€' + x.price.toFixed(2).replace(".", ",") + "</span>" +
          "</div>";
      }).join("");
      requestAnimationFrame(function () {
        rows.querySelectorAll(".cmp-row__fill").forEach(function (f) { f.style.width = f.dataset.w + "%"; });
      });
    }

    tabs.addEventListener("click", function (e) {
      var b = e.target.closest(".cmp-tab"); if (!b) return;
      tabs.querySelectorAll(".cmp-tab").forEach(function (t) { t.classList.remove("is-active"); });
      b.classList.add("is-active");
      paint(b.dataset.k);
    });
    paint(keys[0]);
  }

  /* ---------- tiny icon set ---------- */
  function iconSearch() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'; }
  function iconMenu() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>'; }
  function iconUp() { return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"/></svg>'; }
  function escapeHtml(s) { return s.replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var h = document.getElementById("site-header");
    var f = document.getElementById("site-footer");
    if (h) h.outerHTML = buildHeader();
    if (f) f.outerHTML = buildFooter();
    wireSearch();
    wireNavToggle();
    wireToTop();
    initCharts();
    initCompare();
  });
})();
