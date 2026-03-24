// src/redux/slices/packageSlice.js
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  hotelEntries: [],
  selectedTransport: null,
  selectedActivities: [],
  activityTotalPrice: 0,
  confirmedMarkup: 0,
  packageName: "",
  customerName: "",
  itinerary: null,
  packageContext: {},
};

const packageSlice = createSlice({
  name: "package",
  initialState,
  reducers: {
    addHotelEntry: (state, action) => {
      state.hotelEntries.push(action.payload);
    },
    updateHotelEntry: (state, action) => {
      const { index, data } = action.payload;
      if (index >= 0 && index < state.hotelEntries.length) {
        state.hotelEntries[index] = data;
      }
    },
    deleteHotelEntry: (state, action) => {
      state.hotelEntries = state.hotelEntries.filter(
        (_, i) => i !== action.payload,
      );
    },
    setSelectedTransport: (state, action) => {
      state.selectedTransport = action.payload;
    },
    setSelectedActivities: (state, action) => {
      state.selectedActivities = action.payload.activities;
      state.activityTotalPrice = action.payload.totalPrice;
    },
    setConfirmedMarkup: (state, action) => {
      state.confirmedMarkup = action.payload;
    },
    setPackageName: (state, action) => {
      state.packageName = action.payload;
    },
    setCustomerName: (state, action) => {
      state.customerName = action.payload;
    },
    setItinerary(state, action) {
      state.itinerary = action.payload; // null to clear, or full itinerary object
    },
    setPackageContext: (state, action) => {
      state.packageContext = action.payload;
    },
    resetPackage: () => initialState,
  },
});

export const {
  addHotelEntry,
  updateHotelEntry,
  deleteHotelEntry,
  setSelectedTransport,
  setSelectedActivities,
  setConfirmedMarkup,
  setPackageName,
  setCustomerName,
  resetPackage,
  setItinerary,
  setPackageContext
} = packageSlice.actions;

export default packageSlice.reducer;
