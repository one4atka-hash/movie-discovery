export interface Movie {
  readonly id: number;
  readonly title: string;
  readonly overview: string;
  readonly poster_path: string | null;
  readonly backdrop_path: string | null;
  readonly release_date: string;
  readonly vote_average: number;
  readonly genre_ids?: number[];
}

export interface MovieSearchResponse {
  readonly page: number;
  readonly results: Movie[];
  readonly total_pages: number;
  readonly total_results: number;
}

