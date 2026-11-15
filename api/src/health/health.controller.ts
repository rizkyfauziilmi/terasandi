import { Public } from '@nestjs/authentication';
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  check(): { status: 'ok' } {
    return this.healthService.check();
  }
}
