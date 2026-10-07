import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { RolOrdenadorController } from './rol_ordenador.controller';
import { RolOrdenadorService } from './rol_ordenador.service';

describe('RolOrdenadorController', () => {
  let controller: RolOrdenadorController;
  let service: RolOrdenadorService;

  const mockRolOrdenadorService = {
    getRolOrdenadores: jest.fn(),
    getOrdenadorActual: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolOrdenadorController],
      providers: [
        {
          provide: RolOrdenadorService,
          useValue: mockRolOrdenadorService,
        },
      ],
    }).compile();

    controller = module.get<RolOrdenadorController>(RolOrdenadorController);
    service = module.get<RolOrdenadorService>(RolOrdenadorService);

    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('getOrdenadores', () => {
    it('debería devolver la lista de roles de ordenadores en caso de éxito', async () => {
      const mockResponse = {
        Status: HttpStatus.OK,
        Json: [{ id: 1, nombre: 'Ordenador 1' }],
        Message: 'Consulta exitosa',
        Success: true,
      };

      mockRolOrdenadorService.getRolOrdenadores.mockResolvedValue(mockResponse);

      const result = await controller.getOrdenadores();

      expect(service.getRolOrdenadores).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('debería lanzar una HttpException cuando la respuesta del servicio no es exitosa', async () => {
      const mockErrorResponse = {
        Status: HttpStatus.BAD_REQUEST,
        Json: null,
        Message: 'Error al consultar roles',
        Success: false,
      };

      mockRolOrdenadorService.getRolOrdenadores.mockResolvedValue(mockErrorResponse);

      await expect(controller.getOrdenadores()).rejects.toThrow(HttpException);
      expect(service.getRolOrdenadores).toHaveBeenCalled();
    });
  });

  describe('getOrdenadorActual', () => {
    it('debería devolver el ordenador actual por rol cuando la respuesta es exitosa', async () => {
      const rolId = 1;
      const mockResponse = {
        Status: HttpStatus.OK,
        Json: { id: 1, rol: 1, nombre: 'Ordenador Actual' },
        Message: 'Ordenador encontrado',
        Success: true,
      };

      mockRolOrdenadorService.getOrdenadorActual.mockResolvedValue(mockResponse);

      const result = await controller.getOrdenadorActual(rolId);

      expect(service.getOrdenadorActual).toHaveBeenCalledWith(rolId);
      expect(result).toEqual(mockResponse);
    });

    it('debería lanzar una HttpException cuando la respuesta del servicio no es exitosa', async () => {
      const rolId = 999;
      const mockErrorResponse = {
        Status: HttpStatus.NOT_FOUND,
        Json: null,
        Message: 'Ordenador no encontrado',
        Success: false,
      };

      mockRolOrdenadorService.getOrdenadorActual.mockResolvedValue(mockErrorResponse);

      await expect(controller.getOrdenadorActual(rolId)).rejects.toThrow(HttpException);
      expect(service.getOrdenadorActual).toHaveBeenCalledWith(rolId);
    });
  });
});