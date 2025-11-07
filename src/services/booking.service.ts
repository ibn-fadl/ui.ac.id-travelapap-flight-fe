import http from './http';
import type { BookingInterface, CommonResponseInterface } from '../interfaces';

class BookingService {
  async getAllBookings(): Promise<BookingInterface[]> {
    const response = await http.get<CommonResponseInterface<BookingInterface[]>>('/bookings/all');
    return response.data.data;
  }
}

export default new BookingService();