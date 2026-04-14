import { Module } from '@nestjs/common';

import { MoviesService } from '../movies/movies.service';

import { MeController } from './me.controller';
import { MeService } from './me.service';
import { UserPublicController } from './user-public.controller';

@Module({
  controllers: [MeController, UserPublicController],
  providers: [MeService, MoviesService],
})
export class MeModule {}
