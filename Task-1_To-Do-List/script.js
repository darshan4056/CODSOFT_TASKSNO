
const STORAGE_KEY = "taskflow_tasks";
const THEME_KEY = "taskflow_theme";

let tasks = [];
let currentFilter = "all";
let editingId = null;

// DOM elements
const taskList = document.getElementById("taskList");
const taskModal = document.getElementById("taskModal");
const taskForm = document.getElementById("taskForm");

const taskTitle = document.getElementById("taskTitle");
const taskDescription = document.getElementById("taskDescription");
const taskCategory = document.getElementById("taskCategory");
const taskPriority = document.getElementById("taskPriority");
const taskDate = document.getElementById("taskDate");
const formError = document.getElementById("formError");
const themeToggle = document.getElementById("themeToggle");

// Generate unique ID
function generateId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString() + Math.random().toString(36).slice(2);
}

// Escape HTML for security
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// Load tasks
function loadTasks() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    tasks = Array.isArray(saved)
      ? saved.filter(task =>
          task &&
          typeof task.id === "string" &&
          typeof task.title === "string"
        ).map(task => ({
          ...task,
          description: task.description || "",
          category: task.category || "Other",
          priority: task.priority || "Medium",
          date: task.date || "",
          completed: Boolean(task.completed),
          createdAt: task.createdAt || Date.now()
        }))
      : [];
  } catch (error) {
    console.error("Unable to load tasks:", error);
    tasks = [];
  }
}

// Save tasks
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Unable to save tasks:", error);
    alert("Unable to save tasks. Check your browser storage.");
    return false;
  }
}

// Display current date
document.getElementById("currentDate").textContent =
  new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

// Open modal
function openModal(task = null) {
  taskForm.reset();
  formError.textContent = "";

  editingId = task ? task.id : null;

  document.getElementById("modalTitle").textContent =
    task ? "Edit Task" : "Create New Task";

  if (task) {
    taskTitle.value = task.title;
    taskDescription.value = task.description;
    taskCategory.value = task.category;
    taskPriority.value = task.priority;
    taskDate.value = task.date;
  }

  taskModal.classList.add("show");
  taskTitle.focus();
}

// Close modal
function closeModal() {
  taskModal.classList.remove("show");
  taskForm.reset();
  editingId = null;
  formError.textContent = "";
}

// Modal buttons
document.getElementById("addTaskBtn")
  .addEventListener("click", () => openModal());

document.getElementById("closeModal")
  .addEventListener("click", closeModal);

document.getElementById("cancelBtn")
  .addEventListener("click", closeModal);

// Close modal when clicking outside
taskModal.addEventListener("click", event => {
  if (event.target === taskModal) closeModal();
});

// Close modal using Escape key
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeModal();
});

// Add or update task
taskForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = taskTitle.value.trim();

  if (!title) {
    formError.textContent = "Please enter a valid task title.";
    taskTitle.focus();
    return;
  }

  const taskData = {
    title,
    description: taskDescription.value.trim(),
    category: taskCategory.value,
    priority: taskPriority.value,
    date: taskDate.value
  };

  if (editingId) {
    const index = tasks.findIndex(
      task => task.id === editingId
    );

    if (index !== -1) {
      tasks[index] = {
        ...tasks[index],
        ...taskData
      };
    }
  } else {
    tasks.unshift({
      id: generateId(),
      ...taskData,
      completed: false,
      createdAt: Date.now()
    });
  }

  if (!saveTasks()) return;

  renderTasks();
  closeModal();
});

// Edit task
function editTask(id) {
  const task = tasks.find(task => task.id === id);

  if (task) openModal(task);
}

// Delete task
function deleteTask(id) {
  if (!confirm("Are you sure you want to delete this task?")) {
    return;
  }

  const oldTasks = tasks;
  tasks = tasks.filter(task => task.id !== id);

  if (!saveTasks()) {
    tasks = oldTasks;
    return;
  }

  renderTasks();
}

// Complete / Pending task
function toggleTask(id) {
  const oldTasks = tasks;

  tasks = tasks.map(task =>
    task.id === id
      ? { ...task, completed: !task.completed }
      : task
  );

  if (!saveTasks()) {
    tasks = oldTasks;
    renderTasks();
    return;
  }

  renderTasks();
}

// Update dashboard statistics
function updateStats() {
  const total = tasks.length;

  const completed = tasks.filter(
    task => task.completed
  ).length;

  const pending = total - completed;

  const percentage = total
    ? Math.round((completed / total) * 100)
    : 0;

  document.getElementById("totalTasks").textContent = total;
  document.getElementById("completedTasks").textContent = completed;
  document.getElementById("pendingTasks").textContent = pending;

  document.getElementById("progressText").textContent =
    percentage + "%";

  document.getElementById("progressBar").style.width =
    percentage + "%";
}

