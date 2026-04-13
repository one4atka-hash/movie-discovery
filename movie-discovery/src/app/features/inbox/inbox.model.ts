export type InboxItemType = 'info' | 'release' | 'availability' | 'digest';

export interface InboxExplain {
  readonly label: string;
  readonly detail?: string | null;
}

export interface InboxItem {
  readonly id: string;
  readonly type: InboxItemType;
  readonly title: string;
  readonly body?: string | null;
  readonly tmdbId?: number | null;
  readonly explain?: InboxExplain[];
  readonly createdAt: number;
  readonly readAt?: number | null;
}

export interface AlertRule {
  readonly id: string;
  readonly name: string;
  readonly enabled: boolean;
  readonly filters: {
    readonly minRating?: number | null;
    readonly genres?: readonly number[] | null;
    readonly maxRuntime?: number | null;
    readonly languages?: readonly string[] | null;
    readonly providerKeys?: readonly string[] | null;
  };
  readonly channels: {
    readonly inApp: boolean;
    readonly webPush: boolean;
    readonly email: boolean;
    readonly calendar: boolean;
  };
  readonly createdAt: number;
  readonly updatedAt: number;
}
