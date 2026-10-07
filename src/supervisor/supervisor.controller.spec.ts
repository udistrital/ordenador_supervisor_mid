import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { SupervisorController } from './supervisor.controller';
import { SupervisorService } from './supervisor.service';
import { SupervisorDependenciaDto, SupervisorDocumentoDto } from './dto/supervisor-dto';

describe('SupervisorController', () => {
  let controller: SupervisorController;
  let service: SupervisorService;

  const mockSupervisorService = {
    getSupervisorPorDependencia: jest.fn(),
    getSupervisorPorDocumento: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupervisorController],
      providers: [
        {
          provide: SupervisorService,
          useValue: mockSupervisorService,
        },
      ],
    }).compile();

    controller = module.get<SupervisorController>(SupervisorController);
    service = module.get<SupervisorService>(SupervisorService);

    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('getSupervisorDependencia', () => {
    it('debería retornar la lista de supervisores por dependencia', async () => {
      const queryParams: SupervisorDependenciaDto = {
        dependencia: '12',
      } as any;

      const mockResponse = {
        Status: HttpStatus.OK,
        Message: 'Supervisores encontrados exitosamente',
        Success: true,
        Data: [],
      };

      mockSupervisorService.getSupervisorPorDependencia.mockResolvedValue(mockResponse);

      const result = await controller.getSupervisorDependencia(queryParams);

      expect(service.getSupervisorPorDependencia).toHaveBeenCalledWith(queryParams);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getSupervisorPorDocumento', () => {
    it('debería retornar los contratos/franjas del supervisor por documento', async () => {
      const params: SupervisorDocumentoDto = {
        documento: '123456789',
      } as any;

      const mockResponse = {
        Status: HttpStatus.OK,
        Message: 'Franjas del supervisor encontrados exitosamente',
        Success: true,
        Data: [],
      };

      mockSupervisorService.getSupervisorPorDocumento.mockResolvedValue(mockResponse);

      const result = await controller.getSupervisorPorDocumento(params);

      expect(service.getSupervisorPorDocumento).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockResponse);
    });
  });
});