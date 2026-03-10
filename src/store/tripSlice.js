import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tripName: '',
  journeys: [
    { 
      id: typeof window !== 'undefined' ? crypto.randomUUID() : '1', 
      trainNo: '', 
      trainName: '', 
      date: '', 
      class: 'SL', 
      seats: '', 
      from: '', 
      to: '' 
    }
  ],
};

const tripSlice = createSlice({
  name: 'trip',
  initialState,
  reducers: {
    setTripName: (state, action) => {
      state.tripName = action.payload;
    },
    // New action to specifically set journeys from DB
    setJourneys: (state, action) => {
      state.journeys = action.payload;
    },
    addJourney: (state) => {
      if (state.journeys.length < 6) {
        state.journeys.push({
          id: crypto.randomUUID(),
          trainNo: '',
          trainName: '',
          date: '',
          class: 'SL',
          seats: '',
          from: '',
          to: '',
        });
      }
    },
    updateJourney: (state, action) => {
      const { id, field, value } = action.payload;
      const index = state.journeys.findIndex((j) => j.id === id);
      if (index !== -1) {
        state.journeys[index][field] = value;
      }
    },
    removeJourney: (state, action) => {
      if (state.journeys.length > 1) {
        state.journeys = state.journeys.filter((j) => j.id !== action.payload);
      }
    },
    loadTripForEdit: (state, action) => {
      state.tripName = action.payload.tripName;
      state.journeys = action.payload.journeys;
    },
    resetForm: (state) => {
      return {
        ...initialState,
        journeys: [{ 
          id: crypto.randomUUID(), 
          trainNo: '', trainName: '', date: '', class: 'SL', seats: '', from: '', to: '' 
        }]
      };
    },
  },
});

export const { 
  setTripName, 
  setJourneys, // Exported now
  addJourney, 
  updateJourney, 
  removeJourney, 
  loadTripForEdit, 
  resetForm 
} = tripSlice.actions;

export default tripSlice.reducer;