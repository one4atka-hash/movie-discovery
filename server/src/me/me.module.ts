import { Module } from '@nestjs/common';

import { MeController } from './me.controller';
import { MeService } from './me.service';
import { UserPublicController } from './user-public.controller';

@Module({
  controllers: [MeController, UserPublicController],
  providers: [MeService],
})
export class MeModule {}
