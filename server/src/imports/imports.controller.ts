import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { CreateImportSchema, ImportIdParamSchema } from './imports.schemas';
import { ImportsService } from './imports.service';

@UseGuards(JwtAuthGuard)
@Controller('imports')
export class ImportsController {
  constructor(private readonly svc: ImportsService) {}

  @Post()
  async create(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(CreateImportSchema))
    body: z.infer<typeof CreateImportSchema>,
  ) {
    const out = await this.svc.create(u.id, {
      kind: body.kind,
      format: body.format,
      payload: body.payload ?? null,
    });
    return { ok: true, id: out.id, createdAt: out.createdAt };
  }

  @Get(':id')
  async get(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(ImportIdParamSchema))
    p: z.infer<typeof ImportIdParamSchema>,
  ) {
    return await this.svc.get(u.id, p.id);
  }
}
