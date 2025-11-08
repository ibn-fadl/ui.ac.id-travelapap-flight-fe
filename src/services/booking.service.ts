import http from './http';
import type {
  BookingInterface,
  BookingDetailInterface,
  BookingCreateRequest,
  CommonResponseInterface,
  BookingUpdateRequest,
} from '../interfaces';

export interface BookingFilters {
  status: string;
  showInactive: boolean;
  search: string;
  flightNumber: string;
  classType: string;
}

class BookingService {
  async getAllBookings(filters?: Partial<BookingFilters>): Promise<BookingInterface[]> {
    const response = await http.get<CommonResponseInterface<BookingInterface[]>>('/bookings/all', {
      params: filters,
    });
    return response.data.data;
  }

  async getBookingById(id: string): Promise<BookingDetailInterface> {
    const response = await http.get<CommonResponseInterface<BookingDetailInterface>>(`/bookings/${id}`);
    return response.data.data;
  }

  async cancelBooking(id: string): Promise<BookingDetailInterface> {
    const response = await http.post<CommonResponseInterface<BookingDetailInterface>>(`/bookings/${id}/delete`);
    return response.data.data;
  }

  async createBooking(payload: BookingCreateRequest): Promise<BookingInterface[]> {
    const response = await http.post<CommonResponseInterface<BookingInterface[]>>(
      '/bookings/create',
      payload
    );
    return response.data.data;
  }

  async updateBooking(id: string, payload: BookingUpdateRequest): Promise<BookingDetailInterface> {
    const response = await http.put<CommonResponseInterface<BookingDetailInterface>>(
      `/bookings/${id}/update`,
      payload
    );
    return response.data.data;
  }
}

export default new BookingService();
