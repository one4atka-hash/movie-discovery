import { Module } from '@nestjs/common';

import { MovieFeatureJobsService } from '../movies/movie-feature-jobs.service';
import { MoviesService } from '../movies/movies.service';
import { DbModule } from '../db/db.module';

import { MeController } from './me.controller';
import { MeService } from './me.service';
import { UserPublicController } from './user-public.controller';

@Module({
  imports: [DbModule],
  controllers: [MeController, UserPublicController],
  providers: [MeService, MoviesService, MovieFeatureJobsService],
})
export class MeModule {}
