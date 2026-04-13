import type { Movie } from '@features/movies/data-access/models/movie.model';
import { canFollowRelease, isReleased } from './release-follow.util';

describe('release-follow.util', () => {
  it('isReleased compares YYYY-MM-DD to today', () => {
    expect(isReleased('1900-01-01')).toBe(true);
    expect(isReleased('2999-12-31')).toBe(false);
  });

  it('canFollowRelease uses future date', () => {
    const m = {
      id: 1,
      title: 'T',
      overview: '',
      poster_path: null,
      backdrop_path: null,
      release_date: '2999-01-01',
      vote_average: 0,
    } satisfies Movie;
    expect(canFollowRelease(m)).toBe(true);
  });

  it('canFollowRelease uses status when date missing', () => {
    const m = {
      id: 1,
      title: 'T',
      overview: '',
      poster_path: null,
      backdrop_path: null,
      release_date: '',
      vote_average: 0,
      status: 'Post Production',
    } satisfies Movie;
    expect(canFollowRelease(m)).toBe(true);
  });
});
