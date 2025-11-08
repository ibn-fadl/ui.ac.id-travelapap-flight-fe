import http from './http';
import type { PassengerInterface, CommonResponseInterface } from '@/interfaces';

class PassengerService {
  async getAllPassengers(): Promise<PassengerInterface[]> {
    const response = await http.get<CommonResponseInterface<PassengerInterface[]>>('/passengers/all');
    return response.data.data;
  }
}

export default new PassengerService();
