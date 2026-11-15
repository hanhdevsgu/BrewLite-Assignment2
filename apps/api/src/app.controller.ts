import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(['', 'api'])
  @ApiOperation({ summary: 'Thông tin gốc của BrewLite Backend API' })
  @ApiResponse({ status: 200, description: 'API đang hoạt động bình thường' })
  async getRoot() {
    const status = await this.buildServiceStatus();
    return {
      ...status,
      message: 'BrewLite REST API is running',
      endpoints: {
        health: '/api/health',
        docs: '/api/docs',
        products: '/api/products',
      },
    };
  }

  @Get(['health', 'api/health'])
  @ApiOperation({ summary: 'Kiểm tra trạng thái hoạt động của hệ thống (Health Check)' })
  @ApiResponse({ status: 200, description: 'Hệ thống hoạt động bình thường' })
  async getHealth() {
    return this.buildServiceStatus();
  }

  private async checkDatabaseStatus(): Promise<'connected' | 'error'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'connected';
    } catch {
      return 'error';
    }
  }

  private async buildServiceStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      database: await this.checkDatabaseStatus(),
      service: 'BrewLite Backend API',
      version: '1.0.0',
    };
  }
}

