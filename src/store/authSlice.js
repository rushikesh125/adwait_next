import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  loading: true,
  initialized: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.loading = false;
      state.initialized = true;
    },
    clearUser: (state) => {
      state.user = null;
      state.loading = false;
      state.initialized = true;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setInitialized: (state) => {
      state.initialized = true;
      state.loading = false;
    },
  },
});

export const { setUser, clearUser, setLoading,setInitialized } = authSlice.actions;
export default authSlice.reducer;
