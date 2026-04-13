import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { ExportQuerySchema } from './exports.schemas';
import { ExportsService } from './exports.service';

@UseGuards(JwtAuthGuard)
@Controller('exports')
export class ExportsController {
  constructor(private readonly svc: ExportsService) {}

  @Get()
  async export(
    @CurrentUser() u: AuthedUser,
    @Query(new ZodBodyPipe(ExportQuerySchema))
    q: z.infer<typeof ExportQuerySchema>,
  ) {
    return await this.svc.export(u.id, q);
  }
}
