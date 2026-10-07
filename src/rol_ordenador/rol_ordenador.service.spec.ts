import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpStatus, Logger } from '@nestjs/common';
import { RolOrdenadorService } from './rol_ordenador.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RolOrdenadorService', () => {
  let service: RolOrdenadorService;
  let loggerErrorSpy: jest.SpyInstance;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'ENDP_ROL_ORDENADOR') return 'http://api.ordenador.com';
      if (key === 'ENDP_TERCEROS_CRUD') return 'http://api.terceros.com/';
      return null;
    }),
  };

  beforeEach(async () => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolOrdenadorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RolOrdenadorService>(RolOrdenadorService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getRolOrdenadores', () => {
    it('debería retornar roles exitosamente cuando la respuesta es JSON válido', async () => {
      const mockData = {
        rol: {
          ordenador: [{ id: 1, nombre: 'Ordenador 1' }],
        },
      };

      mockedAxios.get.mockImplementationOnce((url, config) => {
        if (config?.transformResponse?.[0]) {
          config.transformResponse[0](JSON.stringify(mockData));
        }
        return Promise.resolve({ data: JSON.stringify(mockData) });
      });

      const result = await service.getRolOrdenadores();

      expect(result.Success).toBe(true);
      expect(result.Status).toBe(HttpStatus.OK);
      expect(result.Data).toEqual([{ id: 1, nombre: 'Ordenador 1' }]);
    });

    it('debería procesar correctamente una respuesta en formato XML', async () => {
      const xmlData = `<response><rol><ordenador><id>1</id><nombre>Ordenador 1</nombre></ordenador></rol></response>`;

      mockedAxios.get.mockResolvedValueOnce({ data: xmlData });

      const result = await service.getRolOrdenadores();

      expect(result.Success).toBe(true);
      expect(result.Status).toBe(HttpStatus.OK);
    });

    it('debería retornar NOT_FOUND cuando la lista de ordenadores está vacía', async () => {
      const mockData = { rol: { ordenador: [] } };

      mockedAxios.get.mockResolvedValueOnce({ data: JSON.stringify(mockData) });

      const result = await service.getRolOrdenadores();

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.NOT_FOUND);
    });

    it('debería retornar REQUEST_TIMEOUT en caso de error ECONNABORTED en axios', async () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout',
      };

      mockedAxios.isAxiosError.mockReturnValueOnce(true);
      mockedAxios.get.mockRejectedValueOnce(axiosError);

      const result = await service.getRolOrdenadores();

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.REQUEST_TIMEOUT);
    });

    it('debería retornar INTERNAL_SERVER_ERROR ante una respuesta con formato inesperado', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: JSON.stringify({}) });

      const result = await service.getRolOrdenadores();

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debería manejar errores de timeout al consultar la API externa', async () => {
      const timeoutError = { code: 'ECONNABORTED', message: 'timeout' };
      mockedAxios.get.mockRejectedValueOnce(timeoutError);

      const result = await service.getRolOrdenadores();

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debería retornar error de formato cuando la respuesta no contiene la estructura requerida', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { estructura: 'invalida' } });

      const result = await service.getRolOrdenadores();

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debería manejar excepciones genéricas sin propiedad message en el catch', async () => {
      mockedAxios.get.mockRejectedValueOnce({});

      const result = await service.getRolOrdenadores();

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debería retornar el status HTTP proveniente de la respuesta de AxiosError', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: HttpStatus.BAD_REQUEST },
      };

      mockedAxios.isAxiosError.mockReturnValueOnce(true);
      mockedAxios.get.mockRejectedValueOnce(axiosError);

      const result = await service.getRolOrdenadores();

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('debería ejecutar la función transformResponse de axios', async () => {
      const mockData = JSON.stringify({ rol: { ordenador: [{ id: 1, nombre: 'Ordenador 1' }] } });

      mockedAxios.get.mockImplementationOnce((url, config) => {
        if (config?.transformResponse?.[0]) {
          config.transformResponse[0](mockData);
        }
        return Promise.resolve({ data: mockData });
      });

      const result = await service.getRolOrdenadores();

      expect(result.Success).toBe(true);
      expect(result.Status).toBe(HttpStatus.OK);
    });

    it('debería retornar INTERNAL_SERVER_ERROR ante un error genérico no Axios', async () => {
      mockedAxios.isAxiosError.mockReturnValueOnce(false);
      mockedAxios.get.mockRejectedValueOnce(new Error('Error genérico'));

      const result = await service.getRolOrdenadores();

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(result.Message).toBe('Error genérico');
    });
    it('debería manejar AxiosError sin objeto response ni code', async () => {
      const axiosError = { isAxiosError: true };

      mockedAxios.isAxiosError.mockReturnValueOnce(true);
      mockedAxios.get.mockRejectedValueOnce(axiosError);

      const result = await service.getRolOrdenadores();

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
    it('debería evaluar la rama else de transformResponse cuando data no es un string', async () => {
      const mockDataObject = {
        rol: { ordenador: [{ id: 1, nombre: 'Ordenador 1' }] },
      };

      mockedAxios.get.mockImplementationOnce((url, config) => {
        if (config?.transformResponse?.[0]) {
          config.transformResponse[0](mockDataObject);
        }
        return Promise.resolve({ data: JSON.stringify(mockDataObject) });
      });

      const result = await service.getRolOrdenadores();

      expect(result.Success).toBe(true);
    });
  });

  describe('getOrdenadorActual', () => {
    it('debería retornar el ordenador actual con su tercero_id en caso de éxito', async () => {
      const mockOrdenadorData = {
        ordenador: {
          fechas: [{ documento_identidad: 12345, nombre: 'Juan Perez' }],
        },
      };

      const mockTerceroData = [{ Tercero: { Id: 99 } }];

      mockedAxios.get.mockImplementation((url, config) => {
        if (config?.transformResponse?.[0]) {
          config.transformResponse[0](JSON.stringify(mockOrdenadorData));
        }
        if (url.includes('ordenador_fecha')) {
          return Promise.resolve({ data: JSON.stringify(mockOrdenadorData) });
        }
        return Promise.resolve({ data: mockTerceroData });
      });

      const result = await service.getOrdenadorActual(1);

      expect(result.Success).toBe(true);
      expect(result.Status).toBe(HttpStatus.OK);
      expect(result.Data[0].tercero_id).toBe(99);
    });

    it('debería asignar tercero_id como null si falla la consulta del tercero', async () => {
      const mockOrdenadorData = {
        ordenador: {
          fechas: [{ documento_identidad: 12345 }],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: JSON.stringify(mockOrdenadorData) })
        .mockRejectedValueOnce(new Error('Error al consultar tercero'));

      const result = await service.getOrdenadorActual(1);

      expect(result.Success).toBe(true);
      expect(result.Data[0].tercero_id).toBeNull();
    });

    it('debería retornar NOT_FOUND si no hay fechas en la respuesta', async () => {
      const mockOrdenadorData = {
        ordenador: {
          fechas: [],
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: JSON.stringify(mockOrdenadorData) });

      const result = await service.getOrdenadorActual(1);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.NOT_FOUND);
    });
    it('debería procesar cuando ordenador.fechas es un objeto único y capturar excepción en el map', async () => {
      const mockOrdenadorData = {
        ordenador: {
          fechas: { documento_identidad: 12345 },
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: JSON.stringify(mockOrdenadorData) });
      jest.spyOn(service, 'obtenerTercero').mockRejectedValueOnce(new Error('Error forzado'));

      const result = await service.getOrdenadorActual(1);

      expect(result.Success).toBe(true);
      expect(result.Data[0].tercero_id).toBeNull();
    });

    it('debería retornar REQUEST_TIMEOUT si ocurre error ECONNABORTED en getOrdenadorActual', async () => {
      const timeoutError = { isAxiosError: true, code: 'ECONNABORTED' };
      mockedAxios.isAxiosError.mockReturnValueOnce(true);
      mockedAxios.get.mockRejectedValueOnce(timeoutError);

      const result = await service.getOrdenadorActual(1);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.REQUEST_TIMEOUT);
    });

    it('debería retornar el status HTTP del AxiosError en getOrdenadorActual', async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: HttpStatus.BAD_REQUEST },
      };
      mockedAxios.isAxiosError.mockReturnValueOnce(true);
      mockedAxios.get.mockRejectedValueOnce(axiosError);

      const result = await service.getOrdenadorActual(1);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.BAD_REQUEST);
    });

    it('debería retornar INTERNAL_SERVER_ERROR ante un error genérico o formato inválido en getOrdenadorActual', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: JSON.stringify({}) });

      const result = await service.getOrdenadorActual(1);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debería ejecutar transformResponse en getOrdenadorActual', async () => {
      const mockOrdenadorData = JSON.stringify({
        ordenador: { fechas: [{ documento_identidad: 12345 }] },
      });

      mockedAxios.get.mockImplementation((url, config) => {
        if (config?.transformResponse?.[0]) {
          config.transformResponse[0](mockOrdenadorData);
        }
        if (url.includes('ordenador_fecha')) {
          return Promise.resolve({ data: mockOrdenadorData });
        }
        return Promise.resolve({ data: [{ Tercero: { Id: 99 } }] });
      });

      const result = await service.getOrdenadorActual(1);

      expect(result.Success).toBe(true);
      expect(result.Data[0].tercero_id).toBe(99);
    });

    it('debería retornar INTERNAL_SERVER_ERROR ante un error genérico no Axios en getOrdenadorActual', async () => {
      mockedAxios.isAxiosError.mockReturnValueOnce(false);
      mockedAxios.get.mockRejectedValueOnce(new Error('Error genérico en ordenador actual'));

      const result = await service.getOrdenadorActual(1);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(result.Message).toBe('Error genérico en ordenador actual');
    });

    it('debería manejar AxiosError sin response ni code en getOrdenadorActual', async () => {
      const axiosError = { isAxiosError: true };

      mockedAxios.isAxiosError.mockReturnValueOnce(true);
      mockedAxios.get.mockRejectedValueOnce(axiosError);

      const result = await service.getOrdenadorActual(1);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('debería retornar mensaje genérico cuando la excepción en getOrdenadorActual no es de tipo Error', async () => {
      mockedAxios.isAxiosError.mockReturnValueOnce(false);
      mockedAxios.get.mockRejectedValueOnce('Error de string');

      const result = await service.getOrdenadorActual(1);

      expect(result.Success).toBe(false);
      expect(result.Status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
    it('debería evaluar la rama else de transformResponse cuando data no es un string en getOrdenadorActual', async () => {
      const mockOrdenadorObject = {
        ordenador: { fechas: [{ documento_identidad: 12345 }] },
      };

      mockedAxios.get.mockImplementation((url, config) => {
        if (config?.transformResponse?.[0]) {
          config.transformResponse[0](mockOrdenadorObject);
        }
        if (url.includes('ordenador_fecha')) {
          return Promise.resolve({ data: JSON.stringify(mockOrdenadorObject) });
        }
        return Promise.resolve({ data: [{ Tercero: { Id: 99 } }] });
      });

      const result = await service.getOrdenadorActual(1);

      expect(result.Success).toBe(true);
    });
  });

  describe('obtenerTercero', () => {
    it('debería retornar la información del tercero al consultar exitosamente', async () => {
      const mockTercero = [{ Tercero: { Id: 10 } }];
      mockedAxios.get.mockResolvedValueOnce({ data: mockTercero });

      const result = await service.obtenerTercero(12345);

      expect(result).toEqual(mockTercero);
    });

    it('debería retornar null en caso de error durante la consulta', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.obtenerTercero(12345);

      expect(result).toBeNull();
    });

    it('debería retornar null si no existe ENDP_TERCEROS_CRUD', async () => {
      const serviceSinEndpoint = new RolOrdenadorService({
        get: jest.fn(() => null),
      } as any);

      const result = await serviceSinEndpoint.obtenerTercero(12345);

      expect(result).toBeNull();
    });
  });
});