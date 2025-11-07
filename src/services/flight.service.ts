import http from './http';
import type { FlightInterface, CommonResponseInterface } from '../interfaces';

class FlightService {
  async getAllFlights(): Promise<FlightInterface[]> {
    const response = await http.get<CommonResponseInterface<FlightInterface[]>>('/flights/all');
    return response.data.data;
  }
}

export default new FlightService();