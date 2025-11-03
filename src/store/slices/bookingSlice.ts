import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Booking } from '../../types';
import { MOCK_BOOKINGS } from '../../utils/mockData';

interface BookingState {
  bookings: Booking[];
}

const initialState: BookingState = {
  bookings: MOCK_BOOKINGS,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    addBooking: (state, action: PayloadAction<Booking>) => {
      state.bookings.push(action.payload);
    },
    updateBookingStatus: (state, action: PayloadAction<{ bookingId: string; status: Booking['status'] }>) => {
      const booking = state.bookings.find(b => b.id === action.payload.bookingId);
      if (booking) {
        booking.status = action.payload.status;
      }
    },
    cancelBooking: (state, action: PayloadAction<string>) => {
      const booking = state.bookings.find(b => b.id === action.payload);
      if (booking) {
        booking.status = 'cancelled';
      }
    },
  },
});

export const { addBooking, updateBookingStatus, cancelBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
