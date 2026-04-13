import { Module } from '@nestjs/common';

import { EmailDevController } from './email-dev.controller';
import { EmailSmtpService } from './email-smtp.service';

@Module({
  controllers: [EmailDevController],
  providers: [EmailSmtpService],
  exports: [EmailSmtpService],
})
export class EmailModule {}
