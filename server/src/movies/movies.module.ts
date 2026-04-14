import { Module } from '@nestjs/common';

import { MoviesController } from './movies.controller';
import { MovieFeatureJobsService } from './movie-feature-jobs.service';
import { MoviesService } from './movies.service';

@Module({
  controllers: [MoviesController],
  providers: [MoviesService, MovieFeatureJobsService],
})
export class MoviesModule {}
