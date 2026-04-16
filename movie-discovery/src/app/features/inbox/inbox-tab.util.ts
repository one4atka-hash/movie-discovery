export const INBOX_TABS = ['feed', 'rules', 'subs'] as const;

export type InboxTab = (typeof INBOX_TABS)[number];

export function normalizeInboxTab(value: string | null | undefined): InboxTab {
  const normalized = (value ?? '').trim().toLowerCase();
  return (INBOX_TABS as readonly string[]).includes(normalized) ? (normalized as InboxTab) : 'feed';
}
