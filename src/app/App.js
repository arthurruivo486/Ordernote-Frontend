import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StatusBar, SafeAreaView, StyleSheet, Platform } from 'react-native';

// Suas telas
import DashboardScreen from './(protected)/DashbordScreen';
import UserScreen from './(protected)/UserScreen';
import SaleScreen from './(protected)/SaleScreen';
import ProductScreen from './(protected)/ProductScreen';
import CustomerScreen from './(protected)/CustomerScreen';

const Tab = createBottomTabNavigator();

function App() {
  return (
    <SafeAreaView style={styles.container}>
      {/* ✅ Status bar translúcida e sem faixa branca */}
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Dashboard') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'UserScreen') {
                iconName = focused ? 'settings' : 'settings-outline';
              } else if (route.name === 'SaleScreen') {
                iconName = focused ? 'cart' : 'cart-outline';
              } else if (route.name === 'ProductScreen') {
                iconName = focused ? 'cube' : 'cube-outline';
              } else if (route.name === 'CustomerScreen') {
                iconName = focused ? 'people' : 'people-outline';
              }

              return (
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: -30,
                  }}
                >
                  <Ionicons name={iconName} size={size} color={color} />
                </View>
              );
            },

            tabBarShowLabel: false,
            tabBarStyle: {
              position: 'absolute',
              bottom: 54,
              marginHorizontal: 20,
              borderRadius: 20,
              height: 70,
              backgroundColor: '#fff',
              elevation: 5,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: 5 },
              shadowRadius: 8,
              overflow: 'hidden',
            },
            tabBarActiveTintColor: '#872bb8',
            tabBarInactiveTintColor: 'gray',
            headerShown: false,
          })}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="SaleScreen" component={SaleScreen} />
          <Tab.Screen name="CustomerScreen" component={CustomerScreen} />
          <Tab.Screen name="ProductScreen" component={ProductScreen} />
          <Tab.Screen name="UserScreen" component={UserScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // 👈 mantém a área superior escura (pode mudar pro roxo se quiser)
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});
