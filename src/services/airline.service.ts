import type { AirlineInterface, CommonResponseInterface } from '@/interfaces';
import http from './http';

class AirlineService {
  async getAllAirlines(): Promise<AirlineInterface[]> {
    try {
      const response = await http.get<CommonResponseInterface<AirlineInterface[]>>('/airlines/all');
      return response.data.data;
    } catch (error: unknown) {
      console.error('Failed to fetch airlines:', error);
      throw error;
    }
  }
}

export default new AirlineService();
