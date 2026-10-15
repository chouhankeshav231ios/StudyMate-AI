/* ================================================================
   StudyMate AI – script.js
   Rule-based timetable engine. No paid APIs. Pure vanilla JS.
   All data persisted via localStorage.
   ================================================================ */

"use strict";

/* ── Constants ─────────────────────────────────────────────── */
const LS_KEY_SUBJECTS  = "sm_subjects";
const LS_KEY_PROFILE   = "sm_profile";
const LS_KEY_TIMETABLE = "sm_timetable";
const LS_KEY_TASKS     = "sm_tasks";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SHORT_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/* ── State ─────────────────────────────────────────────────── */
let subjects  = [];   // [{ id, name, examDate, priority }]
let profile   = { name: "", dailyHours: 4 };
let timetable = [];   // [{ date, subject, hours, priority }]
let tasks     = [];   // [{ id, label, hours, done }]

/* ── Init ──────────────────────────────────────────────────── */
function init() {
  loadFromStorage();
  bindEvents();
  renderProfile();
  renderSubjects();
  renderTimetable();
  renderTasks();
  updateProgress();
  startClock();
  updateGreeting();
}

/* ── Storage helpers ───────────────────────────────────────── */
function save() {
  localStorage.setItem(LS_KEY_SUBJECTS,  JSON.stringify(subjects));
  localStorage.setItem(LS_KEY_PROFILE,   JSON.stringify(profile));
  localStorage.setItem(LS_KEY_TIMETABLE, JSON.stringify(timetable));
  localStorage.setItem(LS_KEY_TASKS,     JSON.stringify(tasks));
}

function loadFromStorage() {
  try { subjects  = JSON.parse(localStorage.getItem(LS_KEY_SUBJECTS))  || []; } catch { subjects  = []; }
  try { profile   = JSON.parse(localStorage.getItem(LS_KEY_PROFILE))   || { name: "", dailyHours: 4 }; } catch { profile = { name: "", dailyHours: 4 }; }
  try { timetable = JSON.parse(localStorage.getItem(LS_KEY_TIMETABLE)) || []; } catch { timetable = []; }
  try { tasks     = JSON.parse(localStorage.getItem(LS_KEY_TASKS))     || []; } catch { tasks = []; }
}

/* ── Event bindings ────────────────────────────────────────── */
function bindEvents() {
  document.getElementById("saveProfile").addEventListener("click", saveProfile);
  document.getElementById("addSubjectBtn").addEventListener("click", addSubject);
  document.getElementById("generateBtn").addEventListener("click", generateTimetable);
  document.getElementById("clearAllBtn").addEventListener("click", () => confirmAction(
    "Clear ALL subjects and generated data? This cannot be undone.",
    clearAll
  ));
  document.getElementById("resetTasksBtn").addEventListener("click", () => confirmAction(
    "Reset all task checkboxes for today?",
    resetTasks
  ));
  document.getElementById("modalCancel").addEventListener("click", closeModal);
  document.getElementById("studentName").addEventListener("keydown", e => { if (e.key === "Enter") saveProfile(); });
  document.getElementById("subjectName").addEventListener("keydown", e => { if (e.key === "Enter") addSubject(); });
}

/* ── Clock & Greeting ──────────────────────────────────────── */
function startClock() {
  function tick() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    document.getElementById("clock").textContent = `${hh}:${mm}:${ss}`;
  }
  tick();
  setInterval(tick, 1000);
}

function updateGreeting() {
  const h = new Date().getHours();
  let part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const name = profile.name ? `, ${profile.name.split(" ")[0]}` : "";
  document.getElementById("greeting").textContent = `${part}${name} 👋`;
}

/* ── Profile ───────────────────────────────────────────────── */
function renderProfile() {
  document.getElementById("studentName").value = profile.name || "";
  document.getElementById("dailyHours").value  = profile.dailyHours || "";
}

