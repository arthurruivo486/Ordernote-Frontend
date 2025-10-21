import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ⬅️ ADICIONE ESTA LINHA

enableScreens();

function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Home!</Text>
    </View>
  );
}

function SettingsScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Settings!</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  //Processo do GET - Solicitar dados do servidor
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const API = "https://vigilant-space-tribble-69vgpqgrw7vv344g9-3000.app.github.dev/api";
    const URL = `${API}/user`;
    setLoading(true);

    try {
      const response = await fetch(URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider> {/* ⬅️ ADICIONE ESTE WRAPPER */}
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});