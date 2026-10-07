import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { StandardResponse, UsuarioResponse } from 'src/interfaces/responses.interfaces';
import * as xml2js from 'xml2js';

@Injectable()
export class RolOrdenadorService {
  private readonly logger = new Logger(RolOrdenadorService.name);
  private readonly TIMEOUT = 15000;

  constructor(private configService: ConfigService) {}

  private async parseResponse(responseData: string): Promise<any> {
    try {
      return JSON.parse(responseData);
    } catch (error) {
      this.logger.error(`Error al parsear respuesta: ${error.message}`);
      return this.parseXml(responseData);
    }
  }

  private async parseXml(xmlString: string): Promise<any> {
    const parser = new xml2js.Parser({
      explicitArray: false,
      trim: true,
      mergeAttrs: true,
      xmlns: true,
      explicitRoot: false,
    });

    try {
      return await parser.parseStringPromise(xmlString);
    } catch (error) {
      throw error;
    }
  }

  async getRolOrdenadores(): Promise<StandardResponse<any>> {
    try {
      const endpoint: string =
        this.configService.get<string>('ENDP_ROL_ORDENADOR');
      const url = `${endpoint}/rol_ordenador`;

      const response = await axios.get(url, {
        responseType: 'text',
        timeout: this.TIMEOUT,
        transformResponse: [(data) => data],
      });

      const parsedData = await this.parseResponse(response.data);

      if (parsedData.rol && parsedData.rol.ordenador) {
        const ordenadores = parsedData.rol.ordenador;
        const ordenadoresArray = Array.isArray(ordenadores)
          ? ordenadores
          : [ordenadores];

        if (ordenadoresArray.length === 0) {
          return {
            Success: false,
            Status: HttpStatus.NOT_FOUND,
            Message: 'Roles de ordenadores no encontrados',
          };
        }

        return {
          Success: true,
          Status: HttpStatus.OK,
          Message: 'Roles de ordenadores recuperados exitosamente',
          Data: ordenadoresArray,
        };
      }

      throw new Error('Formato de respuesta inesperado');
    } catch (error) {
      this.logger.error(`Error en getRolOrdenadores: ${error.message}`);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (error.code === 'ECONNABORTED') {
          return {
            Success: false,
            Status: HttpStatus.REQUEST_TIMEOUT,
            Message: 'Tiempo de espera agotado',
          };
        }

        return {
          Success: false,
          Status:
            axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          Message: 'Error al consultar los roles de ordenadores',
        };
      }

      return {
        Success: false,
        Status: HttpStatus.INTERNAL_SERVER_ERROR,
        Message: error.message || 'Error interno del servidor',
      };
    }
  }

  async getOrdenadorActual(rol: number): Promise<StandardResponse<any>> {
    try {
      const endpoint: string =
        this.configService.get<string>('ENDP_ROL_ORDENADOR');

      const fechaActual = new Date().toISOString().split('T')[0];
      const url = `${endpoint}/ordenador_fecha?fecha_fin=${fechaActual}&rol_id=${rol}`;

      const response = await axios.get(url, {
        responseType: 'text',
        timeout: this.TIMEOUT,
        transformResponse: [(data) => data],
      });

      this.logger.log(response.data);

      const parsedData = await this.parseResponse(response.data);

      if (parsedData.ordenador && parsedData.ordenador.fechas) {
        const ordenadores = parsedData.ordenador.fechas;
        const ordenadoresArray = Array.isArray(ordenadores)
          ? ordenadores
          : [ordenadores];

        if (ordenadoresArray.length === 0) {
          return {
            Success: false,
            Status: HttpStatus.NOT_FOUND,
            Message: 'Roles de ordenadores no encontrados',
          };
        }

        // Agregar tercero_id a cada ordenador
        const ordenadoresConTerceroId = await Promise.all(
          ordenadoresArray.map(async (ordenador) => {
            try {
              const terceroInfo = await this.obtenerTercero(Number(ordenador.documento_identidad));
              const terceroId = Array.isArray(terceroInfo) ? terceroInfo[0]?.Tercero?.Id : null;
              return {
                ...ordenador,
                tercero_id: terceroId
              };
            } catch (error) {
              this.logger.warn(`Error al obtener tercero para documento ${ordenador.documento_identidad}: ${error.message}`);
              return {
                ...ordenador,
                tercero_id: null
              };
            }
          })
        );

        return {
          Success: true,
          Status: HttpStatus.OK,
          Message: 'Roles de ordenadores recuperados exitosamente',
          Data: ordenadoresConTerceroId,
        };
      }

      throw new Error('Formato de respuesta inesperado');
    } catch (error) {
      this.logger.error(`Error en getOrdenadorActual: ${error.message}`);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (error.code === 'ECONNABORTED') {
          return {
            Success: false,
            Status: HttpStatus.REQUEST_TIMEOUT,
            Message: 'Tiempo de espera agotado',
          };
        }

        return {
          Success: false,
          Status:
            axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          Message: 'Error al consultar los roles de ordenadores',
        };
      }

      return {
        Success: false,
        Status: HttpStatus.INTERNAL_SERVER_ERROR,
        Message: error.message || 'Error interno del servidor',
      };
    }
  }

  async obtenerTercero(id: number): Promise<UsuarioResponse> {
    try {
      const endpoint: string =
        this.configService.get<string>('ENDP_TERCEROS_CRUD');

      if (!endpoint) {
        throw new Error('No se encontró la URL del servicio de terceros');
      }

      const { data } = await axios.get<UsuarioResponse>(
        `${endpoint}tercero/identificacion?query=${id}`,
      );
      return data;
    } catch (error) {
      return null;
    }
  }
}