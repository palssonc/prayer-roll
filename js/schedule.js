export const STORAGE_KEY = "prayer-roll-app-state-v1";

export const CADENCE_OPTIONS = {
  daily_week: {
    label: "Daily for a week",
    count: 7,
    stepDays: 1,
  },
  weekly_two_months: {
    label: "Weekly for two months",
    count: 8,
    stepDays: 7,
  },
};

export function getTodayDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return getTodayDate(date);
}

export function formatReadableDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function createScheduledDates(startDate, cadence) {
  const option = CADENCE_OPTIONS[cadence];

  if (!option) {
    throw new Error(`Unknown cadence: ${cadence}`);
  }

  return Array.from({ length: option.count }, (_, index) => addDays(startDate, option.stepDays * index));
}

export function createEntry({ name, note, cadence, today = getTodayDate() }) {
  const trimmedName = name.trim();
  const trimmedNote = note.trim();

  if (!trimmedName) {
    throw new Error("Name is required.");
  }

  if (!trimmedNote) {
    throw new Error("Note is required.");
  }

  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    name: trimmedName,
    note: trimmedNote,
    cadence,
    createdDate: today,
    scheduledDates: createScheduledDates(today, cadence),
    completedScheduledDates: [],
    completionHistory: [],
    runHistory: [],
    renewalNeeded: false,
    active: true,
    archivedAt: null,
  };
}

export function getLatestScheduledOnOrBefore(entry, today) {
  const available = entry.scheduledDates.filter((date) => date <= today);
  return available.length ? available[available.length - 1] : null;
}

export function getCurrentDueOccurrence(entry, today = getTodayDate()) {
  if (!entry.active || entry.archivedAt || entry.renewalNeeded) {
    return null;
  }

  const scheduledDate = getLatestScheduledOnOrBefore(entry, today);

  if (!scheduledDate) {
    return null;
  }

  if (entry.completedScheduledDates.includes(scheduledDate)) {
    return null;
  }

  return {
    scheduledDate,
    isOverdue: scheduledDate < today,
    isFinal: scheduledDate === entry.scheduledDates[entry.scheduledDates.length - 1],
  };
}

export function getDueEntries(entries, today = getTodayDate()) {
  return entries
    .map((entry) => ({ entry, due: getCurrentDueOccurrence(entry, today) }))
    .filter((item) => item.due)
    .sort((left, right) => left.due.scheduledDate.localeCompare(right.due.scheduledDate));
}

export function getRenewalEntries(entries) {
  return entries.filter((entry) => entry.active && entry.renewalNeeded && !entry.archivedAt);
}

export function completePrayerSession(entries, today = getTodayDate()) {
  const dueItems = getDueEntries(entries, today);

  if (!dueItems.length) {
    return {
      entries,
      completedCount: 0,
      renewedNow: [],
    };
  }

  const updatedEntries = entries.map((entry) => {
    const match = dueItems.find((item) => item.entry.id === entry.id);

    if (!match) {
      return entry;
    }

    const scheduledDate = match.due.scheduledDate;

    if (entry.completedScheduledDates.includes(scheduledDate)) {
      return entry;
    }

    const completedScheduledDates = [...entry.completedScheduledDates, scheduledDate];
    const completionHistory = [
      ...entry.completionHistory,
      {
        scheduledDate,
        prayedOn: today,
      },
    ];

    return {
      ...entry,
      completedScheduledDates,
      completionHistory,
      renewalNeeded: match.due.isFinal,
    };
  });

  return {
    entries: updatedEntries,
    completedCount: dueItems.length,
    renewedNow: getRenewalEntries(updatedEntries),
  };
}

function captureRunSnapshot(entry, resolvedOn) {
  return {
    cadence: entry.cadence,
    startedOn: entry.createdDate,
    scheduledDates: [...entry.scheduledDates],
    completedScheduledDates: [...entry.completedScheduledDates],
    completionHistory: [...entry.completionHistory],
    resolvedOn,
  };
}

export function renewEntry(entry, cadence, today = getTodayDate()) {
  const historyItem = captureRunSnapshot(entry, today);
  return {
    ...entry,
    cadence,
    createdDate: today,
    scheduledDates: createScheduledDates(today, cadence),
    completedScheduledDates: [],
    completionHistory: [],
    runHistory: [...entry.runHistory, historyItem],
    renewalNeeded: false,
    active: true,
    archivedAt: null,
  };
}

export function removeEntry(entry, today = getTodayDate()) {
  const historyItem = captureRunSnapshot(entry, today);
  return {
    ...entry,
    runHistory: [...entry.runHistory, historyItem],
    active: false,
    renewalNeeded: false,
    archivedAt: today,
  };
}

export function saveState(entries, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function loadState(storage = window.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}
