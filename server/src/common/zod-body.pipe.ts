import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { z, type ZodTypeAny } from 'zod';

@Injectable()
export class ZodBodyPipe implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny) {}

  transform(value: unknown) {
    // Allow this pipe to be reused for @Body and @Param.
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      // Keep error surface simple for MVP.
      throw new BadRequestException('Invalid payload');
    }
    return parsed.data;
  }
}

export function zodSchema<T extends ZodTypeAny>(schema: T): T {
  // Small helper to keep imports consistent.
  return schema;
}

