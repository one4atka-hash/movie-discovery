import { describe, expect, it } from '@jest/globals';

import { isInQuietHours, matchesFilters } from './alerts-matcher';

describe('matchesFilters', () => {
  it('matches empty filters', () => {
    expect(matchesFilters({}, {})).toBe(true);
  });

  it('checks minRating', () => {
    expect(matchesFilters({ rating: 7.4 }, { minRating: 7.5 })).toBe(false);
    expect(matchesFilters({ rating: 7.5 }, { minRating: 7.5 })).toBe(true);
  });

  it('checks maxRuntime', () => {
    expect(matchesFilters({ runtimeMinutes: 151 }, { maxRuntime: 150 })).toBe(
      false,
    );
    expect(matchesFilters({ runtimeMinutes: 150 }, { maxRuntime: 150 })).toBe(
      true,
    );
  });

  it('checks languages (case-insensitive)', () => {
    expect(matchesFilters({ language: 'en' }, { languages: ['ru'] })).toBe(
      false,
    );
    expect(
      matchesFilters({ language: 'EN' }, { languages: ['en', 'ru'] }),
    ).toBe(true);
  });

  it('checks genres (any overlap)', () => {
    expect(matchesFilters({ genres: ['action'] }, { genres: ['comedy'] })).toBe(
      false,
    );
    expect(
      matchesFilters(
        { genres: ['Action', 'Drama'] },
        { genres: ['comedy', 'drama'] },
      ),
    ).toBe(true);
  });

  it('checks providerKeys (any overlap)', () => {
    expect(
      matchesFilters({ providerKeys: ['netflix'] }, { providerKeys: ['ivi'] }),
    ).toBe(false);
    expect(
      matchesFilters(
        { providerKeys: ['NETFLIX', 'okko'] },
        { providerKeys: ['netflix'] },
      ),
    ).toBe(true);
  });
});

describe('isInQuietHours (UTC, MVP)', () => {
  it('returns false when quiet hours is null', () => {
    expect(isInQuietHours(new Date('2026-01-01T12:00:00Z'), null)).toBe(false);
  });

  it('handles same-day window', () => {
    const q = { start: '09:00', end: '18:00', tz: 'UTC' };
    expect(isInQuietHours(new Date('2026-01-01T08:59:00Z'), q)).toBe(false);
    expect(isInQuietHours(new Date('2026-01-01T09:00:00Z'), q)).toBe(true);
    expect(isInQuietHours(new Date('2026-01-01T17:59:00Z'), q)).toBe(true);
    expect(isInQuietHours(new Date('2026-01-01T18:00:00Z'), q)).toBe(false);
  });

  it('handles overnight window', () => {
    const q = { start: '23:00', end: '09:00', tz: 'UTC' };
    expect(isInQuietHours(new Date('2026-01-01T22:59:00Z'), q)).toBe(false);
    expect(isInQuietHours(new Date('2026-01-01T23:00:00Z'), q)).toBe(true);
    expect(isInQuietHours(new Date('2026-01-02T08:59:00Z'), q)).toBe(true);
    expect(isInQuietHours(new Date('2026-01-02T09:00:00Z'), q)).toBe(false);
  });
});
