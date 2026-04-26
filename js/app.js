import {
  CADENCE_OPTIONS,
  completePrayerSession,
  createEntry,
  formatReadableDate,
  getCurrentDueOccurrence,
  getDueEntries,
  getRenewalEntries,
  getTodayDate,
  loadState,
  removeEntry,
  renewEntry,
  saveState,
} from "./schedule.js";

const state = {
  entries: loadState(),
  activeView: "add-view",
};

const ui = {
  menuButtons: [...document.querySelectorAll("[data-view-target]")],
  views: [...document.querySelectorAll(".view")],
  entryForm: document.querySelector("#entry-form"),
  formStatus: document.querySelector("#form-status"),
  dueList: document.querySelector("#due-list"),
  emptyState: document.querySelector("#empty-state"),
  rollDate: document.querySelector("#roll-date"),
  endPrayerButton: document.querySelector("#end-prayer"),
  dueItemTemplate: document.querySelector("#due-item-template"),
  renewalItemTemplate: document.querySelector("#renewal-item-template"),
  renewalDialog: document.querySelector("#renewal-dialog"),
  renewalList: document.querySelector("#renewal-list"),
  renewalStrip: document.querySelector("#renewal-strip"),
  renewalStripText: document.querySelector("#renewal-strip-text"),
  openRenewalsButton: document.querySelector("#open-renewals"),
  renewalBadge: document.querySelector("#renewal-badge"),
};

function persist() {
  saveState(state.entries);
}

function setStatus(message) {
  ui.formStatus.textContent = message;
}

function switchView(viewId) {
  state.activeView = viewId;

  ui.views.forEach((view) => {
    view.classList.toggle("is-active", view.id === viewId);
  });

  ui.menuButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewTarget === viewId);
  });

  if (viewId === "roll-view") {
    renderRollView();
    maybeOpenRenewalDialog();
  }
}

function describeDueItem(entry, due, today) {
  if (due.isFinal) {
    return due.isOverdue
      ? `Final prayer date was ${formatReadableDate(due.scheduledDate)}. Renewal will appear after prayer.`
      : `Final prayer date is ${formatReadableDate(due.scheduledDate)}. Renewal will appear after prayer.`;
  }

  if (due.isOverdue) {
    return `Due since ${formatReadableDate(due.scheduledDate)}. It will stay here until you finish this prayer.`;
  }

  const nextScheduled = entry.scheduledDates.find((date) => date > today);
  return nextScheduled
    ? `Visible from ${formatReadableDate(due.scheduledDate)} until the next date arrives on ${formatReadableDate(nextScheduled)}.`
    : `Visible starting ${formatReadableDate(due.scheduledDate)}.`;
}

function renderRollView() {
  const today = getTodayDate();
  const dueItems = getDueEntries(state.entries, today);
  const renewalItems = getRenewalEntries(state.entries);

  ui.rollDate.textContent = formatReadableDate(today);
  ui.dueList.innerHTML = "";

  dueItems.forEach(({ entry, due }) => {
    const fragment = ui.dueItemTemplate.content.cloneNode(true);
    fragment.querySelector(".due-name").textContent = entry.name;
    fragment.querySelector(".due-note").textContent = entry.note;
    fragment.querySelector(".due-meta").textContent = describeDueItem(entry, due, today);
    ui.dueList.append(fragment);
  });

  ui.emptyState.hidden = dueItems.length > 0;
  ui.endPrayerButton.disabled = dueItems.length === 0;

  ui.renewalStrip.hidden = renewalItems.length === 0;
  ui.renewalBadge.hidden = renewalItems.length === 0;
  ui.renewalBadge.textContent = String(renewalItems.length);
  ui.renewalStripText.textContent =
    renewalItems.length === 1
      ? "1 prayer run is waiting for renewal."
      : `${renewalItems.length} prayer runs are waiting for renewal.`;
}

function renderRenewals() {
  const renewalItems = getRenewalEntries(state.entries);
  ui.renewalList.innerHTML = "";

  renewalItems.forEach((entry) => {
    const fragment = ui.renewalItemTemplate.content.cloneNode(true);
    fragment.querySelector(".renewal-name").textContent = entry.name;
    fragment.querySelector(".renewal-note").textContent = entry.note;
    fragment.querySelector(".renewal-meta").textContent = `Last scheduled date: ${formatReadableDate(entry.scheduledDates[entry.scheduledDates.length - 1])}`;

    fragment.querySelectorAll(".renewal-action").forEach((button) => {
      button.dataset.entryId = entry.id;
    });

    ui.renewalList.append(fragment);
  });

  return renewalItems;
}

function maybeOpenRenewalDialog() {
  const items = renderRenewals();

  if (items.length > 0 && !ui.renewalDialog.open) {
    ui.renewalDialog.showModal();
  }
}

function handleFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(ui.entryForm);

  try {
    const entry = createEntry({
      name: String(formData.get("name") || ""),
      note: String(formData.get("note") || ""),
      cadence: String(formData.get("cadence") || ""),
    });

    state.entries = [entry, ...state.entries];
    persist();
    ui.entryForm.reset();
    ui.entryForm.elements.cadence.value = "daily_week";
    setStatus(`${entry.name} was added with ${CADENCE_OPTIONS[entry.cadence].label.toLowerCase()}.`);
    renderRollView();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to add this name.");
  }
}

function handleEndPrayer() {
  const today = getTodayDate();
  const result = completePrayerSession(state.entries, today);

  if (!result.completedCount) {
    renderRollView();
    return;
  }

  state.entries = result.entries;
  persist();
  renderRollView();

  maybeOpenRenewalDialog();
}

function handleRenewalAction(event) {
  const target = event.target;

  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  if (!target.classList.contains("renewal-action")) {
    return;
  }

  const entryId = target.dataset.entryId;
  const action = target.dataset.action;

  state.entries = state.entries.map((entry) => {
    if (entry.id !== entryId) {
      return entry;
    }

    if (action === "remove") {
      return removeEntry(entry);
    }

    return renewEntry(entry, action);
  });

  persist();
  renderRollView();

  if (!renderRenewals().length && ui.renewalDialog.open) {
    ui.renewalDialog.close();
  }
}

function registerEvents() {
  ui.menuButtons.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.viewTarget));
  });

  ui.entryForm.addEventListener("submit", handleFormSubmit);
  ui.endPrayerButton.addEventListener("click", handleEndPrayer);
  ui.openRenewalsButton.addEventListener("click", maybeOpenRenewalDialog);
  ui.renewalList.addEventListener("click", handleRenewalAction);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function seedExampleDataForFirstRun() {
  if (state.entries.length > 0) {
    return;
  }

  persist();
}

function init() {
  seedExampleDataForFirstRun();
  registerEvents();
  renderRollView();
  switchView(state.activeView);
  registerServiceWorker();
}

init();
