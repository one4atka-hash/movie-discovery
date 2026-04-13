import {
  reminderTriggerDate,
  shouldEnqueueReminder,
} from './release-reminders-window.util';

describe('release-reminders-window.util', () => {
  it('reminderTriggerDate subtracts days in UTC', () => {
    expect(reminderTriggerDate('2026-03-10', 7)).toBe('2026-03-03');
    expect(reminderTriggerDate('2026-01-05', 0)).toBe('2026-01-05');
  });

  it('shouldEnqueueReminder fires on trigger day once', () => {
    expect(
      shouldEnqueueReminder({
        todayYmd: '2026-03-03',
        releaseDateYmd: '2026-03-10',
        daysBefore: 7,
        lastNotifiedOnYmd: null,
      }),
    ).toBe(true);

    expect(
      shouldEnqueueReminder({
        todayYmd: '2026-03-03',
        releaseDateYmd: '2026-03-10',
        daysBefore: 7,
        lastNotifiedOnYmd: '2026-03-03',
      }),
    ).toBe(false);

    expect(
      shouldEnqueueReminder({
        todayYmd: '2026-03-02',
        releaseDateYmd: '2026-03-10',
        daysBefore: 7,
        lastNotifiedOnYmd: null,
      }),
    ).toBe(false);
  });
});
