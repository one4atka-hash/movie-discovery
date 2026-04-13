import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { CollectionsService } from './collections.service';
import {
  CollectionIdParamSchema,
  CollectionUpsertSchema,
  ItemCreateSchema,
  ItemIdParamSchema,
} from './collections.schemas';

@UseGuards(JwtAuthGuard)
@Controller('collections')
export class CollectionsController {
  constructor(private readonly svc: CollectionsService) {}

  @Get()
  async list(@CurrentUser() u: AuthedUser) {
    return { items: await this.svc.list(u.id) };
  }

  @Post()
  async upsert(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(CollectionUpsertSchema))
    body: z.infer<typeof CollectionUpsertSchema>,
  ) {
    const out = await this.svc.upsert(u.id, {
      id: body.id,
      name: body.name,
      description: body.description ?? null,
      visibility: body.visibility ?? 'private',
    });
    return { ok: true, id: out.id };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(CollectionIdParamSchema))
    p: z.infer<typeof CollectionIdParamSchema>,
  ) {
    await this.svc.remove(u.id, p.id);
    return { ok: true };
  }

  @Post(':id/items')
  async addItem(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(CollectionIdParamSchema))
    p: z.infer<typeof CollectionIdParamSchema>,
    @Body(new ZodBodyPipe(ItemCreateSchema))
    body: z.infer<typeof ItemCreateSchema>,
  ) {
    const out = await this.svc.addItem(u.id, p.id, {
      tmdbId: body.tmdbId ?? null,
      title: body.title,
      note: body.note ?? null,
    });
    return { ok: true, id: out.id };
  }

  @Delete(':id/items/:itemId')
  async removeItem(
    @CurrentUser() u: AuthedUser,
    @Param(new ZodBodyPipe(CollectionIdParamSchema.merge(ItemIdParamSchema)))
    p: { id: string; itemId: string },
  ) {
    await this.svc.removeItem(u.id, p.id, p.itemId);
    return { ok: true };
  }
}
