import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
	StyleSheet,
	Text,
	View,
	Alert,
	Modal,
	TouchableOpacity,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from './src/app/DashboardScreen';
import ProductsScreen from './src/app/ProductsScreen';
import SalesScreen from './src/app/(protected)/SalesScreen';

// Telas placeholder para as outras abas

function UserScreen() {
	return (
		<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
			<Text>Perfil do Usuário!</Text>
		</View>
	);
}

// Tela vazia para a aba Adicionar
function AddScreen() {
	return (
		<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
			<Text>Use o botão de adicionar na barra superior</Text>
		</View>
	);
}

// Componente Modal para Adicionar
function AddModal({ visible, onClose }) {
	return (
		<Modal
			animationType="fade"
			transparent={true}
			visible={visible}
			onRequestClose={onClose}
		>
			<View style={styles.modalOverlay}>
				<View style={styles.modalContainer}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>Adicionar Novo</Text>
            
						<TouchableOpacity 
							style={styles.modalButton} 
							onPress={() => {
								Alert.alert("Adicionar", "Adicionar Cliente");
								onClose();
							}}
						>
							<Ionicons name="person-add" size={24} color="#872bb8" />
							<Text style={styles.modalButtonText}>Cliente</Text>
						</TouchableOpacity>
            
						<TouchableOpacity 
							style={styles.modalButton} 
							onPress={() => {
								Alert.alert("Adicionar", "Adicionar Produto");
								onClose();
							}}
						>
							<Ionicons name="cube" size={24} color="#872bb8" />
							<Text style={styles.modalButtonText}>Produto</Text>
						</TouchableOpacity>
            
						<TouchableOpacity 
							style={styles.modalButton} 
							onPress={() => {
								Alert.alert("Adicionar", "Nova Venda Rápida");
								onClose();
							}}
						>
							<Ionicons name="cart" size={24} color="#872bb8" />
							<Text style={styles.modalButtonText}>Venda Rápida</Text>
						</TouchableOpacity>
            
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<Text style={styles.closeButtonText}>Fechar</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}

// Componente Custom Header com Botão Adicionar
function CustomHeader({ onAddPress }) {
	return (
		<View style={styles.header}>
			<Text style={styles.headerTitle}>OrderNote</Text>
			<TouchableOpacity onPress={onAddPress} style={styles.addButton}>
				<Ionicons name="add-circle" size={28} color="#fff" />
			</TouchableOpacity>
		</View>
	);
}

const Tab = createBottomTabNavigator({
	screens: {
		Dashboard: DashboardScreen,
		Produtos: ProductsScreen,
	},
});
//const navigation = useNavigation();

// RootTabs usando a estrutura correta
function RootTabs() {
	const [addModalVisible, setAddModalVisible] = useState(false);

	return (
		<>
			<Tab.Navigator
				screenOptions={({ route }) => ({
					tabBarIcon: ({ focused, color, size }) => {
						let iconName;

						if (route.name === 'Dashboard') {
							iconName = focused ? 'home' : 'home-outline';
						} else if (route.name === 'Vendas') {
							iconName = focused ? 'cart' : 'cart-outline';
						} else if (route.name === 'Adicionar') {
							iconName = focused ? 'add-circle' : 'add-circle-outline';
						} else if (route.name === 'Produtos') {
							iconName = focused ? 'cube' : 'cube-outline';
						} else if (route.name === 'Usuário') {
							iconName = focused ? 'person' : 'person-outline';
						}

						return <Ionicons name={iconName} size={size} color={color} />;
					},
					tabBarActiveTintColor: '#872bb8',
					tabBarInactiveTintColor: 'gray',
					tabBarStyle: {
						backgroundColor: '#fff',
						borderTopWidth: 0,
						elevation: 8,
						shadowOpacity: 0.1,
						height: 60,
						paddingBottom: 8,
						paddingTop: 8,
					},
					headerShown: true,
				})}
			>
				<Tab.Screen 
					name="Dashboard" 
					component={DashboardScreen}
					options={{
						header: () => (
							<CustomHeader onAddPress={() => setAddModalVisible(true)} />
						),
					}}
				/>
				<Tab.Screen 
					name="Vendas" 
					component={SalesScreen}
					options={{
						header: () => (
							<CustomHeader onAddPress={() => setAddModalVisible(true)} />
						),
					}}
				/>
				<Tab.Screen 
					name="Adicionar" 
					component={AddScreen}
					listeners={{
						tabPress: (e) => {
							e.preventDefault();
							setAddModalVisible(true);
						},
					}}
				/>
				<Tab.Screen 
					name="Produtos" 
					component={ProductsScreen}
					options={{
						header: () => (
							<CustomHeader onAddPress={() => setAddModalVisible(true)} />
						),
					}}
				/>
				<Tab.Screen 
					name="Usuário" 
					component={UserScreen}
					options={{
						header: () => (
							<CustomHeader onAddPress={() => setAddModalVisible(true)} />
						),
					}}
				/>
			</Tab.Navigator>

			<AddModal 
				visible={addModalVisible} 
				onClose={() => setAddModalVisible(false)} 
			/>
		</>
	);
}

export default function App() {
	return (
		<SafeAreaProvider>
			<NavigationContainer>
				<RootTabs />
			</NavigationContainer>
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	header: {
		backgroundColor: '#872bb8',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		height: 60,
	},
	headerTitle: {
		color: '#fff',
		fontSize: 20,
		fontWeight: 'bold',
	},
	addButton: {
		padding: 4,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContainer: {
		width: '80%',
		maxWidth: 300,
	},
	modalContent: {
		backgroundColor: 'white',
		borderRadius: 20,
		padding: 25,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 20,
		color: '#872bb8',
	},
	modalButton: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f0e6f5',
		padding: 15,
		borderRadius: 12,
		marginVertical: 8,
		width: '100%',
	},
	modalButtonText: {
		marginLeft: 12,
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
	},
	closeButton: {
		marginTop: 15,
		padding: 12,
		borderRadius: 10,
		backgroundColor: '#e0e0e0',
		width: '100%',
		alignItems: 'center',
	},
	closeButtonText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#666',
	},
});