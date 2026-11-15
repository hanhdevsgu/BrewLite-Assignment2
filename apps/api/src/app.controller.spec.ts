import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let controller: AppController;
  let mockPrisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue([1]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  describe('getRoot', () => {
    it('returns service metadata with connected database status', async () => {
      const result = await controller.getRoot();

      expect(result).toMatchObject({
        status: 'ok',
        database: 'connected',
        service: 'BrewLite Backend API',
        version: '1.0.0',
        message: 'BrewLite REST API is running',
        endpoints: {
          health: '/api/health',
          docs: '/api/docs',
          products: '/api/products',
        },
      });
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptime).toBe('number');
    });

    it('reports database as error when health query fails without throwing', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await controller.getRoot();

      expect(result.status).toBe('ok');
      expect(result.database).toBe('error');
    });
  });

  describe('getHealth', () => {
    it('returns health payload with connected database status', async () => {
      const result = await controller.getHealth();

      expect(result).toMatchObject({
        status: 'ok',
        database: 'connected',
        service: 'BrewLite Backend API',
        version: '1.0.0',
      });
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptime).toBe('number');
    });

    it('reports database as error when health query rejects', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('DB down'));

      const result = await controller.getHealth();

      expect(result.status).toBe('ok');
      expect(result.database).toBe('error');
    });
  });
});
