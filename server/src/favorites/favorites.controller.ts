import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { FavoritesService } from './favorites.service';
import { ZodBodyPipe } from '../common/zod-body.pipe';

const AddSchema = z.object({ tmdbId: z.number().int().positive() });
const TmdbIdParamSchema = z.object({ tmdbId: z.coerce.number().int().positive() });

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  async list(@CurrentUser() u: AuthedUser) {
    return await this.favorites.list(u.id);
  }

  @Post()
  async add(@CurrentUser() u: AuthedUser, @Body(new ZodBodyPipe(AddSchema)) body: { tmdbId: number }) {
    await this.favorites.add(u.id, body.tmdbId);
    return { ok: true };
  }

  @Delete(':tmdbId')
  async remove(@CurrentUser() u: AuthedUser, @Param(new ZodBodyPipe(TmdbIdParamSchema)) p: { tmdbId: number }) {
    await this.favorites.remove(u.id, p.tmdbId);
    return { ok: true };
  }
}