function saveProfile() {
  const name  = document.getElementById("studentName").value.trim();
  const hours = parseInt(document.getElementById("dailyHours").value, 10);

  if (isNaN(hours) || hours < 1 || hours > 16) {
    showToast("Daily hours must be between 1 and 16.", "error");
    return;
  }
  profile.name       = name;
  profile.dailyHours = hours;
  save();
  updateGreeting();
  updateStats();
  showToast("Profile saved ✓", "success");
}

/* ── Subjects ──────────────────────────────────────────────── */
function addSubject() {
  const nameEl     = document.getElementById("subjectName");
  const dateEl     = document.getElementById("examDate");
  const priorityEl = document.getElementById("priority");
  const errEl      = document.getElementById("subjectError");

  const name     = nameEl.value.trim();
  const examDate = dateEl.value;
  const priority = priorityEl.value;

  // Validation
  errEl.textContent = "";
  if (!name) { errEl.textContent = "Subject name is required."; nameEl.focus(); return; }
  if (!examDate) { errEl.textContent = "Exam date is required."; dateEl.focus(); return; }
  if (new Date(examDate) < stripTime(new Date())) { errEl.textContent = "Exam date must be today or in the future."; dateEl.focus(); return; }
  if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
    errEl.textContent = "A subject with this name already exists."; nameEl.focus(); return;
  }

  subjects.push({ id: uid(), name, examDate, priority });
  save();
  renderSubjects();
  updateStats();
  showToast(`"${name}" added ✓`, "success");

  // Reset form
  nameEl.value = "";
  dateEl.value = "";
  priorityEl.value = "medium";
  nameEl.focus();
}

function deleteSubject(id) {
  subjects = subjects.filter(s => s.id !== id);
  // Remove associated timetable rows and tasks
  timetable = timetable.filter(r => r.subjectId !== id);
  tasks     = tasks.filter(t => t.subjectId !== id);
  save();
  renderSubjects();
  renderTimetable();
  renderTasks();
  updateProgress();
  showToast("Subject removed.", "success");
}

function renderSubjects() {
  const container = document.getElementById("subjectList");
  const empty     = document.getElementById("emptySubjects");

  // Remove existing items (keep empty state node)
  Array.from(container.querySelectorAll(".subject-item")).forEach(el => el.remove());

  if (subjects.length === 0) {
    empty.style.display = "flex";
    return;
  }
  empty.style.display = "none";

  const today = stripTime(new Date());
  subjects
    .slice()
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate))
    .forEach(s => {
      const daysLeft = Math.ceil((new Date(s.examDate) - today) / 86400000);
      const daysClass = daysLeft < 0 ? "days-past" : daysLeft <= 7 ? "days-urgent" : daysLeft <= 21 ? "days-soon" : "days-ok";
      const daysLabel = daysLeft < 0 ? "Past" : daysLeft === 0 ? "Today!" : `${daysLeft}d left`;

      const item = document.createElement("div");
      item.className = "subject-item";
      item.dataset.id = s.id;
      item.innerHTML = `
        <div class="subject-badge badge-${s.priority}"></div>
        <div class="subject-info">
          <div class="subject-name">${escapeHtml(s.name)}</div>
          <div class="subject-meta">Exam: ${formatDate(s.examDate)} &nbsp;·&nbsp; ${capitalise(s.priority)} priority</div>
        </div>
        <span class="subject-days-badge ${daysClass}">${daysLabel}</span>
        <button class="btn-delete-subject" title="Remove subject" data-id="${s.id}">✕</button>
      `;
      item.querySelector(".btn-delete-subject").addEventListener("click", e => {
        e.stopPropagation();
        confirmAction(`Remove "${s.name}"?`, () => deleteSubject(s.id));
      });
      container.appendChild(item);
    });

  updateStats();
}

