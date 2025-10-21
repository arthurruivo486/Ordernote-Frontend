import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            {/* Conteúdo com scroll */}
            <ScrollView style={styles.scrollContainer}>
                {/* Cabeçalho com gradiente */}
                <LinearGradient
                    colors={["#872bb8", "#311aa4"]}
                    start={{ x: 1.2, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    {/* Topo */}
                    <View style={styles.headerTop}>
                        <Text style={styles.title}>Dashboard</Text>
                        <Ionicons name="cart-outline" size={28} color="#fff" />
                    </View>

                    {/* Resumo do Dia */}
                    <View style={styles.summaryRow}>
                        <TouchableOpacity
                            style={styles.historicButton}
                            onPress={() => navigation.navigate("Sales")}
                        >
                            <Text style={[styles.historicButtonText, { color: "#7b2ff7" }]}>
                                Histórico
                            </Text>
                        </TouchableOpacity>
                        <View style={styles.summaryBox}>
                            <Text style={[styles.summaryLabel, { color: "#fff" }]}>
                                total do dia
                            </Text>
                            <Text style={[styles.summaryValue, { color: "#fff" }]}>
                                $ 350,00
                            </Text>
                        </View>
                        <View style={styles.summaryBox}>
                            <Text style={[styles.summaryLabel, { color: "#fff" }]}>
                                vendas hoje
                            </Text>
                            <Text style={[styles.summaryValue, { color: "#fff" }]}>
                                10
                            </Text>
                        </View>
                    </View>

                    {/* Histórico Recente */}
                    <Text style={styles.sectionTitleWhite}>recente</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.recentRow}
                    >
                        <View style={styles.recentCard}>
                            <Text style={styles.client}>Jose</Text>
                            <Text style={styles.phone}>3271-6802</Text>
                            <Text style={styles.amount}>$ 10,00</Text>
                        </View>

                        <View style={styles.recentCard}>
                            <Text style={styles.client}>Rodrigo</Text>
                            <Text style={styles.phone}>3271-6802</Text>
                            <Text style={styles.amount}>$ 60,00</Text>
                        </View>

                        <View style={styles.recentCard}>
                            <Text style={styles.client}>Maria</Text>
                            <Text style={styles.phone}>9999-1234</Text>
                            <Text style={styles.amount}>$ 120,00</Text>
                        </View>

                        <View style={styles.recentCard}>
                            <Text style={styles.client}>Ana</Text>
                            <Text style={styles.phone}>9888-5678</Text>
                            <Text style={styles.amount}>$ 45,00</Text>
                        </View>
                    </ScrollView>
                </LinearGradient>

                {/* Fazer Venda */}
                <TouchableOpacity
                    style={styles.mainButton}
                    onPress={() => navigation.navigate("Sales")}
                >
                    <Text style={styles.mainButtonText}>fazer venda</Text>
                    <Text style={styles.mainSubText}>crie uma venda já</Text>
                </TouchableOpacity>

                {/* Menu Rápido */}
                <View style={styles.menuGrid}>
                    <TouchableOpacity style={styles.menuCard}>
                        <Ionicons name="cube-outline" size={30} color="#00bcd4" />
                        <Text style={styles.menuText}>Novo Produto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuCard}>
                        <Ionicons name="settings-outline" size={30} color="#ff9800" />
                        <Text style={styles.menuText}>Configurações</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuCard}>
                        <Ionicons name="time-outline" size={30} color="#e91e63" />
                        <Text style={styles.menuText}>Pedidos Pendentes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuCard}>
                        <Ionicons name="person-add-outline" size={30} color="#18d467" />
                        <Text style={styles.menuText}>Cadastrar Cliente</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Rodapé Navegação Fixo */}
            <View style={styles.footer}>
                <TouchableOpacity>
                    <Ionicons name="home" size={32} color="#872bb8" />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Ionicons name="cart" size={32} color="#999" />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Ionicons name="add-circle-outline" size={32} color="#999" />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Ionicons name="cube" size={32} color="#999" />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Ionicons name="person" size={32} color="#999" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f9f4fc",
    },
    scrollContainer: {
        flex: 1,
        marginBottom: 80, // Espaço para o rodapé fixo
    },

    // HEADER
    header: {
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 36,
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    historicButton: {
        backgroundColor: "#fff",
        padding: 10,
        marginTop: 16,
        height: 50,
        width: 100,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#fff",
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 20,
    },
    summaryBox: {
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderRadius: 14,
        minWidth: 100,
        alignItems: "center",
    },
    summaryLabel: {
        fontSize: 14,
        color: "#fff",
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 4,
        color: "#fff",
    },
    sectionTitleWhite: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 10,
        marginLeft: 5,
    },
    recentRow: {
        flexDirection: "row",
        paddingBottom: 10,
    },
    recentCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 15,
        marginRight: 14,
        width: 160,
        elevation: 3,
    },
    client: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
    },
    phone: {
        fontSize: 14,
        color: "#777",
        marginBottom: 10,
    },
    amount: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#7b2ff7",
    },

    // BOTÃO PRINCIPAL
    mainButton: {
        backgroundColor: "#fff",
        marginHorizontal: 20,
        borderRadius: 18,
        paddingVertical: 24,
        alignItems: "center",
        marginTop: 16,
        elevation: 3,
        zIndex: 1,
    },
    mainButtonText: {
        color: "#872bb8",
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 6,
    },
    mainSubText: {
        color: "#777",
        fontSize: 15,
    },

    // MENU RÁPIDO
    menuGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        marginBottom: 20,
        marginTop: 25,
    },
    menuCard: {
        backgroundColor: "#fff",
        width: "48%",
        borderRadius: 18,
        paddingVertical: 30,
        alignItems: "center",
        marginBottom: 20,
        elevation: 3,
    },
    menuText: {
        marginTop: 10,
        fontSize: 16,
        color: "#444",
        fontWeight: "600",
        textAlign: "center",
    },

    // RODAPÉ FIXO
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-around",
        padding: 18,
        backgroundColor: "#fff",
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        elevation: 10,
        height: 80,
        alignItems: "center",
    },
});
