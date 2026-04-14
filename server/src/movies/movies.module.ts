import { Module } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { MoviesController } from './movies.controller';
import { MovieFeatureJobsService } from './movie-feature-jobs.service';
import { MovieFeatureJobsRunnerService } from './movie-feature-jobs-runner.service';
import { MoviesService } from './movies.service';
import { EmbeddingsService } from './embeddings.service';

@Module({
  imports: [DbModule],
  controllers: [MoviesController],
  providers: [
    MoviesService,
    MovieFeatureJobsService,
    EmbeddingsService,
    MovieFeatureJobsRunnerService,
  ],
})
export class MoviesModule {}
