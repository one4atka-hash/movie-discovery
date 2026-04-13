import { Controller, Get, Param } from '@nestjs/common';
import { z } from 'zod';

import { ZodBodyPipe } from '../common/zod-body.pipe';
import { MeService } from './me.service';
import { PublicSlugParamSchema } from './public-profile.schemas';

@Controller('u')
export class UserPublicController {
  constructor(private readonly me: MeService) {}

  @Get(':slug')
  async getBySlug(
    @Param(new ZodBodyPipe(PublicSlugParamSchema))
    p: z.infer<typeof PublicSlugParamSchema>,
  ) {
    return await this.me.getPublicViewBySlug(p.slug);
  }
}
