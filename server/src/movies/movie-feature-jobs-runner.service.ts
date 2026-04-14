import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { truthy } from '../config/env.schema';

import { MovieFeatureJobsService } from './movie-feature-jobs.service';

@Injectable()
export class MovieFeatureJobsRunnerService {
  constructor(
    private readonly config: ConfigService,
    private readonly jobs: MovieFeatureJobsService,
  ) {}

  async runEmbeddingsJob(
    userId: string,
    jobId: string,
  ): Promise<{ ok: true; status: 'failed' | 'running' | 'completed' }> {
    const started = await this.jobs.markRunning(userId, jobId);
    if (!started.ok) {
      const job = await this.jobs.getJob(userId, jobId);
      return { ok: true, status: job?.status ?? 'failed' };
    }

    if (!truthy(this.config.get<string>('EMBEDDINGS_ENABLED'))) {
      await this.jobs.markFailed(
        userId,
        jobId,
        'Embeddings pipeline is disabled',
      );
      return { ok: true, status: 'failed' };
    }

    // Scaffold only. Real embedding generation (providers + vector writes) will be added later.
    await this.jobs.markFailed(
      userId,
      jobId,
      'Embeddings pipeline is not implemented',
    );
    return { ok: true, status: 'failed' };
  }
}
