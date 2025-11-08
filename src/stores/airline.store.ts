import { defineStore } from 'pinia';
import type { AirlineInterface } from '@/interfaces';
import airlineService from '@/services/airline.service';

interface AirlineState {
  airlines: AirlineInterface[];
  loading: boolean;
  error: string | null;
}

export const useAirlineStore = defineStore('airline', {
  state: (): AirlineState => ({
    airlines: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchAirlines() {
      this.loading = true;
      this.error = null;
      try {
        const airlines = await airlineService.getAllAirlines();
        this.airlines = airlines;
      } catch (err: Error) {
        this.error = err.message || 'Failed to fetch airlines';
      } finally {
        this.loading = false;
      }
    },
  },
});
