import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./app/LoginScreen";
import App from "./app/App"; // seu arquivo de tabs

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        
        {/* Tela inicial */}
        <Stack.Screen name="Login" component={LoginScreen} />

        {/* Navegação principal protegida */}
        <Stack.Screen name="MainApp" component={App} />

      </Stack.Navigator>
    </NavigationContainer>
  );
}