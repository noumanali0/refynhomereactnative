import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Review } from '../../types';
import { MOCK_REVIEWS } from '../../utils/mockData';

interface ReviewState {
  reviews: Review[];
}

const initialState: ReviewState = {
  reviews: MOCK_REVIEWS,
};

const reviewSlice = createSlice({
  name: 'review',
  initialState,
  reducers: {
    addReview: (state, action: PayloadAction<Review>) => {
      state.reviews.push(action.payload);
    },
  },
});

export const { addReview } = reviewSlice.actions;
export default reviewSlice.reducer;
