export const ACCOUNT_SETTINGS_TABS = [
  'overview',
  'profile',
  'looks',
  'server',
  'data',
  'subs',
  'streaming',
  'favorites',
] as const;

export type AccountSettingsTab = (typeof ACCOUNT_SETTINGS_TABS)[number];

export function normalizeAccountSettingsTab(value: string | null | undefined): AccountSettingsTab {
  const normalized = (value ?? '').trim().toLowerCase();
  return (ACCOUNT_SETTINGS_TABS as readonly string[]).includes(normalized)
    ? (normalized as AccountSettingsTab)
    : 'overview';
}
