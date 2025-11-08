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
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AirlineInterface {
  id: string;
  name: string;
  country: string;
}

export interface CreateAirplaneRequestInterface {
  airlineId: string;
  model: string;
  seatCapacity: number;
  manufactureYear: number;
}

export interface UpdateAirplaneRequestInterface {
  model: string;
  seatCapacity: number;
  manufactureYear: number;
}

export interface BookingInterface {
  id: string;
  flightNumber: string;
  originAirportCode: string;
  destinationAirportCode: string;
  classType: string;
  route: string;
  contactEmail: string;
  contactPhone: string;
  passengerCount: number;
  status: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface BookingDetailRouteInfo {
  origin: string;
  destination: string;
}

export interface BookingDetailFlightInfo {
  flightId: string;
  route: BookingDetailRouteInfo;
  departureTime: string;
  arrivalTime: string;
  terminal: string;
  gate: string;
  status: number;
  airlineName?: string;
  airlineCode?: string;
  aircraftModel?: string;
}

export interface BookingDetailClassFlightInfo {
  classFlightId: number;
  className: string;
  price: number;
}

export interface BookingDetailContactInfo {
  email: string;
  phone: string;
}

export interface BookingDetailPassengerItem {
  passengerId: string;
  fullName: string;
  birthDate: string;
  identityNumber: string;
  seatCode: string;
}

export interface BookingDetailInterface {
  bookingId: string;
  flight: BookingDetailFlightInfo;
  classFlight: BookingDetailClassFlightInfo;
  contactInfo: BookingDetailContactInfo;
  passengerList: BookingDetailPassengerItem[];
  passengerCount: number;
  totalPrice: number;
  status: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface ClassFlightInterface {
  id: number;
  classType: string;
  seatCapacity: number;
  availableSeats: number;
  price: number;
}

export interface FlightInterface {
  id: string;
  airlineId: string;
  airlineName: string;
  airplaneModel: string;
  airplaneSeatCapacity: number;
  originAirportCode: string;
  originAirportName?: string;
  destinationAirportCode: string;
  destinationAirportName?: string;
  departureTime: string;
  arrivalTime: string;
  terminal: string;
  gate: string;
  baggageAllowance: number;
  facilities: string;
  status: number;
  isDeleted: boolean;
  durationMinutes: number;
  lowestPrice: number;
  classes: ClassFlightInterface[];
}

export interface FlightDetailInterface extends FlightInterface {
  airline: AirlineInterface;
  airplane: AirplaneInterface;
}

export interface SeatInterface {
  id: number;
  seatCode: string;
  isBooked: boolean;
}

export interface FlightClassItemRequestDTO {
  classType: string;
  seatCapacity: number;
  price: number;
}

export interface FlightCreateRequestDTO {
  airlineId: string;
  airplaneId: string;
  originAirportCode: string;
  destinationAirportCode: string;
  departureTime: string;
  arrivalTime: string;
  terminal: string;
  gate: string;
  baggageAllowance: number;
  facilities: string;
  classes: FlightClassItemRequestDTO[];
}

export interface FlightUpdateRequestDTO {
  departureTime?: string;
  arrivalTime?: string;
  terminal?: string;
  gate?: string;
  baggageAllowance?: number;
  facilities?: string;
  classes?: FlightClassItemRequestDTO[];
}
