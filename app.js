/* ============ Ember 🔥 — app logic ============ */
(() => {
  "use strict";

  const STORAGE_KEY = "ember.friends.v1";
  const DAY = 86400000;

  const RELATIONSHIPS = {
    bestie: { label: "bestie", emoji: "💛", cadence: 5 },
    close: { label: "close friend", emoji: "🧡", cadence: 14 },
    friend: { label: "friend", emoji: "🩵", cadence: 30 },
    family: { label: "like family", emoji: "💜", cadence: 21 },
    acquaintance: { label: "acquaintance", emoji: "🤍", cadence: 60 },
    custom: { label: "custom", emoji: "⚙️", cadence: 30 },
  };

  const TYPE_META = {
    text: "💬 texted",
    call: "📞 called",
    hangout: "☕ hung out",
    event: "🎉 saw them at something",
    birthday: "🎂 celebrated their birthday",
    other: "✨ connected",
  };

  const NUDGES = {
    cold: [
      "It's been way too long — a simple \"thinking of you\" text can restart everything.",
      "This one's gone cold. No pressure, just a low-key \"hey, miss you\" message.",
      "Don't overthink it — send one text. That's the whole ask.",
    ],
    fading: [
      "Slipping fast. A quick voice note or meme keeps it alive with zero effort.",
      "They're fading from your radar — reach out before it goes quiet for good.",
      "A small check-in now is easier than a big catch-up later.",
    ],
    cooling: [
      "Starting to cool off. Send something that made you think of them.",
      "A little overdue — floating a hangout date would go a long way.",
    ],
    steady: [
      "On track. Keep the rhythm going whenever it's natural.",
      "Healthy pace — nothing urgent, just don't forget them.",
    ],
    thriving: [
      "You two are golden right now. 🔥",
      "Strong and warm — keep doing whatever you're doing.",
    ],
  };

  const BANDS = [
    { min: 80, key: "thriving", emoji: "🔥", label: "Thriving", color: "--hot" },
    { min: 55, key: "steady", emoji: "🌤️", label: "Steady", color: "--gold" },
    { min: 30, key: "cooling", emoji: "🌥️", label: "Cooling", color: "--amber" },
    { min: 10, key: "fading", emoji: "🥶", label: "Fading", color: "--cold" },
    { min: 0, key: "cold", emoji: "🧊", label: "Cold", color: "--ice" },
  ];

  /* ---------- state ---------- */
  let friends = loadFriends();
  let filter = "all";
  let query = "";
  let editingId = null;
  let logFriendId = null;
  let logType = "text";

  function loadFriends() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function saveFriends() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  /* ---------- score engine ---------- */
  function daysSince(dateStr) {
    if (!dateStr) return 9999;
    const then = new Date(dateStr + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((now - then) / DAY));
  }

  function computeScore(friend) {
    const days = daysSince(friend.lastContact);
    const cadence = Math.max(1, friend.cadenceDays || 30);
    const ratio = days / cadence;
    let score;
    if (ratio <= 1) {
      score = 100 - ratio * 30; // 100 -> 70 while on schedule
    } else {
      const over = ratio - 1;
      score = 70 * Math.exp(-over * 1.1); // exponential cooldown after that
    }
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function bandFor(score) {
    return BANDS.find((b) => score >= b.min);
  }

  function nudgeFor(friend, score) {
    const band = bandFor(score);
    const list = NUDGES[band.key];
    const idx = hashStr(friend.id) % list.length;
    return list[idx];
  }

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  /* ---------- DOM refs ---------- */
  const $ = (sel) => document.querySelector(sel);
  const statsEl = $("#stats");
  const alertStrip = $("#alert-strip");
  const grid = $("#friend-grid");
  const emptyState = $("#empty-state");
  const searchInput = $("#search");
  const filterButtons = document.querySelectorAll(".chip[data-filter]");
  const friendCountEl = $("#friend-count");

  const modal = $("#modal");
  const friendForm = $("#friend-form");
  const modalTitle = $("#modal-title");
  const fEmoji = $("#f-emoji");
  const fName = $("#f-name");
  const fRelationship = $("#f-relationship");
  const wrapCustomDays = $("#wrap-custom-days");
  const fCustomDays = $("#f-custom-days");
  const fLastContact = $("#f-lastcontact");
  const fNotes = $("#f-notes");
  const btnDelete = $("#btn-delete");
  const btnArchive = $("#btn-archive");

  const logModal = $("#log-modal");
  const logForm = $("#log-form");
  const logModalTitle = $("#log-modal-title");
  const logTypeRow = $("#log-type-row");
  const logDate = $("#log-date");
  const logNote = $("#log-note");

  const exportModal = $("#export-modal");
  const toastEl = $("#toast");

  /* ---------- rendering ---------- */
  function render() {
    renderStats();
    renderAlertStrip();
    renderGrid();
    saveFriends();
  }

  function activeFriends() {
    return friends.filter((f) => !f.archived);
  }

  function renderStats() {
    const active = activeFriends();
    const scored = active.map((f) => computeScore(f));
    const avg = scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0;
    const thriving = scored.filter((s) => s >= 80).length;
    const needAttention = scored.filter((s) => s < 30).length;

    statsEl.innerHTML = "";
    statsEl.appendChild(
      statCard("circle health", avg ? `${avg}%` : "—", active.length ? bandFor(avg).emoji + " " + bandFor(avg).label : "add a friend to start", "glow-hot")
    );
    statsEl.appendChild(statCard("friends tracked", String(active.length), active.length === 1 ? "person in your circle" : "people in your circle", "glow-gold"));
    statsEl.appendChild(statCard("thriving", String(thriving), "🔥 scoring 80+", "glow-gold"));
    statsEl.appendChild(statCard("needs attention", String(needAttention), "🥶 fading or cold", "glow-cold"));
  }

  function statCard(label, value, sub, glowClass) {
    const div = document.createElement("div");
    div.className = `stat-card ${glowClass}`;
    const l = document.createElement("div");
    l.className = "stat-label";
    l.textContent = label;
    const v = document.createElement("div");
    v.className = "stat-value";
    v.textContent = value;
    const s = document.createElement("div");
    s.className = "stat-sub";
    s.textContent = sub;
    div.append(l, v, s);
    return div;
  }

  function renderAlertStrip() {
    const active = activeFriends();
    const urgent = active
      .map((f) => ({ f, score: computeScore(f) }))
      .filter((x) => x.score < 30)
      .sort((a, b) => a.score - b.score);

    if (!urgent.length) {
      alertStrip.classList.add("hidden");
      alertStrip.textContent = "";
      return;
    }
    alertStrip.classList.remove("hidden");
    alertStrip.innerHTML = "";
    const names = urgent.slice(0, 4).map((x) => x.f.name);
    const strong = document.createElement("strong");
    strong.textContent = `🧊 ${urgent.length} friendship${urgent.length > 1 ? "s" : ""} going cold: `;
    alertStrip.appendChild(strong);
    const rest = document.createElement("span");
    rest.textContent = names.join(", ") + (urgent.length > names.length ? `, +${urgent.length - names.length} more` : "") + " — a quick check-in would go a long way.";
    alertStrip.appendChild(rest);
  }

  function renderGrid() {
    let list = friends.slice();

    if (filter === "attention") {
      list = list.filter((f) => !f.archived && computeScore(f) < 40);
    } else if (filter === "thriving") {
      list = list.filter((f) => !f.archived && computeScore(f) >= 80);
    } else if (filter === "archived") {
      list = list.filter((f) => f.archived);
    } else {
      list = list.filter((f) => !f.archived);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || (f.notes || "").toLowerCase().includes(q));
    }

    list.sort((a, b) => computeScore(a) - computeScore(b));

    grid.innerHTML = "";
    emptyState.classList.toggle("hidden", friends.length > 0);
    grid.classList.toggle("hidden", friends.length === 0);

    for (const f of list) grid.appendChild(friendCard(f));

    const total = activeFriends().length;
    friendCountEl.textContent = total ? `${total} friend${total > 1 ? "s" : ""} tracked.` : "";
  }

  function friendCard(f) {
    const score = computeScore(f);
    const band = bandFor(score);
    const days = daysSince(f.lastContact);
    const rel = RELATIONSHIPS[f.relationship] || RELATIONSHIPS.friend;

    const card = document.createElement("article");
    card.className = "friend-card" + (f.archived ? " archived" : "");
    card.style.setProperty("--score-color", `var(${band.color})`);
    card.style.setProperty("--score-border", `color-mix(in srgb, var(${band.color}) 35%, transparent)`);
    card.style.setProperty("--score-bg", `color-mix(in srgb, var(${band.color}) 18%, transparent)`);
    if (score >= 55) {
      card.style.setProperty("--score-glow", `0 0 26px color-mix(in srgb, var(${band.color}) ${Math.round(score * 0.4)}%, transparent)`);
    }

    const head = document.createElement("div");
    head.className = "fc-head";

    const avatar = document.createElement("div");
    avatar.className = "fc-avatar";
    avatar.textContent = f.emoji || "🙂";

    const nameWrap = document.createElement("div");
    nameWrap.className = "fc-name-wrap";
    const nameEl = document.createElement("div");
    nameEl.className = "fc-name";
    nameEl.textContent = f.name;
    const relEl = document.createElement("div");
    relEl.className = "fc-relationship";
    relEl.textContent = `${rel.emoji} ${rel.label} · ${days === 0 ? "today" : days === 1 ? "1 day ago" : days + " days ago"}`;
    nameWrap.append(nameEl, relEl);

    const bandEl = document.createElement("div");
    bandEl.className = "fc-band";
    bandEl.style.color = `var(${band.color})`;
    bandEl.textContent = `${band.emoji} ${band.label}`;

    head.append(avatar, nameWrap, bandEl);

    const meter = document.createElement("div");
    meter.className = "fc-meter";
    const track = document.createElement("div");
    track.className = "fc-meter-track";
    const fill = document.createElement("div");
    fill.className = "fc-meter-fill";
    fill.style.width = score + "%";
    track.appendChild(fill);
    const labels = document.createElement("div");
    labels.className = "fc-meter-labels";
    const scoreSpan = document.createElement("span");
    scoreSpan.className = "fc-score";
    scoreSpan.textContent = score + "%";
    const cadenceSpan = document.createElement("span");
    cadenceSpan.textContent = `every ~${f.cadenceDays}d`;
    labels.append(scoreSpan, cadenceSpan);
    meter.append(track, labels);

    const nudge = document.createElement("div");
    nudge.className = "fc-nudge";
    nudge.textContent = nudgeFor(f, score);

    const actions = document.createElement("div");
    actions.className = "fc-actions";

    const btnCheckin = document.createElement("button");
    btnCheckin.className = "btn primary";
    btnCheckin.textContent = "✅ check in";
    btnCheckin.addEventListener("click", () => openLogModal(f.id));

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn ghost";
    btnEdit.textContent = "✏️ edit";
    btnEdit.addEventListener("click", () => openEditModal(f.id));

    actions.append(btnCheckin, btnEdit);

    card.append(head, meter, nudge, actions);
    return card;
  }

  /* ---------- friend modal ---------- */
  function openAddModal() {
    editingId = null;
    modalTitle.textContent = "add a friend";
    friendForm.reset();
    fEmoji.value = "🙂";
    fRelationship.value = "close";
    fLastContact.value = todayStr();
    wrapCustomDays.classList.add("hidden");
    btnDelete.classList.add("hidden");
    btnArchive.classList.add("hidden");
    modal.showModal();
    fName.focus();
  }

  function openEditModal(id) {
    const f = friends.find((x) => x.id === id);
    if (!f) return;
    editingId = id;
    modalTitle.textContent = "edit friend";
    fEmoji.value = f.emoji || "🙂";
    fName.value = f.name;
    fRelationship.value = f.relationship;
    fCustomDays.value = f.cadenceDays;
    wrapCustomDays.classList.toggle("hidden", f.relationship !== "custom");
    fLastContact.value = f.lastContact || todayStr();
    fNotes.value = f.notes || "";
    btnDelete.classList.remove("hidden");
    btnArchive.classList.remove("hidden");
    btnArchive.textContent = f.archived ? "📤 unarchive" : "📦 archive";
    modal.showModal();
    fName.focus();
  }

  fRelationship.addEventListener("change", () => {
    wrapCustomDays.classList.toggle("hidden", fRelationship.value !== "custom");
    if (fRelationship.value !== "custom") {
      fCustomDays.value = RELATIONSHIPS[fRelationship.value].cadence;
    }
  });

  friendForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const rel = fRelationship.value;
    const cadence = rel === "custom" ? Math.max(1, parseInt(fCustomDays.value, 10) || 30) : RELATIONSHIPS[rel].cadence;

    if (editingId) {
      const f = friends.find((x) => x.id === editingId);
      f.emoji = fEmoji.value.trim() || "🙂";
      f.name = fName.value.trim();
      f.relationship = rel;
      f.cadenceDays = cadence;
      f.lastContact = fLastContact.value || todayStr();
      f.notes = fNotes.value.trim();
      toast(`${f.name} updated ✏️`);
    } else {
      friends.push({
        id: uid(),
        emoji: fEmoji.value.trim() || "🙂",
        name: fName.value.trim(),
        relationship: rel,
        cadenceDays: cadence,
        lastContact: fLastContact.value || todayStr(),
        notes: fNotes.value.trim(),
        archived: false,
        log: [],
        createdAt: todayStr(),
      });
      toast(`${fName.value.trim()} added to your circle 🔥`);
    }
    modal.close();
    render();
  });

  btnDelete.addEventListener("click", () => {
    if (!editingId) return;
    const f = friends.find((x) => x.id === editingId);
    if (!confirm(`Remove ${f.name} from Ember? This can't be undone.`)) return;
    friends = friends.filter((x) => x.id !== editingId);
    modal.close();
    toast(`${f.name} removed`);
    render();
  });

  btnArchive.addEventListener("click", () => {
    if (!editingId) return;
    const f = friends.find((x) => x.id === editingId);
    f.archived = !f.archived;
    modal.close();
    toast(f.archived ? `${f.name} archived 📦` : `${f.name} unarchived 📤`);
    render();
  });

  $("#btn-close-modal").addEventListener("click", () => modal.close());
  $("#btn-add").addEventListener("click", openAddModal);
  $("#btn-empty-add").addEventListener("click", openAddModal);

  /* ---------- log check-in modal ---------- */
  function openLogModal(id) {
    const f = friends.find((x) => x.id === id);
    if (!f) return;
    logFriendId = id;
    logType = "text";
    logModalTitle.textContent = `log a check-in with ${f.name}`;
    logDate.value = todayStr();
    logNote.value = "";
    [...logTypeRow.children].forEach((c) => c.classList.toggle("active", c.dataset.type === "text"));
    logModal.showModal();
  }

  logTypeRow.addEventListener("click", (e) => {
    const btn = e.target.closest(".type-chip");
    if (!btn) return;
    logType = btn.dataset.type;
    [...logTypeRow.children].forEach((c) => c.classList.toggle("active", c === btn));
  });

  logForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = friends.find((x) => x.id === logFriendId);
    if (!f) return;
    const date = logDate.value || todayStr();
    f.log = f.log || [];
    f.log.unshift({ date, type: logType, note: logNote.value.trim() });
    if (!f.lastContact || date >= f.lastContact) f.lastContact = date;
    logModal.close();
    toast(`Logged with ${f.name} 🔥`);
    render();
  });

  $("#btn-close-log").addEventListener("click", () => logModal.close());

  /* ---------- search / filters ---------- */
  searchInput.addEventListener("input", () => {
    query = searchInput.value;
    renderGrid();
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      filterButtons.forEach((b) => b.classList.toggle("active", b === btn));
      renderGrid();
    });
  });

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  }

  /* ---------- report ---------- */
  $("#btn-report").addEventListener("click", () => {
    const active = activeFriends();
    if (!active.length) {
      toast("Add some friends first ✨");
      return;
    }
    const scored = active.map((f) => ({ f, score: computeScore(f) })).sort((a, b) => a.score - b.score);
    const lines = ["🔥 Ember — friendship check-in report", ""];
    for (const { f, score } of scored) {
      const band = bandFor(score);
      lines.push(`${band.emoji} ${f.name} — ${score}% (${band.label}), last contact ${daysSince(f.lastContact)}d ago`);
    }
    const text = lines.join("\n");
    navigator.clipboard
      .writeText(text)
      .then(() => toast("Report copied to clipboard 📋"))
      .catch(() => toast("Couldn't copy — try again"));
  });

  /* ---------- export ---------- */
  $("#btn-export").addEventListener("click", () => exportModal.showModal());
  $("#btn-close-export").addEventListener("click", () => exportModal.close());

  $("#btn-csv").addEventListener("click", () => {
    const rows = [["name", "relationship", "cadence_days", "last_contact", "days_since", "score", "band", "notes"]];
    for (const f of friends) {
      const score = computeScore(f);
      rows.push([f.name, f.relationship, f.cadenceDays, f.lastContact, daysSince(f.lastContact), score, bandFor(score).label, f.notes || ""]);
    }
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    downloadFile(csv, "ember-friends.csv", "text/csv");
    toast("CSV downloaded 📊");
  });

  function csvEscape(v) {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  $("#btn-json").addEventListener("click", () => {
    downloadFile(JSON.stringify({ friends, exportedAt: new Date().toISOString() }, null, 2), "ember-backup.json", "application/json");
    toast("Backup downloaded 🗄");
  });

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  $("#btn-import").addEventListener("click", () => $("#file-import").click());
  $("#file-import").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.friends)) throw new Error("bad format");
        friends = data.friends;
        exportModal.close();
        toast("Backup imported ✅");
        render();
      } catch {
        toast("That file doesn't look like an Ember backup");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  /* ---------- init ---------- */
  render();
})();
