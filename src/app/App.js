import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, StatusBar, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Suas telas
import DashboardScreen from './(protected)/DashbordScreen';
import UserScreen from './(protected)/UserScreen';
import SaleScreen from './(protected)/SaleScreen';
import ProductScreen from './(protected)/ProductScreen';
import CustomerScreen from './(protected)/CustomerScreen';
import NovaVendaScreen from './(protected)/NovaVendaScreen';
import NovaDeliveryScreen from './(protected)/NovaDeliveryScreen';
import EditarVendaScreen from './(protected)/EditarVendaScreen';
import LoginScreen from './LoginScreen';
import NovoProdutoScreen from './(protected)/NovoProdutoScreen';

const Tab = createBottomTabNavigator();
const SaleStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

// Stack Navigator para a aba de Vendas
function SaleStackNavigator() {
  return (
    <SaleStack.Navigator screenOptions={{ headerShown: false }}>
      <SaleStack.Screen name="VendasMain" component={SaleScreen} />
      <SaleStack.Screen name="NovaVenda" component={NovaVendaScreen} />
      <SaleStack.Screen name="NovaDelivery" component={NovaDeliveryScreen} />
      <SaleStack.Screen name="EditarVenda" component={EditarVendaScreen} />
      {/* REMOVA NovoProdutoScreen daqui - ela não pertence ao stack de vendas */}
    </SaleStack.Navigator>
  );
}

// ✅ ADICIONE: Stack Navigator para Produtos
function ProductStackNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="ProductMain" component={ProductScreen} />
      <MainStack.Screen name="NovoProdutoScreen" component={NovoProdutoScreen} />
    </MainStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'UserScreen') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else if (route.name === 'Vendas') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'ProductScreen') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'CustomerScreen') {
            iconName = focused ? 'people' : 'people-outline';
          }

          return (
            <View style={styles.tabIconContainer}>
              <Ionicons name={iconName} size={size} color={color} />
            </View>
          );
        },
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#872bb8',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Vendas" component={SaleStackNavigator} />
      <Tab.Screen name="CustomerScreen" component={CustomerScreen} />
      {/* ✅ ALTERE: Use o ProductStackNavigator em vez do ProductScreen direto */}
      <Tab.Screen name="ProductScreen" component={ProductStackNavigator} />
      <Tab.Screen name="UserScreen" component={UserScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#872bb8" />
      </View>
    );
  }

  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <MainStack.Screen name="MainApp" component={MainTabs} />
      ) : (
        <MainStack.Screen name="Login" component={LoginScreen} />
      )}
    </MainStack.Navigator>
  );
}

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#311aa4',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#311aa4',
  },
  tabBar: {
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
  tabIconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -30,
  },
});