import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import {
  CreateImportSchema,
  ImportIdParamSchema,
  ImportRowParamSchema,
  ImportConflictsQuerySchema,
  ImportRowsQuerySchema,
  ResolveImportRowSchema,
} from './imports.schemas';
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

  @Post(':id/apply')
  async apply(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(ImportIdParamSchema))
    p: z.infer<typeof ImportIdParamSchema>,
  ) {
    return await this.svc.apply(u.id, p.id);
  }

  @Post(':id/preview')
  async preview(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(ImportIdParamSchema))
    p: z.infer<typeof ImportIdParamSchema>,
  ) {
    return await this.svc.preview(u.id, p.id);
  }

  @Get(':id/rows')
  async rows(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(ImportIdParamSchema))
    p: z.infer<typeof ImportIdParamSchema>,
    @Query(new ZodBodyPipe(ImportRowsQuerySchema))
    q: z.infer<typeof ImportRowsQuerySchema>,
  ) {
    return await this.svc.rows(u.id, p.id, {
      offset: q.offset ?? 0,
      limit: q.limit ?? 50,
    });
  }

  @Get(':id/conflicts')
  async conflicts(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(ImportIdParamSchema))
    p: z.infer<typeof ImportIdParamSchema>,
    @Query(new ZodBodyPipe(ImportConflictsQuerySchema))
    q: z.infer<typeof ImportConflictsQuerySchema>,
  ) {
    return await this.svc.conflicts(u.id, p.id, {
      offset: q.offset ?? 0,
      limit: q.limit ?? 50,
    });
  }

  @Post(':id/rows/:rowN/resolve')
  async resolveRow(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(ImportRowParamSchema))
    p: z.infer<typeof ImportRowParamSchema>,
    @Body(new ZodBodyPipe(ResolveImportRowSchema))
    body: z.infer<typeof ResolveImportRowSchema>,
  ) {
    return await this.svc.resolveRow(u.id, p.id, p.rowN, {
      status: body.status,
      mapped: body.mapped ?? undefined,
      error: body.error ?? undefined,
    });
  }
}
