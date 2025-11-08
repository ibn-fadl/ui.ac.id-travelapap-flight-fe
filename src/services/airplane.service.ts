import http from './http';
import type {
  AirplaneInterface,
  CommonResponseInterface,
  CreateAirplaneRequestInterface,
  UpdateAirplaneRequestInterface
} from '../interfaces';

class AirplaneService {
  async getAllAirplanes(): Promise<AirplaneInterface[]> {
    const response = await http.get<CommonResponseInterface<AirplaneInterface[]>>('/airplanes/all', {
      params: {
        isActive: 'all'
      }
    });
    return response.data.data;
  }

  async createAirplane(data: CreateAirplaneRequestInterface): Promise<AirplaneInterface> {
    const response = await http.post<CommonResponseInterface<AirplaneInterface>>('/airplanes/create', data);
    return response.data.data;
  }

  async deactivateAirplane(id: string): Promise<AirplaneInterface> {
    const response = await http.post<CommonResponseInterface<AirplaneInterface>>(`/airplanes/${id}/delete`, {});
    return response.data.data;
  }

  async updateAirplane(id: string, data: UpdateAirplaneRequestInterface): Promise<AirplaneInterface> {
    const response = await http.put<CommonResponseInterface<AirplaneInterface>>(`/airplanes/${id}/update`, data);
    return response.data.data;
  }

  async activateAirplane(id: string): Promise<AirplaneInterface> {
    const response = await http.post<CommonResponseInterface<AirplaneInterface>>(`/airplanes/${id}/activate`, {});
    return response.data.data;
  }
}

export default new AirplaneService();