export interface CommonResponseInterface<T> {
  data: T;
  message: string;
  status: number;
  timestamp: Date;
}

export interface AirplaneInterface {
  id: string;
  airlineId: string;
  model: string;
  seatCapacity: number;
  manufactureYear: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BookingInterface {
  bookingId: string;
  flightNumber: string;
  route: string;
  class: string;
  contactEmail: string;
  contactPhone: string;
  passengerCount: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlightInterface {
  flightNumber: string;
  airline: string;
  airplane: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  terminal: string;
  gate: string;
  status: number;
  isDeleted: boolean;
}
