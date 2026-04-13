import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthedUser } from '../auth/current-user.decorator';
import { ZodBodyPipe } from '../common/zod-body.pipe';
import { MeService } from './me.service';
import { PublicProfilePutSchema } from './public-profile.schemas';
import { StreamingPrefsSchema } from './streaming-prefs.schemas';

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get('public-profile')
  async getPublicProfile(@CurrentUser() u: AuthedUser) {
    return await this.me.getPublicProfile(u.id);
  }

  @Put('public-profile')
  async putPublicProfile(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(PublicProfilePutSchema))
    body: z.infer<typeof PublicProfilePutSchema>,
  ) {
    await this.me.putPublicProfile(u.id, body);
    return { ok: true };
  }

  @Get('streaming-prefs')
  async getStreamingPrefs(@CurrentUser() u: AuthedUser) {
    return await this.me.getStreamingPrefs(u.id);
  }

  @Put('streaming-prefs')
  async putStreamingPrefs(
    @CurrentUser() u: AuthedUser,
    @Body(new ZodBodyPipe(StreamingPrefsSchema))
    body: z.infer<typeof StreamingPrefsSchema>,
  ) {
    await this.me.putStreamingPrefs(u.id, body);
    return { ok: true };
  }
}
