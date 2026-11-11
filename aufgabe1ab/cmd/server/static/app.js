"use strict";

const MAX_DAYS = 28;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const CATEGORIES = {
  junior: ["Kinder & Jugend", "Leichte, wendige Ski für Kinder und Jugendliche."],
  allround: ["Allround", "Für Einsteiger und Fortgeschrittene auf allen Pisten."],
  premium: ["Premium", "Sportliche Ski für anspruchsvolle Fahrer."],
};
const ID_TYPES = { passport: "Reisepass", id_card: "Personalausweis", driver_license: "Führerschein" };
const STATUS = { upcoming: "Anstehend", active: "Aktiv", overdue: "Überfällig", returned: "Zurückgegeben" };

const ICONS = {
  mountain: "m8 3 4 8 5-5 5 15H2L8 3z",
  dashboard: "M3 3h7v9H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 16h7v5H3z",
  plus: "M12 5v14M5 12h14",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  tag: "M12 2H2v10l9.3 9.3a1 1 0 0 0 1.4 0l8.6-8.6a1 1 0 0 0 0-1.4z M7 7h.01",
  check: "M22 11.1V12a10 10 0 1 1-5.9-9.1 M22 4 12 14l-3-3",
  calendar: "M8 2v4M16 2v4M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  undo: "M9 14 4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 0 11H11",
  alert: "m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3 M12 9v4 M12 17h.01",
  euro: "M4 10h12 M4 14h9 M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2",
  id: "M3 5h18v14H3z M7 10h4 M7 14h3 M15 10h2v4h-2z",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6",
  error: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 8v4 M12 16h.01",
};

// ---------- Helpers ----------

const view = document.getElementById("view");
const dialog = document.getElementById("dialog");

const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

const esc = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const euroFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const euro = (cents) => euroFormat.format(cents / 100);

