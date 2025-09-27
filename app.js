// app.js
import { getChapters, updateChapter } from "./firebase.js";

const tabs = document.querySelectorAll(".tab");
const content = document.getElementById("tab-content");
const taskWeights = {
  ex1: 0.8,
  ex2: 0.8,
  ex3: 0.8,
  ex4a: 1,
  ex4b: 1.2,
  ex5: 1.4,
};


// Priority classification
function classifyPriority(value) {
  if (value < 2) return "Low";
  if (value < 3) return "Medium";
  return "High";
}

// Render Home tab (optimized)
async function renderHome(push = true) {
  if (push) {
    window.history.pushState({ type: "tab", tab: "home" }, "home", "?subject=home");
  }

  const subjects = ["physics", "chemistry", "math"];
  const allChapters = await Promise.all(subjects.map(s => getChapters(s))); // fetch all in parallel

  let totalWeight = 0, doneWeight = 0;
  allChapters.forEach(chapters => {
    chapters.forEach(ch => {
      const tasks = ch.tasks || {};
      const chapterWeight = ch.priority || 1;

      Object.entries(tasks).forEach(([taskName, isDone]) => {
        const taskWeight = taskWeights[taskName] || 1; // fallback if missing
        const effectiveWeight = chapterWeight * taskWeight;

        totalWeight += effectiveWeight;
        if (isDone) doneWeight += effectiveWeight;
      });
    });
  });

  const overallPct = totalWeight ? ((doneWeight / totalWeight) * 100).toFixed(1) : 0;
  const start = new Date("2025-09-01"), end = new Date("2025-12-30"), now = new Date();
  const timePct = now < start ? 0 : now > end ? 100 : (((now - start) / (end - start)) * 100).toFixed(1);

  // Build HTML
  const html = `
    <div class="section">
      <h2>Overall Progress</h2>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${overallPct}%"></div>
      </div>
      <p>${overallPct}% completed</p>
    </div>
    <div class="section">
      <h2>Time Progress</h2>
      <div class="progress-bar"><div class="progress-fill" style="width:${timePct}%;background:steelblue"></div></div>
      <p>${timePct}% of time elapsed (1 Sept – 30 Dec)</p>
    </div>
    ${subjects.map((s, i) => {
      const chapters = allChapters[i];
      const chaptersHtml = chapters.map(ch => {
        const priority = classifyPriority(ch.priority);
        const color = priority === "High" ? "lightcoral" :
                      priority === "Medium" ? "khaki" : "lightgreen";
        const border = priority === "High" ? "red" :
                       priority === "Medium" ? "goldenrod" : "green";

        const taskKeys = Object.keys(ch.tasks || {});
        const done = Object.values(ch.tasks || {}).filter(Boolean).length;
        const pct = taskKeys.length ? (done / taskKeys.length) * 100 : 0;

        return `
          <div class="chapter-box" style="border:2px solid ${border};">
            <div class="chapter-fill" style="width:${pct}%; background:${color};"></div>
            <div class="chapter-content">
              <h4>${ch.name}</h4>
            </div>
          </div>
          `;
      }).join("");

      return `<div class="section"><h3>${s.toUpperCase()}</h3><div class="chapters">${chaptersHtml}</div></div>`;
    }).join("")}`;

  content.innerHTML = html;
}
// Renders a subject tab with progress and tasks
async function renderSubject(subject, push = true) {
  if (push) {
    window.history.pushState({ type: "tab", tab: subject }, subject, `?subject=${subject}`);
  }

  const chapters = await getChapters(subject);
  if (!chapters.length) {
    content.innerHTML = `<p>No chapters found for ${subject}.</p>`;
    return;
  }

  // Collect & sort task keys (notes → exercises → book → others)
  const taskKeys = [...new Set(chapters.flatMap(ch => Object.keys(ch.tasks || {})))].sort((a, b) => {
    const order = k => k.toLowerCase() === "notes" ? 0 :
                      /^ex\d+/i.test(k) ? 1 :
                      k.toLowerCase() === "book" ? 2 : 3;
    if (order(a) !== order(b)) return order(a) - order(b);
    const na = a.match(/^ex(\d+)/i), nb = b.match(/^ex(\d+)/i);
    return na && nb ? +na[1] - +nb[1] : a.localeCompare(b);
  });

  // Generate HTML for table
  let html = `
    <div class="section">
      <h2>${subject.toUpperCase()}</h2>
      <div class="progress-bar">
        <div class="progress-fill" style="width:0%; transition: width 0.3s ease;"></div>
      </div>
      <p>0% completed</p>
    </div>
    <table class="table">
      <thead>
        <tr>
          <th>Chapter</th>
          ${taskKeys.map(k => `<th>${k}</th>`).join("")}
          <th>Priority</th>
        </tr>
      </thead>
      <tbody>
        ${chapters.map(ch => `
          <tr data-chapter-id="${ch.id}">
            <td>${ch.name}</td>
            ${taskKeys.map(t => `
              <td><input type="checkbox" class="task-checkbox" data-task="${t}" ${ch.tasks?.[t] ? "checked" : ""}></td>
            `).join("")}
            <td><input type="number" min="1" max="10" value="${ch.priority}" class="priority-input"></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  content.innerHTML = html;

  function updateProgress() {
    // exercise-specific weights
    

    let totalWeight = 0;
    let doneWeight = 0;

    chapters.forEach((ch) => {
      const tasks = ch.tasks || {};
      const chapterWeight = ch.priority || 1;

      Object.entries(tasks).forEach(([taskName, isDone]) => {
        const taskWeight = taskWeights[taskName] || 1; // fallback if missing
        const effectiveWeight = chapterWeight * taskWeight;

        totalWeight += effectiveWeight;
        if (isDone) doneWeight += effectiveWeight;
      });
    });

    const pct = totalWeight ? ((doneWeight / totalWeight) * 100).toFixed(1) : 0;

    document.querySelector(".progress-fill").style.width = `${pct}%`;
    document.querySelector(".section p").textContent = `${pct}% completed`;
  }
  // 🔹 Initial progress update
  updateProgress();

  // Add event listeners for priority inputs
  document.querySelectorAll(".priority-input").forEach(input => {
    input.addEventListener("change", async function() {
      const tr = this.closest("tr");
      const chapterId = tr.dataset.chapterId;
      const newPriority = +this.value;

      const chIndex = chapters.findIndex(c => c.id === chapterId);
      chapters[chIndex].priority = newPriority; // update local

      await updateChapter(subject, chapterId, { priority: newPriority });
    });
  });

  // Add event listeners for task checkboxes
  document.querySelectorAll(".task-checkbox").forEach(checkbox => {
    checkbox.addEventListener("change", async function() {
      const tr = this.closest("tr");
      const chapterId = tr.dataset.chapterId;
      const taskName = this.dataset.task;

      const chIndex = chapters.findIndex(c => c.id === chapterId);
      const ch = chapters[chIndex];

      const updatedTasks = { ...ch.tasks, [taskName]: this.checked };
      chapters[chIndex].tasks = updatedTasks; // update local state

      await updateChapter(subject, chapterId, { tasks: updatedTasks });

      // 🔥 update progress bar immediately
      updateProgress();
    });
  });
}


// Tab rendering
async function loadTab(name, push) {
  if (name === "home") {
    await renderHome(push);
  } else {
    await renderSubject(name, push);
  }
}

// Helper to set active class
function setActiveTab(view) {
  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === view));
}

// Click handler
tabs.forEach(tab => {
  tab.addEventListener("click", () => {

    if (window.innerWidth <= 768) {
      tabsContainer.classList.remove("show");
    }

    const view = tab.dataset.tab;
    setActiveTab(view);

    // pushState updates URL
    window.history.pushState({ type: "tab", tab: view }, view, `?subject=${view}`);

    // Load the tab content
    loadTab(view);
  });
});

const menuToggle = document.getElementById("menu-toggle");
const tabsContainer = document.querySelector(".tabs");

menuToggle.addEventListener("click", () => {
  tabsContainer.classList.toggle("show");
});

// On page load: read ?subject=... or default to 'home'
const urlParams = new URLSearchParams(window.location.search);
const initialTab = urlParams.get("subject") || "home";
setActiveTab(initialTab);
loadTab(initialTab);

// Handle back/forward navigation
window.addEventListener("popstate", e => {
  const view = e.state?.tab || "home";
  setActiveTab(view);
  loadTab(view);
});