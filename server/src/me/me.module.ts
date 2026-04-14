import { Module } from '@nestjs/common';

import { MoviesService } from '../movies/movies.service';
import { DbModule } from '../db/db.module';

import { MeController } from './me.controller';
import { MeService } from './me.service';
import { UserPublicController } from './user-public.controller';

@Module({
  imports: [DbModule],
  controllers: [MeController, UserPublicController],
  providers: [MeService, MoviesService],
})
export class MeModule {}