const pad = (n) => String(n).padStart(2, "0");
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s) => new Date(`${s}T00:00:00`);
const addDays = (iso, n) => {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};
const dmy = (iso) => fromIso(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const dmyWeekday = (iso) =>
  fromIso(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
const daysBetween = (start, end) => Math.round((fromIso(end) - fromIso(start)) / 86400000) + 1;
const daysLabel = (n) => (n === 1 ? "1 Tag" : `${n} Tage`);
const todayIso = () => toIso(new Date());

async function api(path, options) {
  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new Error("Der Server ist nicht erreichbar. Bitte Verbindung prüfen.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || "Etwas ist schiefgelaufen. Bitte erneut versuchen.");
  return data;
}

let toastTimer;
function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

function openDialog(html) {
  dialog.innerHTML = html;
  dialog.showModal();
}

dialog.addEventListener("click", (e) => {
  if (e.target === dialog || e.target.closest("[data-close]")) dialog.close();
});

function confirmDialog(title, text, confirmLabel) {
  return new Promise((resolve) => {
    openDialog(`
      <h2>${esc(title)}</h2>
      <p class="muted">${esc(text)}</p>
      <div class="dialog-actions">
        <button class="btn ghost" data-close>Abbrechen</button>
        <button class="btn" id="confirm-yes">${esc(confirmLabel)}</button>
      </div>`);
    document.getElementById("confirm-yes").addEventListener("click", () => {
      resolve(true);
      dialog.close();
    });
    dialog.addEventListener("close", () => resolve(false), { once: true });
  });
}

const errorBox = (message, retry = true) => `
  <div class="notice">${icon("error")}<span>${esc(message)}</span>
    ${retry ? '<button class="btn ghost small" data-retry>Erneut laden</button>' : ""}
  </div>`;

const pageHead = (title, subtitle, action = "") => `
  <div class="page-head"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div>${action}</div>`;

const rentalSki = (r) => `${r.ski.brand} ${r.ski.model}, ${r.ski.lengthCm} cm`;
const fullName = (c) => `${c.firstName} ${c.lastName}`;

// ---------- Dashboard ----------

function dueList(title, rentals, emptyText, tone) {
  const items = rentals.length
    ? rentals.map((r) => `
        <div class="line-item">
          <span class="avatar">${esc((r.customer.firstName[0] + r.customer.lastName[0]).toUpperCase())}</span>
          <span class="grow">${esc(fullName(r.customer))}<small>${esc(rentalSki(r))}</small></span>
          <span class="muted">${dmy(r.start)} – ${dmy(r.end)}</span>
        </div>`).join("")
    : `<p class="muted">${esc(emptyText)}</p>`;
  return `
    <section class="panel">
      <div class="panel-head"><h2>${esc(title)}</h2><span class="count" style="color:${tone}">${rentals.length}</span></div>
      ${items}
    </section>`;
}

function stat(label, value, iconName, tone) {
  return `
    <div class="panel stat" style="--tone:${tone}">
      <span class="stat-icon">${icon(iconName)}</span>
      <div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>
    </div>`;
}

async function renderDashboard() {
  const d = await api("/api/dashboard");
  const share = d.totalSkis ? (d.rentedToday / d.totalSkis) * 100 : 0;
  const overdue = d.overdue.length
    ? dueList("Überfällige Rückgaben", d.overdue, "", "var(--coral)") + '<div style="height:16px"></div>'
    : "";
  view.innerHTML = `<div class="page">
    ${pageHead("Übersicht", dmyWeekday(todayIso()), '<a class="btn" href="#/new">' + icon("plus") + "Neuer Verleih</a>")}
    <section class="panel occupancy">
      <span class="muted">Auslastung heute</span>
      <strong>${d.rentedToday} von ${d.totalSkis} Paar verliehen</strong>
      <div class="bar"><div style="width:${share}%"></div></div>
    </section>
    <div class="stats">
      ${stat("Heute verfügbar", d.availableToday, "check", "var(--pine)")}
      ${stat("Anstehende Verleihe", d.upcoming, "calendar", "var(--glacier)")}
      ${stat("Rückgaben heute", d.returns.length, "undo", "var(--amber)")}
      ${stat("Überfällig", d.overdue.length, "alert", "var(--coral)")}
      ${stat("Umsatz gesamt", euro(d.revenueCents), "euro", "var(--ink)")}
    </div>
    ${overdue}
    <div class="two-cols">
      ${dueList("Rückgaben heute", d.returns, "Heute sind keine Rückgaben fällig.", "var(--ink)")}
      ${dueList("Abholungen heute", d.pickups, "Heute werden keine Ski abgeholt.", "var(--ink)")}
    </div>
  </div>`;
}

// ---------- New rental ----------

const booking = { seq: 0, filter: "all", offers: [], doc: null };

async function renderBooking() {
  const start = todayIso();
  Object.assign(booking, { filter: "all", offers: [], doc: null });
  view.innerHTML = `<div class="page">
    ${pageHead("Neuer Verleih", "Zeitraum wählen, Ski aussuchen und Kundendaten erfassen.")}
    <form class="booking" id="booking-form" novalidate>
      <div class="stack">
        <section class="panel">
          <div class="panel-head"><h2>Zeitraum</h2></div>
          <div class="form-grid">
            <label class="field"><span>Verleihbeginn</span>
              <input type="date" name="start" value="${start}" min="${start}" required></label>
            <label class="field"><span>Rückgabe</span>
              <input type="date" name="end" value="${addDays(start, 2)}" min="${start}" max="${addDays(start, MAX_DAYS - 1)}" required></label>
          </div>
          <div class="chips" style="margin-top:12px">
            ${[1, 2, 3, 7].map((n) => `<button type="button" class="chip" data-days="${n}">${daysLabel(n)}</button>`).join("")}
          </div>
          <p class="muted" id="duration" style="margin-top:10px"></p>
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Ski wählen</h2></div>
          <div class="chips" id="category-chips">
            ${[["all", "Alle"], ...Object.entries(CATEGORIES).map(([k, v]) => [k, v[0]])]
              .map(([k, label]) => `<button type="button" class="chip" data-category="${k}" aria-pressed="${k === "all"}">${esc(label)}</button>`).join("")}
          </div>
          <div id="ski-list" class="ski-list"></div>
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Kundendaten</h2></div>
          <div class="form-grid">
            <label class="field"><span>Vorname</span><input type="text" name="firstName" autocomplete="given-name" required></label>
            <label class="field"><span>Nachname</span><input type="text" name="lastName" autocomplete="family-name" required></label>
            <label class="field"><span>E-Mail</span><input type="email" name="email" autocomplete="email" required></label>
            <label class="field"><span>Telefon (optional)</span><input type="tel" name="phone" autocomplete="tel"></label>
          </div>
          <hr>
          <div class="form-grid">
            <label class="field"><span>Art des Ausweises</span>
              <select name="idType">${Object.entries(ID_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></label>
            <label class="field"><span>Ausweisnummer</span><input type="text" name="idNumber" minlength="4" required></label>
          </div>
          <label class="dropzone" id="dropzone">
            <input type="file" name="idDocument" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf">
            <span id="drop-visual">${icon("upload")}</span>
            <span class="grow"><strong id="drop-title">Ausweis hochladen</strong><small class="muted" id="drop-hint">Foto oder PDF, JPG oder PNG, höchstens 5 MB</small></span>
            <span class="action" id="drop-action">Datei wählen</span>
          </label>
          <p class="field-error" id="doc-error" hidden></p>
        </section>
      </div>

      <aside class="panel summary">
        <div class="panel-head"><h2>Zusammenfassung</h2></div>
        <div id="summary"></div>
        <div id="form-error"></div>
        <button class="btn block" id="submit" type="submit" disabled>Verleih abschließen</button>
      </aside>
    </form>
  </div>`;

  const form = document.getElementById("booking-form");
  bindBooking(form);
  updateDuration(form);
  updateSummary(form);
  await loadOffers(form);
}

function bindBooking(form) {
  const { start, end } = form.elements;

  start.addEventListener("change", () => {
    if (!start.value) return;
    end.min = start.value;
    end.max = addDays(start.value, MAX_DAYS - 1);
    if (!end.value || end.value < start.value) end.value = start.value;
    if (end.value > end.max) end.value = end.max;
    periodChanged(form);
  });
  end.addEventListener("change", () => periodChanged(form));

  form.addEventListener("click", (e) => {
    const days = e.target.closest("[data-days]");
    if (days && start.value) {
      end.value = addDays(start.value, Number(days.dataset.days) - 1);
      periodChanged(form);
    }
    const category = e.target.closest("[data-category]");
    if (category) {
      booking.filter = category.dataset.category;
      document.querySelectorAll("[data-category]").forEach((c) => c.setAttribute("aria-pressed", c === category));
      renderSkiList(form);
    }
  });

  form.addEventListener("change", (e) => {
    if (e.target.name === "skiId") updateSummary(form);
    if (e.target.name === "idDocument") pickDocument(form, e.target);
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitBooking(form);
  });
}

function periodChanged(form) {
  updateDuration(form);
  loadOffers(form);
}

function currentPeriod(form) {
  const { start, end } = form.elements;
  return start.value && end.value && end.value >= start.value ? [start.value, end.value] : null;
}

function updateDuration(form) {
  const period = currentPeriod(form);
  document.getElementById("duration").textContent = period
    ? `Verleihdauer: ${daysLabel(daysBetween(...period))}`
    : "Bitte Beginn und Rückgabe wählen.";
  document.querySelectorAll("[data-days]").forEach((chip) =>
    chip.setAttribute("aria-pressed", String(!!period && daysBetween(...period) === Number(chip.dataset.days))));
}

async function loadOffers(form) {
  const seq = ++booking.seq;
  const list = document.getElementById("ski-list");
  const period = currentPeriod(form);
  if (!period) {
    booking.offers = [];
    list.innerHTML = '<p class="muted">Bitte zuerst einen gültigen Zeitraum wählen.</p>';
    updateSummary(form);
    return;
  }
  list.innerHTML = '<p class="loading">Ski werden geladen …</p>';
  try {
    const offers = await api(`/api/skis?start=${period[0]}&end=${period[1]}`);
    if (seq !== booking.seq) return;
    booking.offers = offers;
    renderSkiList(form);
  } catch (err) {
    if (seq !== booking.seq) return;
    booking.offers = [];
    list.innerHTML = errorBox(err.message);
    list.querySelector("[data-retry]").addEventListener("click", () => loadOffers(form));
    updateSummary(form);
  }
}

function renderSkiList(form) {
  const selected = form.elements.skiId && form.elements.skiId.value;
  const visible = booking.offers.filter((o) => booking.filter === "all" || o.category === booking.filter);
  const sorted = [...visible.filter((o) => o.available), ...visible.filter((o) => !o.available)];
  const list = document.getElementById("ski-list");
  list.innerHTML = sorted.length
    ? sorted.map((o) => `
        <label class="ski">
          <input type="radio" name="skiId" value="${o.id}" ${o.available ? "" : "disabled"} ${String(o.id) === selected && o.available ? "checked" : ""}>
          <span class="grow">${esc(o.brand + " " + o.model)}<small>${o.lengthCm} cm, ${esc(CATEGORIES[o.category][0])}</small></span>
          ${o.available && o.quote
            ? `<span class="price"><strong>${euro(o.quote.totalCents)}</strong><small>${euro(o.quote.dailyCents)} pro Tag</small></span>`
            : '<span class="muted">Vergeben</span>'}
        </label>`).join("")
    : '<p class="muted">Keine Ski in dieser Kategorie.</p>';
  updateSummary(form);
}

function selectedOffer(form) {
  const id = form.elements.skiId && form.elements.skiId.value;
  return booking.offers.find((o) => String(o.id) === id && o.available) || null;
}

function updateSummary(form) {
  const period = currentPeriod(form);
  const offer = selectedOffer(form);
  const row = (label, value) => `<div class="sum-row"><span>${label}</span><span>${esc(value)}</span></div>`;
  document.getElementById("summary").innerHTML = `
    ${row("Beginn", period ? dmy(period[0]) : "–")}
    ${row("Rückgabe", period ? dmy(period[1]) : "–")}
    ${row("Dauer", period ? daysLabel(daysBetween(...period)) : "–")}
    ${row("Ski", offer ? `${offer.brand} ${offer.model}` : "noch nicht gewählt")}
    ${offer ? row("Preis pro Tag", euro(offer.quote.dailyCents)) : ""}
    <hr>
    <div class="sum-total"><span>Gesamtpreis</span><strong>${offer ? euro(offer.quote.totalCents) : "–"}</strong></div>`;
  document.getElementById("submit").disabled = !offer;
}

function showDocError(message) {
  const el = document.getElementById("doc-error");
  el.textContent = message || "";
  el.hidden = !message;
  document.getElementById("dropzone").classList.toggle("error", !!message);
}

function pickDocument(form, input) {
  const file = input.files[0];
  const reject = (message) => {
    input.value = "";
    booking.doc = null;
    renderDropzone();
    showDocError(message);
  };
  if (!file) return reject("");
  if (!/\.(jpe?g|png|pdf)$/i.test(file.name)) return reject("Erlaubt sind JPG, PNG und PDF.");
  if (file.size > MAX_UPLOAD_BYTES) return reject("Die Datei ist größer als 5 MB.");
  booking.doc = file;
  showDocError("");
  renderDropzone();
}

function renderDropzone() {
  const file = booking.doc;
  const visual = document.getElementById("drop-visual");
  if (file && !/\.pdf$/i.test(file.name)) {
    visual.innerHTML = `<img class="thumb" alt="" src="${URL.createObjectURL(file)}">`;
  } else {
    visual.innerHTML = icon(file ? "file" : "upload");
  }
  document.getElementById("drop-title").textContent = file ? file.name : "Ausweis hochladen";
  document.getElementById("drop-hint").textContent = file
    ? `${Math.ceil(file.size / 1024)} KB`
    : "Foto oder PDF, JPG oder PNG, höchstens 5 MB";
  document.getElementById("drop-action").textContent = file ? "Ändern" : "Datei wählen";
}

async function submitBooking(form) {
  const errorEl = document.getElementById("form-error");
  errorEl.innerHTML = "";
  if (!form.reportValidity()) return;
  if (!booking.doc) {
    showDocError("Bitte den Ausweis hochladen.");
    return;
  }
  const button = document.getElementById("submit");
  button.disabled = true;
  button.textContent = "Wird gespeichert …";
  try {
    const rental = await api("/api/rentals", { method: "POST", body: new FormData(form) });
    toast(`Verleih Nr. ${rental.id} für ${fullName(rental.customer)} angelegt.`);
    location.hash = "#/rentals";
  } catch (err) {
    errorEl.innerHTML = `<div style="margin-bottom:16px">${errorBox(err.message, false)}</div>`;
    button.textContent = "Verleih abschließen";
    await loadOffers(form);
  }
}

// ---------- Rentals ----------

const rentalsState = { filter: "all", rentals: [] };

function renderRentalsTable() {
  const rows = rentalsState.rentals.filter((r) => rentalsState.filter === "all" || r.status === rentalsState.filter);
  const filters = [["all", "Alle"], ...Object.entries(STATUS)];
  document.getElementById("rentals-body").innerHTML = `
    <div class="chips">${filters.map(([k, label]) =>
      `<button class="chip" data-filter="${k}" aria-pressed="${k === rentalsState.filter}">${label}</button>`).join("")}</div>
    <div style="height:16px"></div>
    ${rows.length ? `<div class="panel table-wrap"><table>
      <thead><tr><th>Nr.</th><th>Kunde</th><th>Ski</th><th>Zeitraum</th><th class="right">Preis</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map((r) => `<tr>
        <td>${r.id}</td>
        <td>${esc(fullName(r.customer))}</td>
        <td class="wrap">${esc(rentalSki(r))}</td>
        <td>${dmy(r.start)} – ${dmy(r.end)}</td>
        <td class="right"><strong>${euro(r.totalCents)}</strong></td>
        <td><span class="badge ${r.status}">${STATUS[r.status]}</span></td>
        <td><div class="row-actions">
          <button class="btn ghost small icon-only" title="Ausweis ansehen" aria-label="Ausweis ansehen" data-id-view="${r.id}">${icon("id")}</button>
          ${r.status === "returned" ? "" : `<button class="btn ghost small" data-return="${r.id}">Zurücknehmen</button>`}
        </div></td></tr>`).join("")}</tbody></table></div>`
      : '<div class="panel muted">Keine Verleihe in dieser Ansicht.</div>'}`;
}

async function renderRentals() {
  rentalsState.rentals = await api("/api/rentals");
  view.innerHTML = `<div class="page">${pageHead("Verleihe", "Alle Buchungen mit Zeitraum, Preis und Status.")}<div id="rentals-body"></div></div>`;
  renderRentalsTable();
}

function showIdDocument(rental) {
  const url = `/api/rentals/${rental.id}/id-document`;
  let preview = '<p class="muted">Kein Dokument hinterlegt.</p>';
  if (rental.idFile) {
    preview = rental.idFile.endsWith(".pdf")
      ? `<p style="margin-top:14px"><a class="btn ghost" href="${url}" target="_blank" rel="noopener">${icon("file")}PDF öffnen</a></p>`
      : `<img src="${url}" alt="Hochgeladener Ausweis">`;
  }
  openDialog(`
    <h2>${esc(fullName(rental.customer))}</h2>
    <p>${ID_TYPES[rental.customer.idType]}, Nr. ${esc(rental.customer.idNumber)}</p>
    ${preview}
    <div class="dialog-actions"><button class="btn ghost" data-close>Schließen</button></div>`);
}

async function returnRental(rental) {
  const ok = await confirmDialog(
    "Ski zurücknehmen?",
    `${rental.ski.brand} ${rental.ski.model} von ${fullName(rental.customer)} wird als zurückgegeben markiert.`,
    "Zurücknehmen");
  if (!ok) return;
  try {
    await api(`/api/rentals/${rental.id}/return`, { method: "POST" });
    toast(`Verleih Nr. ${rental.id} zurückgenommen.`);
    await renderRentals();
  } catch (err) {
    toast(err.message);
  }
}

view.addEventListener("click", (e) => {
  const find = (id) => rentalsState.rentals.find((r) => r.id === Number(id));
  const filter = e.target.closest("[data-filter]");
  const idView = e.target.closest("[data-id-view]");
  const ret = e.target.closest("[data-return]");
  if (filter) {
    rentalsState.filter = filter.dataset.filter;
    renderRentalsTable();
  } else if (idView) {
    showIdDocument(find(idView.dataset.idView));
  } else if (ret) {
    returnRental(find(ret.dataset.return));
  } else if (e.target.closest("[data-retry]") && !document.getElementById("booking-form")) {
    route();
  }
});

// ---------- Prices ----------

function tierLabel(tiers, i) {
  const from = tiers[i].fromDays;
  if (i === tiers.length - 1) return `ab ${from} Tagen`;
  const to = tiers[i + 1].fromDays - 1;
  return to === from ? daysLabel(from) : `${from}–${to} Tage`;
}

async function renderPrices() {
  const prices = await api("/api/prices");
  view.innerHTML = `<div class="page">
    ${pageHead("Preise", "Der Tagespreis gilt für die gesamte Mietdauer. Je länger die Miete, desto günstiger der Tag.")}
    <div class="price-cards">${prices.map((c) => `
      <section class="panel">
        <div class="panel-head"><h2>${esc(CATEGORIES[c.category][0])}</h2></div>
        <p class="muted">${esc(CATEGORIES[c.category][1])}</p>
        <div style="height:10px"></div>
        ${c.tiers.map((t, i) => `<div class="tier"><span>${tierLabel(c.tiers, i)}</span>
          <span><strong>${euro(t.dailyCents)}</strong> <small>pro Tag</small></span></div>`).join("")}
      </section>`).join("")}</div>
  </div>`;
}

// ---------- Router ----------

const routes = { "/": renderDashboard, "/new": renderBooking, "/rentals": renderRentals, "/prices": renderPrices };
let routeSeq = 0;

async function route() {
  const path = location.hash.replace(/^#/, "") || "/";
  const render = routes[path] || renderDashboard;
  const seq = ++routeSeq;
  document.querySelectorAll("[data-route]").forEach((a) => a.classList.toggle("active", a.dataset.route === (routes[path] ? path : "/")));
  view.innerHTML = '<p class="loading">Wird geladen …</p>';
  try {
    await render();
  } catch (err) {
    if (seq === routeSeq) view.innerHTML = `<div class="page">${errorBox(err.message)}</div>`;
  }
  window.scrollTo(0, 0);
}

document.querySelectorAll("[data-icon]").forEach((el) => {
  el.innerHTML = icon(el.dataset.icon);
});
window.addEventListener("hashchange", route);
route();
