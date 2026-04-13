import { Module } from '@nestjs/common';

import { AutoCollectionsController, TasteController } from './taste.controller';
import { TasteService } from './taste.service';

@Module({
  controllers: [AutoCollectionsController, TasteController],
  providers: [TasteService],
})
export class TasteModule {}
