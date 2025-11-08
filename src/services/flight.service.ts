import http from './http';
import type {
  FlightInterface,
  CommonResponseInterface,
  FlightDetailInterface,
  SeatInterface,
  FlightCreateRequestDTO,
  FlightUpdateRequestDTO,
} from '../interfaces';
import type { FlightFilters } from '@/stores/flight.store';

class FlightService {
  async getAllFlights(filters?: FlightFilters): Promise<FlightInterface[]> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.origin) params.append('origin', filters.origin);
      if (filters.destination) params.append('destination', filters.destination);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.showInactive) params.append('showInactive', String(filters.showInactive));
      if (filters.search) params.append('search', filters.search);
    }

    const response = await http.get<CommonResponseInterface<FlightInterface[]>>(`/flights/all`, {
      params,
    });
    return response.data.data;
  }

  async getFlightById(id: string): Promise<FlightDetailInterface> {
    const response = await http.get<CommonResponseInterface<FlightDetailInterface>>(
      `/flights/${id}`,
    );
    return response.data.data;
  }

  async getSeatsByClassId(classId: number): Promise<SeatInterface[]> {
    const response = await http.get<CommonResponseInterface<SeatInterface[]>>(
      `/flights/classes/${classId}/seats`,
    );
    return response.data.data;
  }

  async createFlight(payload: FlightCreateRequestDTO): Promise<FlightDetailInterface> {
    const response = await http.post<CommonResponseInterface<FlightDetailInterface>>(
      '/flights/create',
      payload,
    );
    return response.data.data;
  }

  async updateFlight(id: string, payload: FlightUpdateRequestDTO): Promise<FlightDetailInterface> {
    const response = await http.put<CommonResponseInterface<FlightDetailInterface>>(
      `/flights/${id}/update`,
      payload,
    );
    return response.data.data;
  }

  async cancelFlight(id: string): Promise<FlightDetailInterface> {
    const response = await http.post<CommonResponseInterface<FlightDetailInterface>>(
      `/flights/${id}/delete`,
    );
    return response.data.data;
  }
}

export default new FlightService();