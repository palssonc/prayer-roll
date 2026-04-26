import assert from "node:assert/strict";

import {
  completePrayerSession,
  createEntry,
  createScheduledDates,
  getCurrentDueOccurrence,
  getDueEntries,
  renewEntry,
} from "../js/schedule.js";

const tests = [
  {
    name: "daily cadence creates seven consecutive dates",
    run() {
      assert.deepEqual(createScheduledDates("2026-04-25", "daily_week"), [
        "2026-04-25",
        "2026-04-26",
        "2026-04-27",
        "2026-04-28",
        "2026-04-29",
        "2026-04-30",
        "2026-05-01",
      ]);
    },
  },
  {
    name: "weekly cadence creates eight weekly dates",
    run() {
      assert.deepEqual(createScheduledDates("2026-04-22", "weekly_two_months"), [
        "2026-04-22",
        "2026-04-29",
        "2026-05-06",
        "2026-05-13",
        "2026-05-20",
        "2026-05-27",
        "2026-06-03",
        "2026-06-10",
      ]);
    },
  },
  {
    name: "missed daily date rolls forward without duplicating the name",
    run() {
      const entry = createEntry({
        name: "Ana",
        note: "Healing",
        cadence: "daily_week",
        today: "2026-04-25",
      });

      assert.deepEqual(getCurrentDueOccurrence(entry, "2026-04-26"), {
        scheduledDate: "2026-04-26",
        isOverdue: false,
        isFinal: false,
      });
    },
  },
  {
    name: "weekly entry appears once when multiple dates have passed",
    run() {
      const entry = createEntry({
        name: "Micah",
        note: "New job",
        cadence: "weekly_two_months",
        today: "2026-04-22",
      });

      assert.deepEqual(getCurrentDueOccurrence(entry, "2026-05-07"), {
        scheduledDate: "2026-05-06",
        isOverdue: true,
        isFinal: false,
      });
    },
  },
  {
    name: "prayer session completes the final occurrence and queues renewal",
    run() {
      const entry = createEntry({
        name: "Ruth",
        note: "Comfort",
        cadence: "daily_week",
        today: "2026-04-25",
      });

      const completedEarlier = {
        ...entry,
        completedScheduledDates: entry.scheduledDates.slice(0, 6),
      };

      const result = completePrayerSession([completedEarlier], "2026-05-01");

      assert.equal(result.completedCount, 1);
      assert.equal(result.entries[0].renewalNeeded, true);
      assert.deepEqual(result.entries[0].completedScheduledDates, entry.scheduledDates);
    },
  },
  {
    name: "completion hides an overdue weekly name until the next scheduled date",
    run() {
      const entry = createEntry({
        name: "Leah",
        note: "Direction",
        cadence: "weekly_two_months",
        today: "2026-04-22",
      });

      const result = completePrayerSession([entry], "2026-04-24");
      const updated = result.entries[0];

      assert.equal(getDueEntries([updated], "2026-04-24").length, 0);
      assert.deepEqual(getCurrentDueOccurrence(updated, "2026-04-30"), {
        scheduledDate: "2026-04-29",
        isOverdue: true,
        isFinal: false,
      });
    },
  },
  {
    name: "renewal creates a new run from the renewal date",
    run() {
      const entry = createEntry({
        name: "Ben",
        note: "Peace",
        cadence: "weekly_two_months",
        today: "2026-04-22",
      });

      const renewed = renewEntry(
        {
          ...entry,
          renewalNeeded: true,
          completedScheduledDates: [...entry.scheduledDates],
        },
        "daily_week",
        "2026-06-11",
      );

      assert.equal(renewed.cadence, "daily_week");
      assert.equal(renewed.renewalNeeded, false);
      assert.deepEqual(renewed.scheduledDates, [
        "2026-06-11",
        "2026-06-12",
        "2026-06-13",
        "2026-06-14",
        "2026-06-15",
        "2026-06-16",
        "2026-06-17",
      ]);
      assert.equal(renewed.runHistory.length, 1);
    },
  },
];

let failed = 0;

for (const current of tests) {
  try {
    current.run();
    console.log(`PASS ${current.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${current.name}`);
    console.error(error);
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`Passed ${tests.length} tests.`);
}
