import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('healthCheck', () => {
    it('debería retornar status ok y el contador incrementado', () => {
      const result = service.healthCheck();

      expect(result).toEqual({ Status: 'ok', checkCount: 0 });
      expect(service.counter).toBe(1);
    });

    it('debería retornar status error si ocurre una excepción dentro de healthCheck', () => {
      Object.defineProperty(service, 'counter', {
        get() {
          throw new Error('Error simulado');
        },
      });

      const result = service.healthCheck();

      expect(result).toEqual({
        Status: 'error',
        error: 'Error simulado',
      });
    });
  });
});