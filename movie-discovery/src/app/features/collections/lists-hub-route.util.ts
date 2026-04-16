export type ListsTab = 'statuses' | 'collections';

export function deriveListsTabFromUrl(url: string): ListsTab {
  return url.includes('/statuses') ? 'statuses' : 'collections';
}

export function isAccountListsUrl(url: string): boolean {
  return url.includes('/account/lists');
}
