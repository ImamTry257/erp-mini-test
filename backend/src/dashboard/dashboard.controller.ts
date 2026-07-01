import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { IsOptional, IsDateString } from 'class-validator';

class DashboardQueryDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  async getSummary(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getSummary(
      query.startDate,
      query.endDate,
    );
  }
}
