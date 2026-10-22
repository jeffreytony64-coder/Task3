
"use strict";

// DOM elements
const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const priorityInput = document.getElementById("task-priority");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const formHint = document.getElementById("form-hint");
const submitButton = document.getElementById("submit-button");
const filterButtons = document.querySelectorAll("[data-filter]");
const clearCompletedButton = document.getElementById("clear-completed");
const listStatus = document.getElementById("list-status");

// Application state
const STORAGE_KEY = "taskflow-tasks-v1";
let currentFilter = "all";
let editingId = null;

// Load saved tasks safely
function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(task =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.completed === "boolean" &&
      ["low", "medium", "high"].includes(task.priority)
    );
  } catch (error) {
    console.error("Could not load saved tasks:", error);
    return [];
  }
}

let tasks = loadTasks();

// Save the current state
function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    formHint.textContent =
      "Warning: tasks could not be saved in this browser.";
    return false;
  }
}

// Create a unique task ID
function createId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Add a new task or update an existing task
taskForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const title = taskInput.value.trim();
  const priority = priorityInput.value;

  if (!title) {
    formHint.textContent = "Please enter a task before submitting.";
    taskInput.focus();
    return;
  }

  if (editingId !== null) {
    const task = tasks.find(item => item.id === editingId);

    if (task) {
      task.title = title;
      task.priority = priority;
    }

    editingId = null;
    submitButton.textContent = "+ Add task";
    formHint.textContent = "Task updated successfully.";
  } else {
    tasks.unshift({
      id: createId(),
      title: title,
      priority: priority,
      completed: false,
      createdAt: new Date().toISOString()
    });

    formHint.textContent = "Your new task has been added.";
  }

  taskInput.value = "";
  priorityInput.value = "medium";

  saveTasks();
  renderTasks();
  taskInput.focus();
});

// Get the tasks matching the selected filter
function getFilteredTasks() {
  if (currentFilter === "active") {
    return tasks.filter(task => !task.completed);
  }

  if (currentFilter === "completed") {
    return tasks.filter(task => task.completed);
  }

  return tasks;
}

// Create a task element safely
function createTaskElement(task) {
  const item = document.createElement("li");
  item.className = `task-item${task.completed ? " completed" : ""}`;
  item.dataset.id = task.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.dataset.action = "toggle";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Complete ${task.title}`);

  const content = document.createElement("div");
  content.className = "task-content";

  const title = document.createElement("div");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const priority = document.createElement("span");
  priority.className = `priority priority-${task.priority}`;
  priority.textContent =
    task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

  const date = document.createElement("span");
  date.textContent = `Added ${new Date(task.createdAt).toLocaleDateString()}`;

  meta.append(priority, date);
  content.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "action-button";
  editButton.dataset.action = "edit";
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit ${task.title}`);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "action-button delete-button";
  deleteButton.dataset.action = "delete";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

  actions.append(editButton, deleteButton);
  item.append(checkbox, content, actions);

  return item;
}

// Update the dashboard and display the correct tasks
function renderTasks() {
  const visibleTasks = getFilteredTasks();
  const completedCount = tasks.filter(task => task.completed).length;
  const activeCount = tasks.length - completedCount;
  const progress = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  document.getElementById("total-count").textContent = tasks.length;
  document.getElementById("active-count").textContent = activeCount;
  document.getElementById("completed-count").textContent = completedCount;
  document.getElementById("progress-label").textContent = `${progress}%`;
  document.getElementById("progress-fill").style.width = `${progress}%`;

  const progressTrack = document.getElementById("progress-track");
  progressTrack.setAttribute("aria-valuenow", progress);

  document.getElementById("visible-count").textContent =
    `${visibleTasks.length} ${visibleTasks.length === 1 ? "task" : "tasks"}`;

  taskList.replaceChildren();

  visibleTasks.forEach(task => {
    taskList.appendChild(createTaskElement(task));
  });

  emptyState.hidden = visibleTasks.length > 0;

  if (visibleTasks.length === 0) {
    const messages = {
      all: ["Your next win starts here", "Add a task above and make progress today."],
      active: ["All caught up!", "There are no active tasks right now."],
      completed: ["Nothing completed yet", "Finish a task and it will appear here."]
    };

    emptyState.querySelector("h3").textContent = messages[currentFilter][0];
    emptyState.querySelector("p").textContent = messages[currentFilter][1];
  }

  filterButtons.forEach(button => {
    const selected = button.dataset.filter === currentFilter;

    button.classList.toggle("active-filter", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  clearCompletedButton.disabled = completedCount === 0;
  clearCompletedButton.style.opacity =
    completedCount === 0 ? "0.5" : "1";
}

// Event delegation: handle all task actions in one listener
taskList.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const item = button.closest(".task-item");
  if (!item) return;

  const task = tasks.find(task => task.id === item.dataset.id);
  if (!task) return;

  const action = button.dataset.action;

  if (action === "edit") {
    editingId = task.id;
    taskInput.value = task.title;
    priorityInput.value = task.priority;
    submitButton.textContent = "Save changes";
    formHint.textContent = "Edit the task above, then save your changes.";
    taskInput.focus();
  }

  if (action === "delete") {
    tasks = tasks.filter(task => task.id !== item.dataset.id);

    if (editingId === item.dataset.id) {
      cancelEditing();
    }

    saveTasks();
    renderTasks();
    listStatus.textContent = "Task deleted.";
  }
});

// Handle checkbox changes through event delegation
taskList.addEventListener("change", function (event) {
  if (!event.target.matches('input[data-action="toggle"]')) return;

  const item = event.target.closest(".task-item");
  if (!item) return;

  const task = tasks.find(task => task.id === item.dataset.id);
  if (!task) return;

  task.completed = event.target.checked;

  saveTasks();
  renderTasks();

  listStatus.textContent = task.completed
    ? "Task marked as completed."
    : "Task marked as active.";
});

// Switch between All, Active, and Completed
filterButtons.forEach(button => {
  button.addEventListener("click", function () {
    currentFilter = button.dataset.filter;
    renderTasks();
  });
});

// Remove all completed tasks
clearCompletedButton.addEventListener("click", function () {
  const completedCount = tasks.filter(task => task.completed).length;

  if (completedCount === 0) return;

  tasks = tasks.filter(task => !task.completed);

  cancelEditing();
  saveTasks();
  renderTasks();

  listStatus.textContent = `${completedCount} completed tasks cleared.`;
});

// Cancel the current edit
function cancelEditing() {
  editingId = null;
  taskInput.value = "";
  priorityInput.value = "medium";
  submitButton.textContent = "+ Add task";
  formHint.textContent = "Choose a priority and add your next task.";
}

// Initial render when the page loads
renderTasks();
