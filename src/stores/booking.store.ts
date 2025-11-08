import { defineStore } from 'pinia';
import type { BookingInterface, BookingDetailInterface } from '@/interfaces';
import BookingService from '@/services/booking.service';
import type { BookingFilters } from '@/services/booking.service';

const mapDetailToListItem = (detail: BookingDetailInterface): BookingInterface => ({
  id: detail.bookingId,
  flightNumber: detail.flight.flightId,
  originAirportCode: detail.flight.route.origin,
  destinationAirportCode: detail.flight.route.destination,
  classType: detail.classFlight.className,
  route: `${detail.flight.route.origin} -> ${detail.flight.route.destination}`,
  contactEmail: detail.contactInfo.email,
  contactPhone: detail.contactInfo.phone,
  passengerCount: detail.passengerCount,
  status: detail.status,
  totalPrice: detail.totalPrice,
  createdAt: detail.createdAt,
  updatedAt: detail.updatedAt,
  isDeleted: detail.isDeleted,
});

interface BookingState {
  bookings: BookingInterface[];
  currentBooking: BookingDetailInterface | null;
  filters: Partial<BookingFilters>;
  loading: boolean;
  error: string | null;
}

export const useBookingStore = defineStore('booking', {
  state: (): BookingState => ({
    bookings: [],
    currentBooking: null,
    filters: {
      status: 'all',
      showInactive: false,
      search: '',
      flightNumber: '',
      classType: '',
    },
    loading: false,
    error: null,
  }),
  getters: {
    filteredBookings(state): BookingInterface[] {
      return state.bookings; // Filtering logic will be added later
    },
    totalBookings(state): number {
      return state.bookings.length;
    },
    paidBookings(state): number {
      return state.bookings.filter(b => b.status === 2).length;
    },
    unpaidBookings(state): number {
      return state.bookings.filter(b => b.status === 1).length;
    },
  },
  actions: {
    async fetchBookings() {
      this.loading = true;
      this.error = null;
      try {
        this.bookings = await BookingService.getAllBookings(this.filters);
      } catch (err: any) {
        this.error = err.message || 'An unknown error occurred.';
      } finally {
        this.loading = false;
      }
    },
    async fetchBookingById(id: string) {
      this.loading = true;
      this.error = null;
      try {
        this.currentBooking = await BookingService.getBookingById(id);
      } catch (err: any) {
        this.error = err.message || 'An unknown error occurred.';
      } finally {
        this.loading = false;
      }
    },
    async cancelBooking(id: string): Promise<BookingDetailInterface> {
      this.loading = true;
      this.error = null;
      try {
        const updatedBooking = await BookingService.cancelBooking(id);

        if (this.currentBooking?.bookingId === updatedBooking.bookingId) {
          this.currentBooking = updatedBooking;
        }

        this.bookings = this.bookings.map((booking) =>
          booking.id === updatedBooking.bookingId ? mapDetailToListItem(updatedBooking) : booking
        );

        return updatedBooking;
      } catch (err: any) {
        const message = err.response?.data?.message || err.message || 'An unknown error occurred.';
        this.error = message;
        throw new Error(message);
      } finally {
        this.loading = false;
      }
    },
    setFilter(filter: Partial<BookingFilters>) {
      this.filters = { ...this.filters, ...filter };
      this.fetchBookings();
    },
    resetFilters() {
      this.filters = {
        status: 'all',
        showInactive: false,
        search: '',
        flightNumber: '',
        classType: '',
      };
      this.fetchBookings();
    },
    resetCurrentBooking() {
      this.currentBooking = null;
      this.error = null;
    },
  },
});
