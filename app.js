const STATUSES = ["Pending", "Need to Assist / Help", "Done"];
// Replace this with the Google Apps Script deployment URL after deployment.
const API_URL = "https://script.google.com/macros/s/AKfycbxvtXDhDIiF1sHhlNvKnSGO6IGl85LG9-_hpgYPe5Kgpwf6FFOs4Zzb2LjHaX4Txb4/exec";
const state = {
  date: new Date(),
  days: new Map(),
  clients: [],
};

const dateKey = (date) => date.toISOString().slice(0, 10);
const formatDate = (date) => new Intl.DateTimeFormat("en-GB", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
}).format(date).replace(/^(\w+), (\d+)(?= )/, (_, day, number) => {
  const suffix = number.endsWith("1") && number !== "11" ? "st"
    : number.endsWith("2") && number !== "12" ? "nd"
    : number.endsWith("3") && number !== "13" ? "rd" : "th";
  return `${day}, ${number}${suffix}`;
});

function ensureDay() {
  const key = dateKey(state.date);
  if (!state.days.has(key)) state.days.set(key, []);
  return state.days.get(key);
}

function save() {
  const payload = {
    days: Object.fromEntries(state.days), clients: state.clients,
  };
  localStorage.setItem("cy-team-task-status", JSON.stringify(payload));
  if (API_URL) {
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    }).catch((error) => console.error("Online save failed:", error));
  }
}

async function load() {
  if (API_URL) {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Online load failed: ${response.status}`);
    const stored = await response.json();
    state.days = new Map(Object.entries(stored.days || {}));
    state.clients = stored.clients || [];
    return;
  }
  const stored = JSON.parse(localStorage.getItem("cy-team-task-status") || "null");
  if (!stored) return;
  state.days = new Map(Object.entries(stored.days || {}));
  state.clients = stored.clients || [];
}

function updateSummary(tasks) {
  const counts = tasks.reduce((result, task) => {
    result[task.status] = (result[task.status] || 0) + 1;
    return result;
  }, {});
  document.querySelector("#total-count").textContent = tasks.length;
  document.querySelector("#pending-count").textContent = counts.Pending || 0;
  document.querySelector("#help-count").textContent = counts["Need to Assist / Help"] || 0;
  document.querySelector("#done-count").textContent = counts.Done || 0;
}

function render() {
  const tasks = ensureDay();
  document.querySelector("#date-heading").textContent = formatDate(state.date);
  updateSummary(tasks);
  const container = document.querySelector("#table-container");
  if (!tasks.length) {
    container.innerHTML = '<div class="empty">No clients yet. Select “+ Add Client” to begin.</div>';
    return;
  }
  const grouped = tasks.reduce((groups, task) => {
    (groups[task.client] ||= []).push(task);
    return groups;
  }, {});
  const rows = Object.entries(grouped).flatMap(([client, clientTasks], index) =>
    clientTasks.map((task, taskIndex) => `
      <tr data-id="${task.id}">
        ${taskIndex === 0 ? `<td class="no" rowspan="${clientTasks.length}">${index + 1}</td><td class="client" rowspan="${clientTasks.length}" contenteditable="true" data-field="client">${escapeHtml(client)}</td>` : ""}
        <td class="task ${rowClass(task)}"><div contenteditable="true" data-field="task">${escapeHtml(task.task)}</div>${taskIndex === clientTasks.length - 1 ? '<div class="row-tools"><button class="add-task" type="button">+ Add Task</button></div>' : ""}</td>
        <td class="status ${rowClass(task)}"><select class="status-select" data-field="status">${STATUSES.map(status => `<option ${status === task.status ? "selected" : ""}>${status}</option>`).join("")}</select></td>
        <td class="remark ${rowClass(task)}"><div class="remark-value ${task.remark ? "" : "null"}" contenteditable="true" data-field="remark">${escapeHtml(task.remark || "NULL")}</div><button class="delete-task" type="button">Delete</button></td>
      </tr>`)).join("");
  container.innerHTML = `<table><thead><tr><th>No.</th><th>Client</th><th>Task</th><th>Status</th><th>Remark</th></tr></thead><tbody>${rows}</tbody></table>`;
  bindTable();
}

function rowClass(task) {
  return task.carried && task.status !== "Done" ? "carried" : task.status === "Done" ? "done" : task.status.startsWith("Need") ? "help" : "";
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}
function bindTable() {
  const tasks = ensureDay();
  document.querySelectorAll("tr[data-id]").forEach((row) => {
    const task = tasks.find((item) => item.id === row.dataset.id);
    row.querySelectorAll("[data-field]").forEach((field) => {
      field.addEventListener("blur", () => {
        let value = field.textContent.trim();
        if (field.dataset.field === "remark" && value === "NULL") value = "";
        task[field.dataset.field] = value;
        save(); render();
      });
    });
    row.querySelector("select").addEventListener("change", (event) => {
      task.status = event.target.value; task.carried = false; save(); render();
    });
    row.querySelector(".delete-task").addEventListener("click", () => {
      state.days.set(dateKey(state.date), tasks.filter((item) => item.id !== task.id));
      save(); render();
    });
    const add = row.querySelector(".add-task");
    if (add) add.addEventListener("click", () => {
      tasks.splice(tasks.indexOf(task) + 1, 0, { id: crypto.randomUUID(), client: task.client, task: "", status: "Pending", remark: "" });
      save(); render();
    });
  });
}

document.querySelector("#previous-day").addEventListener("click", () => { state.date.setDate(state.date.getDate() - 1); render(); });
document.querySelector("#next-day").addEventListener("click", () => { state.date.setDate(state.date.getDate() + 1); render(); });
document.querySelector("#today").addEventListener("click", () => { state.date = new Date(); render(); });
document.querySelector("#add-client").addEventListener("click", () => {
  const name = prompt("Client name");
  if (!name?.trim()) return;
  ensureDay().push({ id: crypto.randomUUID(), client: name.trim(), task: "", status: "Pending", remark: "" });
  if (!state.clients.includes(name.trim())) state.clients.push(name.trim());
  save(); render();
});
load().then(render).catch((error) => {
  console.error(error);
  render();
});
