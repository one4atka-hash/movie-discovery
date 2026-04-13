import { Module } from '@nestjs/common';

import { DecisionController } from './decision.controller';
import { PublicDecisionController } from './public-decision.controller';
import { DecisionService } from './decision.service';

@Module({
  controllers: [DecisionController, PublicDecisionController],
  providers: [DecisionService],
})
export class DecisionModule {}
