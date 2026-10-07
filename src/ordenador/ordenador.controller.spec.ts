import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { OrdenadorController } from './ordenador.controller';
import { OrdenadorService } from './ordenador.service';

describe('OrdenadorController', () => {
  let controller: OrdenadorController;
  let service: OrdenadorService;

  const mockOrdenadorService = {
    getOrdenador: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdenadorController],
      providers: [
        {
          provide: OrdenadorService,
          useValue: mockOrdenadorService,
        },
      ],
    }).compile();

    controller = module.get<OrdenadorController>(OrdenadorController);
    service = module.get<OrdenadorService>(OrdenadorService);

    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('getOrdenador', () => {
    it('debería retornar la información del ordenador por su ID', async () => {
      const id = 123;
      const mockResponse = {
        Status: HttpStatus.OK,
        Message: 'Ordenador encontrado exitosamente',
        Success: true,
        Data: { id: 123, nombre: 'Ordenador Argo' },
      };

      mockOrdenadorService.getOrdenador.mockResolvedValue(mockResponse);

      const result = await controller.getOrdenador(id);

      expect(service.getOrdenador).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockResponse);
    });
  });
});