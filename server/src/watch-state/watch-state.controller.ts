import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { WatchStateService } from './watch-state.service';
import {
  BulkWatchStateSchema,
  PutWatchStateSchema,
  TmdbIdParamSchema,
} from './watch-state.schemas';

@UseGuards(JwtAuthGuard)
@Controller('watch-state')
export class WatchStateController {
  constructor(private readonly svc: WatchStateService) {}

  @Get()
  async list(@CurrentUser() u: AuthedUser) {
    return { items: await this.svc.list(u.id) };
  }

  @Post('bulk')
  @HttpCode(201)
  async bulk(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(BulkWatchStateSchema))
    body: z.infer<typeof BulkWatchStateSchema>,
  ) {
    const out = await this.svc.bulkPut(u.id, body.items);
    return { ok: true, ...out };
  }

  @Put(':tmdbId')
  async put(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(TmdbIdParamSchema))
    p: z.infer<typeof TmdbIdParamSchema>,
    @Body(new ZodBodyPipe(PutWatchStateSchema))
    body: z.infer<typeof PutWatchStateSchema>,
  ) {
    const out = await this.svc.put(u.id, p.tmdbId, {
      status: body.status,
      progress: body.progress ?? null,
      ifUnmodifiedSince: body.ifUnmodifiedSince ?? null,
    });
    return { ok: true, updatedAt: out.updatedAt };
  }

  @Delete(':tmdbId')
  async remove(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(TmdbIdParamSchema))
    p: z.infer<typeof TmdbIdParamSchema>,
  ) {
    await this.svc.remove(u.id, p.tmdbId);
    return { ok: true };
  }
}
