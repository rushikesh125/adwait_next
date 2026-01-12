import { store } from "@/store/store";
import React from "react";
import { Provider } from "react-redux";
import AuthSetup from "./AuthSetup";

const ReduxProvider = ({ children }) => {
  return (
    <>
      <Provider store={store}>
        <AuthSetup />
        {children}
      </Provider>
    </>
  );
};

export default ReduxProvider;
