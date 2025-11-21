import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./context/AuthContext";
import App from "./app/App";

export default function RootNavigator() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <App />
      </NavigationContainer>
    </AuthProvider>
  );
}