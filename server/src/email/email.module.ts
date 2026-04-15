import { Module } from '@nestjs/common';

import { EmailController } from './email.controller';
import { EmailDevController } from './email-dev.controller';
import { EmailSmtpService } from './email-smtp.service';

@Module({
  controllers: [EmailController, EmailDevController],
  providers: [EmailSmtpService],
  exports: [EmailSmtpService],
})
export class EmailModule {}
