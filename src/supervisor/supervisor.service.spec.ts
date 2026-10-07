import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpStatus, Logger, HttpException } from '@nestjs/common';
import { SupervisorService } from './supervisor.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../constants/dependencias.dictionary', () => ({
  DEPENDENCIAS_MAPPING: {
    '1': '10',
  },
}));

describe('SupervisorService', () => {
  let service: SupervisorService;
  let loggerErrorSpy: jest.SpyInstance;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'ENDP_SUPERVISOR_DEPENDENCIA') return 'http://api.supervisor.com/dependencia';
      if (key === 'ENDP_SUPERVISOR_POR_DOCUMENTO') return 'http://api.supervisor.com/documento';
      if (key === 'ENDP_TERCEROS_CRUD') return 'http://api.terceros.com/';
      return null;
    }),
  };

  beforeEach(async () => {
    // Intercepta las llamadas al logger dentro de las pruebas para verificar su ejecución
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupervisorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SupervisorService>(SupervisorService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Constructor', () => {
    it('debería lanzar error si falta ENDP_SUPERVISOR_DEPENDENCIA', () => {
      const invalidConfig = {
        get: jest.fn((key: string) => {
          if (key === 'ENDP_SUPERVISOR_POR_DOCUMENTO') return 'http://api.supervisor.com/documento';
          return null;
        }),
      };

      expect(() => new SupervisorService(invalidConfig as any)).toThrow(
        'No se ha detectado ENDP_SUPERVISOR_DEPENDENCIA',
      );
    });

    it('debería lanzar error si falta ENDP_SUPERVISOR_POR_DOCUMENTO', () => {
      const invalidConfig = {
        get: jest.fn((key: string) => {
          if (key === 'ENDP_SUPERVISOR_DEPENDENCIA') return 'http://api.supervisor.com/dependencia';
          return null;
        }),
      };

      expect(() => new SupervisorService(invalidConfig as any)).toThrow(
        'No se ha detectado ENDP_SUPERVISOR_POR_DOCUMENTO',
      );
    });
  });

  describe('getSupervisorPorDependencia', () => {
    it('debería obtener supervisores por dependencia exitosamente con tercero_id', async () => {
      const queryParams = { dependenciaId: '1', fecha: '2026-01-01' } as any;

      const mockDependenciaResponse = {
        supervisor: {
          dependencia: [{ documento: '12345', nombre: 'Juan' }],
        },
      };

      const mockTerceroResponse = [{ Tercero: { Id: 88 } }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockDependenciaResponse })
        .mockResolvedValueOnce({ data: mockTerceroResponse });

      const result = await service.getSupervisorPorDependencia(queryParams);

      expect(result.Success).toBe(true);
      expect(result.Status).toBe(HttpStatus.OK);
      expect((result.Data[0] as any).tercero_id).toBe(88);
    });

    it('debería retornar NOT_FOUND si la dependencia no existe en el diccionario', async () => {
      const queryParams = { dependenciaId: 'invalid_id', fecha: '2026-01-01' } as any;

      const result = await service.getSupervisorPorDependencia(queryParams);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.NOT_FOUND);
      // Validamos que el servicio haya registrado el error en el Logger
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('debería retornar NOT_FOUND si no hay supervisores para la dependencia', async () => {
      const queryParams = { dependenciaId: '1', fecha: '2026-01-01' } as any;

      mockedAxios.get.mockResolvedValueOnce({ data: { supervisor: {} } });

      const result = await service.getSupervisorPorDependencia(queryParams);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.NOT_FOUND);
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('debería asignar tercero_id como null si la consulta del tercero falla', async () => {
      const queryParams = { dependenciaId: '1', fecha: '2026-01-01' } as any;

      const mockDependenciaResponse = {
        supervisor: {
          dependencia: [{ documento: '12345' }],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockDependenciaResponse })
        .mockRejectedValueOnce(new Error('Tercero error'));

      const result = await service.getSupervisorPorDependencia(queryParams);

      expect(result.Success).toBe(true);
      expect((result.Data[0] as any).tercero_id).toBeNull();
    });
    it('debería asignar tercero_id como undefined si la respuesta de la API de terceros es un arreglo vacío', async () => {
      const queryParams = { dependenciaId: '1', fecha: '2026-01-01' } as any;

      const mockDependenciaResponse = {
        supervisor: {
          dependencia: [{ documento: '12345', nombre: 'Juan' }],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockDependenciaResponse })
        .mockResolvedValueOnce({ data: [] });

      const result = await service.getSupervisorPorDependencia(queryParams);

      expect(result.Success).toBe(true);
      expect((result.Data[0] as any).tercero_id).toBeUndefined();
    });
    it('debería procesar la respuesta si la API de terceros retorna un objeto sin propiedad Tercero.Id', async () => {
      const queryParams = { dependenciaId: '1', fecha: '2026-01-01' } as any;

      const mockDependenciaResponse = {
        supervisor: {
          dependencia: [{ documento: '12345', nombre: 'Juan' }],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockDependenciaResponse })
        .mockResolvedValueOnce({ data: [{ ObjetoSinId: true }] });

      const result = await service.getSupervisorPorDependencia(queryParams);

      expect(result.Success).toBe(true);
      expect((result.Data[0] as any).tercero_id).toBeUndefined();
    });
    it('debería ejecutar el catch interno si obtenerTercero lanza una excepción', async () => {
      const queryParams = { dependenciaId: '1', fecha: '2026-01-01' } as any;

      const mockDependenciaResponse = {
        supervisor: {
          dependencia: [{ documento: '12345', nombre: 'Juan' }],
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockDependenciaResponse });
      jest.spyOn(service, 'obtenerTercero').mockRejectedValueOnce(new Error('Error inesperado en tercero'));

      const result = await service.getSupervisorPorDependencia(queryParams);

      expect(result.Success).toBe(true);
      expect((result.Data[0] as any).tercero_id).toBeNull();
    });
  });

  describe('getSupervisorPorDocumento', () => {
    it('debería retornar contratos ordenados por fecha de inicio con tercero_id', async () => {
      const params = { documento: '12345' } as any;

      const mockDocumentoResponse = {
        supervisor: {
          contrato: [
            { id: 1, fecha_inicio: '2025-01-01' },
            { id: 2, fecha_inicio: '2026-01-01' },
          ],
        },
      };

      const mockTerceroResponse = [{ Tercero: { Id: 99 } }];

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockDocumentoResponse })
        .mockResolvedValueOnce({ data: mockTerceroResponse });

      const result = await service.getSupervisorPorDocumento(params);

      expect(result.Success).toBe(true);
      expect(result.Status).toBe(HttpStatus.OK);
      expect((result.Data[0] as any).id).toBe(2);
      expect((result.Data[0] as any).tercero_id).toBe(99);
    });

    it('debería retornar NOT_FOUND si no hay contratos para el documento', async () => {
      const params = { documento: '12345' } as any;

      mockedAxios.get.mockResolvedValueOnce({ data: { supervisor: { contrato: [] } } });

      const result = await service.getSupervisorPorDocumento(params);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.NOT_FOUND);
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('debería manejar errores de Axios de forma adecuada', async () => {
      const params = { documento: '12345' } as any;

      const axiosError = {
        isAxiosError: true,
        response: { status: HttpStatus.BAD_REQUEST, data: { message: 'Documento invalido' } },
      };

      mockedAxios.isAxiosError.mockReturnValueOnce(true);
      mockedAxios.get.mockRejectedValueOnce(axiosError);

      const result = await service.getSupervisorPorDocumento(params);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.BAD_REQUEST);
      expect(result.Message).toBe('Documento invalido');
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('debería asignar tercero_id como null en getSupervisorPorDocumento cuando falla la consulta del tercero', async () => {
      const params = { documento: '12345' } as any;

      const mockDocumentoResponse = {
        supervisor: {
          contrato: [{ id: 1, fecha_inicio: '2026-01-01' }],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockDocumentoResponse })
        .mockRejectedValueOnce(new Error('Error de conexión con Terceros'));

      const result = await service.getSupervisorPorDocumento(params);

      expect(result.Success).toBe(true);
      expect((result.Data[0] as any).tercero_id).toBeNull();
    });

    it('debería asignar tercero_id como null si la API de terceros retorna arreglo vacío en getSupervisorPorDocumento', async () => {
      const params = { documento: '12345' } as any;

      const mockDocumentoResponse = {
        supervisor: {
          contrato: [{ id: 1, fecha_inicio: '2026-01-01' }],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: mockDocumentoResponse })
        .mockResolvedValueOnce({ data: [] });

      const result = await service.getSupervisorPorDocumento(params);

      expect(result.Success).toBe(true);
      expect((result.Data[0] as any).tercero_id).toBeUndefined();
    });

    it('debería retornar INTERNAL_SERVER_ERROR ante un error genérico que no es Axios ni HttpException', async () => {
      const params = { documento: '12345' } as any;

      mockedAxios.isAxiosError.mockReturnValueOnce(false);
      mockedAxios.get.mockRejectedValueOnce(new Error('Error interno no controlado'));

      const result = await service.getSupervisorPorDocumento(params);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(result.Message).toBe('Error interno no controlado');
    });

    it('debería manejar HttpException con objeto sin propiedad Message', async () => {
      const params = { documento: '12345' } as any;
      mockedAxios.get.mockRejectedValueOnce(
        new HttpException({}, HttpStatus.BAD_REQUEST),
      );

      const result = await service.getSupervisorPorDocumento(params);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('debería manejar AxiosError sin objeto response ni propiedad code', async () => {
      const params = { documento: '12345' } as any;
      const axiosError = { isAxiosError: true };

      mockedAxios.isAxiosError.mockReturnValueOnce(true);
      mockedAxios.get.mockRejectedValueOnce(axiosError);

      const result = await service.getSupervisorPorDocumento(params);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(result.Message).toContain('Unknown error');
    });

    it('debería retornar el mensaje genérico cuando la excepción no es una instancia de Error', async () => {
      const params = { documento: '12345' } as any;

      mockedAxios.isAxiosError.mockReturnValueOnce(false);
      mockedAxios.get.mockRejectedValueOnce('Error de cadena directo');

      const result = await service.getSupervisorPorDocumento(params);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(result.Message).toBe('Error interno del servidor');
    });
  });

  describe('obtenerTercero', () => {
    it('debería retornar null si ENDP_TERCEROS_CRUD no está configurado', async () => {
      const serviceWithoutTerceros = new SupervisorService({
        get: jest.fn((key: string) => {
          if (key === 'ENDP_SUPERVISOR_DEPENDENCIA') return 'http://api.supervisor.com/dependencia';
          if (key === 'ENDP_SUPERVISOR_POR_DOCUMENTO') return 'http://api.supervisor.com/documento';
          return null;
        }),
      } as any);

      const result = await serviceWithoutTerceros.obtenerTercero(123);

      expect(result).toBeNull();
    });
  });
  
});