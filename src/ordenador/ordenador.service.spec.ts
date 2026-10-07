import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { OrdenadorService } from './ordenador.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OrdenadorService', () => {
  let service: OrdenadorService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'ENDP_ROL_ORDENADOR') return 'http://api.ordenador.com';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdenadorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OrdenadorService>(OrdenadorService);
    jest.clearAllMocks();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getOrdenador', () => {
    it('debería retornar el ordenador exitosamente cuando se encuentra la información', async () => {
      const mockOrdenador = { id: 1, nombre: 'Ordenador 1' };
      const mockAxiosResponse = {
        data: {
          ordenadores: {
            ordenador: [mockOrdenador],
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockAxiosResponse);

      const result = await service.getOrdenador(123);

      expect(mockedAxios.get).toHaveBeenCalledWith('http://api.ordenador.com/ordenadores/123');
      expect(result).toEqual({
        Success: true,
        Status: HttpStatus.OK,
        Message: 'Ordenador encontrato exitosamente',
        Data: mockOrdenador,
      });
    });

    it('debería retornar NOT_FOUND cuando la respuesta no contiene la propiedad ordenadores', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: {} });

      const result = await service.getOrdenador(123);

      expect(result).toEqual({
        Success: false,
        Status: HttpStatus.NOT_FOUND,
        Message: 'Ordenador no encontrado',
      });
    });

    it('debería retornar NOT_FOUND cuando el arreglo de ordenadores está vacío', async () => {
      const mockAxiosResponse = {
        data: {
          ordenadores: {
            ordenador: [],
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockAxiosResponse);

      const result = await service.getOrdenador(123);

      expect(result).toEqual({
        Success: false,
        Status: HttpStatus.NOT_FOUND,
        Message: 'Ordenador no encontrado',
      });
    });

    it('debería capturar el error y retornar la estructura de fallo en caso de excepción', async () => {
      const mockError = {
        response: { status: HttpStatus.NOT_FOUND },
        message: 'Request failed with status code 404',
      };

      mockedAxios.get.mockRejectedValueOnce(mockError);

      const result = await service.getOrdenador(999);

      expect(result).toEqual({
        Success: false,
        Status: HttpStatus.NOT_FOUND,
        Message: 'Request failed with status code 404',
      });
    });

    it('debería retornar INTERNAL_SERVER_ERROR por defecto si el error no trae estatus', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      const result = await service.getOrdenador(999);

      expect(result).toEqual({
        Success: false,
        Status: HttpStatus.INTERNAL_SERVER_ERROR,
        Message: 'Network Error',
      });
    });

    it('debería retornar "Error interno del servidor" cuando el error no contiene la propiedad message', async () => {
      mockedAxios.get.mockRejectedValueOnce({});

      const result = await service.getOrdenador(999);

      expect(result).toEqual({
        Success: false,
        Status: HttpStatus.INTERNAL_SERVER_ERROR,
        Message: 'Error interno del servidor',
      });
    });
  });
});