/* ── Timetable Generator (Rule-based) ──────────────────────── */
/*
  Algorithm:
  1. For each subject, calculate urgency score = days until exam × weight(priority).
  2. Distribute today through the next 14 days.
  3. Each day: sort subjects by urgency score (ascending = most urgent first),
     allocate hours proportionally capped by daily hours.
  4. Subjects past their exam date or with 0 hours are skipped.
  5. A subject with fewer days gets more hours per day.
*/
function generateTimetable() {
  if (subjects.length === 0) {
    showToast("Add at least one subject first.", "error");
    return;
  }

  const dailyH = profile.dailyHours || 4;
  const today  = stripTime(new Date());
  const rows   = [];

  const PRIORITY_WEIGHT = { high: 1.0, medium: 1.5, low: 2.0 }; // lower = more urgent
  const SESSION_MIN = 0.5; // minimum hours per slot

  // Build 14-day plan
  for (let d = 0; d < 14; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);

    // Active subjects: exam not yet passed (include today's exams)
    const active = subjects.filter(s => new Date(s.examDate) >= date);
    if (active.length === 0) continue;

    // Score each subject: days until exam * priority weight
    const scored = active.map(s => {
      const daysLeft = Math.max(1, Math.ceil((new Date(s.examDate) - date) / 86400000));
      const score    = daysLeft * PRIORITY_WEIGHT[s.priority];
      return { ...s, daysLeft, score };
    }).sort((a, b) => a.score - b.score); // most urgent first

    // Allocate hours proportionally (inverse of score, normalised)
    const totalInv = scored.reduce((sum, s) => sum + 1 / s.score, 0);
    let remaining  = dailyH;

    scored.forEach(s => {
      if (remaining < SESSION_MIN) return;
      const raw   = (1 / s.score / totalInv) * dailyH;
      const hours = Math.max(SESSION_MIN, parseFloat(raw.toFixed(1)));
      const alloc = Math.min(hours, remaining);
      remaining  -= alloc;
      rows.push({
        id:        uid(),
        date:      dateToISO(date),
        dayLabel:  DAYS[date.getDay()],
        subjectId: s.id,
        subject:   s.name,
        hours:     parseFloat(alloc.toFixed(1)),
        priority:  s.priority,
        examDate:  s.examDate,
      });
    });
  }

  timetable = rows;

  // Rebuild tasks for today
  rebuildTodayTasks();
  save();
  renderTimetable();
  renderTasks();
  updateProgress();
  showToast("Timetable generated ✓", "success");
}

function renderTimetable() {
  const wrap  = document.getElementById("timetableOutput");
  const empty = document.getElementById("emptyTimetable");

  Array.from(wrap.querySelectorAll(".timetable-table")).forEach(el => el.remove());

  if (timetable.length === 0) {
    empty.style.display = "flex";
    return;
  }
  empty.style.display = "none";

  const todayISO = dateToISO(new Date());

  const table = document.createElement("table");
  table.className = "timetable-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Day</th>
        <th>Subject</th>
        <th>Hours</th>
        <th>Priority</th>
        <th>Exam</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector("tbody");

  timetable.forEach(r => {
    const tr = document.createElement("tr");
    if (r.date === todayISO) tr.classList.add("today-row");
    tr.innerHTML = `
      <td>${formatDate(r.date)}</td>
      <td>${r.dayLabel}</td>
      <td>${escapeHtml(r.subject)}</td>
      <td>${r.hours}h</td>
      <td><span class="pill pill-${r.priority}">${capitalise(r.priority)}</span></td>
      <td>${formatDate(r.examDate)}</td>
    `;
    tbody.appendChild(tr);
  });

  wrap.appendChild(table);
}

/* ── Today's Tasks ─────────────────────────────────────────── */
function rebuildTodayTasks() {
  const todayISO = dateToISO(new Date());
  const todayRows = timetable.filter(r => r.date === todayISO);

  // Preserve existing done states by subject
  const existingDone = {};
  tasks.forEach(t => { existingDone[t.subjectId] = t.done; });

  tasks = todayRows.map(r => ({
    id:        uid(),
    subjectId: r.subjectId,
    label:     `${r.subject} – Study session`,
    hours:     r.hours,
    done:      existingDone[r.subjectId] || false,
  }));
}

