import http from './http';
import type { AirplaneInterface, CommonResponseInterface } from '../interfaces';

class AirplaneService {
  async getAllAirplanes(): Promise<AirplaneInterface[]> {
    const response = await http.get<CommonResponseInterface<AirplaneInterface[]>>('/airplanes/all');
    return response.data.data;
  }
}

export default new AirplaneService();