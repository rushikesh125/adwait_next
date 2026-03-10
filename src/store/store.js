import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import packageSlice from "./packageSlice"
import tripReducer from './tripSlice';
export const store =  configureStore({
    reducer: {
      auth: authReducer,
      package:packageSlice,
      trip: tripReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, 
      }),
  });