// Render tasks
function renderTasks() {
  const search = document.getElementById("searchInput")
    .value.trim().toLowerCase();

  const category = document.getElementById("categoryFilter").value;
  const sort = document.getElementById("sortFilter").value;

  let filtered = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(search) ||
      task.description.toLowerCase().includes(search);

    const matchesCategory =
      category === "all" || task.category === category;

    const matchesStatus =
      currentFilter === "all" ||
      (currentFilter === "completed" && task.completed) ||
      (currentFilter === "pending" && !task.completed);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sorting
  if (sort === "due") {
    filtered.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  } else if (sort === "priority") {
    const order = {
      High: 3,
      Medium: 2,
      Low: 1
    };

    filtered.sort((a, b) =>
      (order[b.priority] || 0) -
      (order[a.priority] || 0)
    );
  } else {
    filtered.sort((a, b) =>
      (b.createdAt || 0) - (a.createdAt || 0)
    );
  }

  taskList.innerHTML = "";

  const emptyState = document.getElementById("emptyState");

  emptyState.style.display =
    filtered.length ? "none" : "block";

  // Render each task
  filtered.forEach(task => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = task.date
      ? new Date(task.date + "T00:00:00")
      : null;

    const isOverdue =
      dueDate &&
      dueDate < today &&
      !task.completed;

    const formattedDate = task.date
      ? dueDate.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        })
      : "No due date";

    const item = document.createElement("div");

    item.className =
      `task-item ${task.completed ? "done" : ""}`;

    item.innerHTML = `
      <div class="task-top">
        <label class="check-label">
          <input
            type="checkbox"
            class="task-check"
            ${task.completed ? "checked" : ""}
            aria-label="Mark task as completed"
          >

          <div class="task-content">
            <div class="task-name">
              ${escapeHTML(task.title)}
            </div>

            ${task.description
              ? `<p class="task-description">
                  ${escapeHTML(task.description)}
                </p>`
              : ""
            }

            <div class="task-meta">
              <span class="tag">
                ${escapeHTML(task.category)}
              </span>

              <span class="tag priority-${escapeHTML(task.priority)}">
                ${escapeHTML(task.priority)} Priority
              </span>

              <span class="tag">
                ${task.completed ? "Completed" : "Pending"}
              </span>
            </div>

            <p class="task-date ${isOverdue ? "overdue" : ""}">
              📅 ${formattedDate}
              ${isOverdue ? " · Overdue" : ""}
            </p>
          </div>
        </label>
      </div>

      <div class="task-actions">
        <button type="button" class="edit-btn">✏️ Edit</button>
        <button type="button" class="delete-btn">🗑️ Delete</button>
      </div>
    `;

    item.querySelector(".task-check")
      .addEventListener("change", () => toggleTask(task.id));

    item.querySelector(".edit-btn")
      .addEventListener("click", () => editTask(task.id));

    item.querySelector(".delete-btn")
      .addEventListener("click", () => deleteTask(task.id));

    taskList.appendChild(item);
  });

  // Result count
  const resultCount = document.getElementById("resultCount");

  if (resultCount) {
    resultCount.textContent =
      `${filtered.length} task${filtered.length !== 1 ? "s" : ""} shown`;
  }

  updateStats();
}

// Search
document.getElementById("searchInput")
  .addEventListener("input", renderTasks);

// Category filter
document.getElementById("categoryFilter")
  .addEventListener("change", renderTasks);

// Sorting
document.getElementById("sortFilter")
  .addEventListener("change", renderTasks);

// Status filter buttons
document.querySelectorAll(".filter-btn").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;

    document.querySelectorAll(".filter-btn").forEach(btn =>
      btn.classList.remove("active")
    );

    button.classList.add("active");
    renderTasks();
  });
});

// Dark mode
function applyTheme(theme) {
  document.body.classList.toggle(
    "dark",
    theme === "dark"
  );

  themeToggle.textContent =
    theme === "dark"
      ? "☀️ Light Mode"
      : "🌙 Dark Mode";
}

let savedTheme = "light";

try {
  savedTheme = localStorage.getItem(THEME_KEY) || "light";
} catch (error) {
  console.error("Unable to load theme:", error);
}

applyTheme(savedTheme);

themeToggle.addEventListener("click", () => {
  savedTheme = document.body.classList.contains("dark")
    ? "light"
    : "dark";

  try {
    localStorage.setItem(THEME_KEY, savedTheme);
  } catch (error) {
    console.error("Unable to save theme:", error);
  }

  applyTheme(savedTheme);
});

// Initialize application
loadTasks();
renderTasks();
