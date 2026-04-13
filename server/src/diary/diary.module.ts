import { Module } from '@nestjs/common';

import { ImportsModule } from '../imports/imports.module';
import { DiaryController } from './diary.controller';
import { DiaryService } from './diary.service';

@Module({
  imports: [ImportsModule],
  controllers: [DiaryController],
  providers: [DiaryService],
})
export class DiaryModule {}
