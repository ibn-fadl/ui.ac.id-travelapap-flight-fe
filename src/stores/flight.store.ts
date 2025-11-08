import { defineStore } from 'pinia';
import type { FlightInterface } from '@/interfaces';
import flightService from '@/services/flight.service';
import router from '@/router';

export interface FlightFilters {
  origin?: string;
  destination?: string;
  status?: string;
  showInactive?: boolean;
  search?: string;
}

interface FlightState {
  flights: FlightInterface[];
  loading: boolean;
  error: string | null;
  tripMode: 'one-way' | 'round-trip';
  filters: FlightFilters;
  selectedDeparture: FlightInterface | null;
  selectedReturn: FlightInterface | null;
  selectionError: string | null;
}

export const useFlightStore = defineStore('flight', {
  state: (): FlightState => ({
    flights: [],
    loading: false,
    error: null,
    tripMode: 'one-way',
    filters: {
      origin: '',
      destination: '',
      status: 'all',
      showInactive: false,
      search: '',
    },
    selectedDeparture: null,
    selectedReturn: null,
    selectionError: null,
  }),
  getters: {
    isDepartureSelected: (state) => !!state.selectedDeparture,
    isReturnSelected: (state) => !!state.selectedReturn,
    filteredFlights: (state) => {
      if (state.tripMode === 'round-trip' && state.selectedDeparture) {
        const departureArrivalTime = new Date(state.selectedDeparture.arrivalTime);
        return state.flights.filter(flight => {
          const returnDepartureTime = new Date(flight.departureTime);
          return returnDepartureTime > departureArrivalTime;
        });
      }
      return state.flights;
    },
  },
  actions: {
    async fetchFlights() {
      this.loading = true;
      this.error = null;
      try {
        // @ts-ignore
        const flights = await flightService.getAllFlights(this.filters);
        this.flights = flights;
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch flights';
      } finally {
        this.loading = false;
      }
    },
    setTripMode(mode: 'one-way' | 'round-trip') {
      this.tripMode = mode;
      this.clearSelection();
    },
    setFilter(payload: Partial<FlightFilters>) {
      this.filters = { ...this.filters, ...payload };
      this.fetchFlights();
    },
    resetFilters() {
      this.filters = {
        origin: '',
        destination: '',
        status: 'all',
        showInactive: false,
        search: '',
      };
    },
    selectDeparture(flight: FlightInterface) {
      this.selectedDeparture = flight;
      this.selectedReturn = null;
      this.selectionError = null;
      // Auto-set and lock filters for return flight
      this.filters.origin = flight.destinationAirportCode;
      this.filters.destination = flight.originAirportCode;
      this.fetchFlights();
    },
    selectReturn(flight: FlightInterface) {
      this.selectedReturn = flight;
      this.selectionError = null;
    },
    clearSelection() {
      this.selectedDeparture = null;
      this.selectedReturn = null;
      this.selectionError = null;
      this.resetFilters();
      this.fetchFlights();
    },
    validateAndProceed() {
      if (!this.selectedDeparture || !this.selectedReturn) {
        this.selectionError = 'Please select both departure and return flights.';
        return;
      }

      if (this.selectedReturn.originAirportCode !== this.selectedDeparture.destinationAirportCode ||
          this.selectedReturn.destinationAirportCode !== this.selectedDeparture.originAirportCode) {
        this.selectionError = 'Return flight route does not match the departure flight.';
        return;
      }

      const departureArrivalTime = new Date(this.selectedDeparture.arrivalTime);
      const returnDepartureTime = new Date(this.selectedReturn.departureTime);

      if (returnDepartureTime < departureArrivalTime) {
        this.selectionError = 'Return flight must depart after the departure flight arrives.';
        return;
      }

      this.selectionError = null;
      // Placeholder for navigation
      console.log('Validation successful! Proceeding to booking with:', this.selectedDeparture.id, this.selectedReturn.id);
      router.push({
        name: 'booking-create',
        query: {
          departureFlightId: this.selectedDeparture.id,
          returnFlightId: this.selectedReturn.id,
        },
      });
    },
    bookOneWay(flight: FlightInterface) {
      router.push({
        name: 'booking-create',
        query: { departureFlightId: flight.id },
      });
    }
  },
});
