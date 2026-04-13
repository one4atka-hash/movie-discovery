import { Module } from '@nestjs/common';

import { WatchStateController } from './watch-state.controller';
import { WatchStateService } from './watch-state.service';

@Module({
  controllers: [WatchStateController],
  providers: [WatchStateService],
})
export class WatchStateModule {}