function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  save();
  renderTasks();
  updateProgress();
}

function resetTasks() {
  tasks.forEach(t => { t.done = false; });
  save();
  renderTasks();
  updateProgress();
  showToast("Tasks reset.", "success");
}

function renderTasks() {
  const container = document.getElementById("taskList");
  const empty     = document.getElementById("emptyTasks");

  Array.from(container.querySelectorAll(".task-item")).forEach(el => el.remove());

  if (tasks.length === 0) {
    empty.style.display = "flex";
    return;
  }
  empty.style.display = "none";

  tasks.forEach(t => {
    const item = document.createElement("div");
    item.className = `task-item${t.done ? " done" : ""}`;
    item.dataset.id = t.id;
    item.setAttribute("role", "checkbox");
    item.setAttribute("aria-checked", t.done ? "true" : "false");
    item.setAttribute("tabindex", "0");
    item.innerHTML = `
      <div class="task-checkbox">${t.done ? "✓" : ""}</div>
      <span class="task-label">${escapeHtml(t.label)}</span>
      <span class="task-hours">${t.hours}h</span>
    `;
    item.addEventListener("click",   () => toggleTask(t.id));
    item.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleTask(t.id); } });
    container.appendChild(item);
  });
}

/* ── Progress ──────────────────────────────────────────────── */
function updateProgress() {
  const total = tasks.length;
  const done  = tasks.filter(t => t.done).length;
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("progressBar").style.width = pct + "%";
  document.getElementById("progressLabel").textContent =
    total === 0 ? "No tasks yet — generate your timetable to get started."
                : `${pct}% complete — ${done} of ${total} tasks done today`;

  document.getElementById("statDone").textContent  = done;
  document.getElementById("statTotal").textContent = total;
  updateStats();
}

function updateStats() {
  document.getElementById("statSubjects").textContent = subjects.length;

  // Next exam countdown
  const today = stripTime(new Date());
  const future = subjects
    .map(s => ({ name: s.name, d: Math.ceil((new Date(s.examDate) - today) / 86400000) }))
    .filter(x => x.d >= 0)
    .sort((a, b) => a.d - b.d);

  const nextEl = document.getElementById("statDays");
  if (future.length === 0) {
    nextEl.textContent = "—";
    nextEl.title = "";
  } else {
    nextEl.textContent = future[0].d === 0 ? "Today!" : `${future[0].d}d`;
    nextEl.title = future[0].name;
  }
}

/* ── Clear All ─────────────────────────────────────────────── */
function clearAll() {
  subjects  = [];
  timetable = [];
  tasks     = [];
  save();
  renderSubjects();
  renderTimetable();
  renderTasks();
  updateProgress();
  showToast("All data cleared.", "success");
}

/* ── Modal (confirm dialog) ────────────────────────────────── */
let _pendingAction = null;

function confirmAction(msg, callback) {
  _pendingAction = callback;
  document.getElementById("modalMsg").textContent = msg;
  const overlay = document.getElementById("modal");
  overlay.classList.add("open");
  overlay.removeAttribute("aria-hidden");
  document.getElementById("modalConfirm").focus();

  // One-time confirm handler
  const confirmBtn = document.getElementById("modalConfirm");
  confirmBtn.onclick = () => {
    closeModal();
    if (_pendingAction) { _pendingAction(); _pendingAction = null; }
  };
}

function closeModal() {
  const overlay = document.getElementById("modal");
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
}

// Close modal on overlay click
document.getElementById("modal").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

/* ── Toast ─────────────────────────────────────────────────── */
let _toastTimer = null;
function showToast(msg, type = "info") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `toast toast-${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.classList.remove("show"); }, 3000);
}

/* ── Utility helpers ───────────────────────────────────────── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateToISO(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDate(iso) {
  // "2024-11-05"  →  "05 Nov 2024"
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[parseInt(m,10)-1]} ${y}`;
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ── Bootstrap ─────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", init);
