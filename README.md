# 📚 StudyMate AI

A complete, fully client-side student productivity dashboard built with plain **HTML, CSS, and vanilla JavaScript**. No frameworks, no paid APIs, no build tools required.

---

## Features

| Feature | Details |
|---|---|
| **Student Profile** | Set your name and available daily study hours |
| **Subject Manager** | Add subjects with exam dates and priority levels (High / Medium / Low) |
| **Countdown badges** | Live days-until-exam indicator on every subject card |
| **Rule-based Timetable** | Generates a 14-day study plan based on urgency, priority, and daily hours |
| **Today's Tasks** | Auto-populated daily task list from the timetable |
| **Task Checkboxes** | Click to mark tasks done; progress bar updates instantly |
| **Overall Progress** | Visual progress bar + stats panel (subjects, tasks done, next exam) |
| **localStorage** | All data survives browser refresh — no backend needed |
| **Input validation** | Every form field is validated with inline error messages |
| **Empty states** | Helpful placeholder messages when no data exists yet |
| **Confirm modal** | Destructive actions (delete, clear all, reset) require confirmation |
| **Toast notifications** | Non-intrusive success/error feedback |
| **Responsive design** | Works on desktop, tablet, and mobile |
| **Keyboard accessible** | Task checkboxes respond to Space/Enter; modals trap focus |

---

## How the Timetable Engine Works

StudyMate AI uses a **rule-based algorithm** (no AI API calls):

1. **Urgency score** = `days_until_exam × priority_weight`  
   - High priority → weight 1.0 (most urgent)  
   - Medium → 1.5  
   - Low → 2.0  
2. For each of the next **14 days**, active subjects are sorted by urgency score (lowest = most urgent first).  
3. Daily hours are distributed **inversely proportional to the urgency score**, so subjects closer to their exam date automatically receive more study time.  
4. A minimum session of **0.5 hours** is enforced per subject per day.  
5. Subjects whose exam date has already passed are excluded.

---

## Running the Project Locally

### Option 1 — Open directly in a browser (simplest)

1. Open the project folder in File Explorer.
2. Double-click **`index.html`**.
3. The app opens in your default browser. All features work immediately.

> ⚠️ If you notice the clock or localStorage not working when double-clicking, use Option 2.

---

### Option 2 — Use a local web server (recommended)

Any of the following work:

#### VS Code Live Server (recommended for VS Code users)

1. Install the **Live Server** extension by Ritwick Dey.
2. Right-click `index.html` → **Open with Live Server**.
3. Browser opens at `http://127.0.0.1:5500`.

#### Python (no install needed on macOS/Linux)

```bash
# Python 3
python -m http.server 8080

# Then visit: http://localhost:8080
```

#### Node.js `npx serve`

```bash
npx serve .

# Then visit the URL shown in the terminal
```

---

## Testing the App — Step-by-Step

### 1. Save a profile
- Enter your name and daily study hours (e.g. **5**).
- Click **Save Profile**.
- ✅ Greeting in the header updates with your name.

### 2. Add subjects
- Fill in a subject name (e.g. **Mathematics**), pick a future exam date, choose priority **High**.
- Click **Add Subject**.
- ✅ Subject appears in the list with a countdown badge.
- Add 2–3 more subjects with different dates and priorities.

### 3. Validation checks
- Try submitting with an empty subject name → error message appears.
- Try a past exam date → error message appears.
- Try adding a duplicate subject name → error message appears.

### 4. Generate the timetable
- Click **Generate** in the Study Timetable panel.
- ✅ A 14-day table appears. Today's row is highlighted in blue.
- ✅ Subjects closer to their exam date receive more hours per day.
- ✅ Today's Tasks section is populated.

### 5. Complete tasks
- Click any task in **Today's Tasks** to toggle it done.
- ✅ Checkbox turns green, text gets struck through, progress bar updates.

### 6. Test persistence
- Refresh the page (F5 / Cmd+R).
- ✅ All subjects, timetable, and task states are restored from localStorage.

### 7. Delete a subject
- Click **✕** on any subject card → confirm modal appears.
- Confirm → subject is removed, timetable rows and tasks for that subject are cleaned up.

### 8. Clear all data
- Click **Clear All** → confirm → everything resets to the empty state.

---

## Project Structure

```
StudyMate-AI/
├── index.html   – App shell, layout, and HTML structure
├── style.css    – Blue-purple dark theme, responsive grid
├── script.js    – All logic: subjects, timetable engine, tasks, localStorage
└── README.md    – This file
```

---

## Browser Compatibility

| Browser | Status |
|---|---|
| Chrome 90+ | ✅ Full support |
| Firefox 88+ | ✅ Full support |
| Edge 90+ | ✅ Full support |
| Safari 14+ | ✅ Full support |
| Mobile Chrome / Safari | ✅ Responsive layout |

---

## No External Dependencies

- **No npm** / no node_modules
- **No paid APIs** — timetable is 100% rule-based
- **No frameworks** — pure HTML, CSS, JavaScript
- **No CDN links** — fully offline-capable once loaded
- **localStorage** — data never leaves the user's browser

---

## Customising

| What | Where |
|---|---|
| Colour palette | CSS custom properties at the top of `style.css` (`:root` block) |
| Number of timetable days | `for (let d = 0; d < 14; d++)` in `generateTimetable()` in `script.js` |
| Minimum session length | `const SESSION_MIN = 0.5` in `script.js` |
| Priority weights | `const PRIORITY_WEIGHT` object in `script.js` |
