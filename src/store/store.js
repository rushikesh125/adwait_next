import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import packageSlice from "./packageSlice"

export const store =  configureStore({
    reducer: {
      auth: authReducer,
      package:packageSlice,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, 
      }),
  });

