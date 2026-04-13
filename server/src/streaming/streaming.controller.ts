import { Controller, Get, Query } from '@nestjs/common';

import { ZodBodyPipe } from '../common/zod-body.pipe';
import {
  StreamingProvidersQuerySchema,
  type StreamingProvidersQuery,
} from './streaming.schemas';
import { StreamingService } from './streaming.service';

@Controller('streaming')
export class StreamingController {
  constructor(private readonly streaming: StreamingService) {}

  @Get('providers')
  async providers(
    @Query(new ZodBodyPipe(StreamingProvidersQuerySchema))
    q: StreamingProvidersQuery,
  ) {
    const region = q.region || 'US';
    const items = await this.streaming.listProviders(region);
    return { region, items };
  }
}
