import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StatusBar } from 'react-native';

// Suas telas
import DashboardScreen from './(protected)/DashbordScreen';
import UserScreen from './(protected)/UserScreen';
import SaleScreen from './(protected)/SaleScreen';
import ProductScreen from './(protected)/ProductScreen';
import Add from './(protected)/Add';

const Tab = createBottomTabNavigator();

function App() {
  return (
    <>
      <StatusBar backgroundColor="#7528b4" />

      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Dashboard') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'UserScreen') {
                iconName = focused ? 'person' : 'person-outline';
              } else if (route.name === 'SaleScreen') {
                iconName = focused ? 'cart' : 'cart-outline';
              } else if (route.name === 'ProductScreen') {
                iconName = focused ? 'cube' : 'cube-outline';
              } else if (route.name === 'Add') {
                iconName = focused ? 'add-circle' : 'add-circle-outline';
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
              bottom: 20,
              marginHorizontal: 20, // 👈 espaçamento lateral correto
              borderRadius: 20,
              height: 70,
              backgroundColor: '#fff',
              elevation: 5,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: 5 },
              shadowRadius: 8,
              overflow: 'hidden', // evita bug visual no Android
            },
            tabBarActiveTintColor: '#872bb8',
            tabBarInactiveTintColor: 'gray',
            headerShown: false,
          })}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="SaleScreen" component={SaleScreen} />
          <Tab.Screen name="Add" component={Add} />
          <Tab.Screen name="ProductScreen" component={ProductScreen} />
          <Tab.Screen name="UserScreen" component={UserScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

export default App;