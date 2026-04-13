import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import {
  DiaryEntryUpsertSchema,
  DiaryIdParamSchema,
  DiaryExportQuerySchema,
  DiaryQuerySchema,
  DiaryStatsQuerySchema,
} from './diary.schemas';
import { DiaryService } from './diary.service';

@UseGuards(JwtAuthGuard)
@Controller('diary')
export class DiaryController {
  constructor(private readonly diary: DiaryService) {}

  @Get()
  async list(
    @CurrentUser() u: AuthedUser,
    @Query(new ZodBodyPipe(DiaryQuerySchema))
    q: z.infer<typeof DiaryQuerySchema>,
  ) {
    return { items: await this.diary.list(u.id, q) };
  }

  @Get('stats')
  async stats(
    @CurrentUser() u: AuthedUser,
    @Query(new ZodBodyPipe(DiaryStatsQuerySchema))
    q: z.infer<typeof DiaryStatsQuerySchema>,
  ) {
    return await this.diary.stats(u.id, q.year);
  }

  @Get('export')
  async export(
    @CurrentUser() u: AuthedUser,
    @Query(new ZodBodyPipe(DiaryExportQuerySchema))
    q: z.infer<typeof DiaryExportQuerySchema>,
  ) {
    return await this.diary.export(u.id, {
      format: q.format,
      year: q.year,
    });
  }

  @Post()
  async create(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(DiaryEntryUpsertSchema))
    body: z.infer<typeof DiaryEntryUpsertSchema>,
  ) {
    const out = await this.diary.create(u.id, {
      tmdbId: body.tmdbId ?? null,
      title: body.title,
      watchedAt: body.watchedAt,
      location: body.location,
      providerKey: body.providerKey ?? null,
      rating: body.rating ?? null,
      tags: body.tags ?? null,
      note: body.note ?? null,
    });
    return { ok: true, id: out.id };
  }

  @Put(':id')
  async update(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(DiaryIdParamSchema))
    p: z.infer<typeof DiaryIdParamSchema>,
    @Body(new ZodBodyPipe(DiaryEntryUpsertSchema))
    body: z.infer<typeof DiaryEntryUpsertSchema>,
  ) {
    await this.diary.update(u.id, p.id, {
      tmdbId: body.tmdbId ?? null,
      title: body.title,
      watchedAt: body.watchedAt,
      location: body.location,
      providerKey: body.providerKey ?? null,
      rating: body.rating ?? null,
      tags: body.tags ?? null,
      note: body.note ?? null,
    });
    return { ok: true };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(DiaryIdParamSchema))
    p: z.infer<typeof DiaryIdParamSchema>,
  ) {
    await this.diary.remove(u.id, p.id);
    return { ok: true };
  }
}
