// ...existing code...
import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SalesScreen({ navigation }) {
    const PRODUCTS = [
        { id: "p1", name: "Café Expresso", price: 4.5 },
        { id: "p2", name: "Pão de Queijo", price: 3.0 },
        { id: "p3", name: "Suco Natural", price: 6.0 },
        { id: "p4", name: "Sanduíche", price: 12.0 },
        { id: "p5", name: "Água", price: 2.5 },
    ];

    const [cart, setCart] = useState([]);

    const addToCart = (product) => {
        setCart((prev) => [...prev, product]);
    };

    const removeFromCart = (index) => {
        setCart((prev) => prev.filter((_, i) => i !== index));
    };

    const total = useMemo(
        () => cart.reduce((sum, it) => sum + it.price, 0),
        [cart]
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollContainer}>
                <LinearGradient
                    colors={["#872bb8", "#311aa4"]}
                    start={{ x: 1.2, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Ionicons name="chevron-back" size={26} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Vendas</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("Dashboard")}>
                            <Ionicons name="home-outline" size={26} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.summaryRow}>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryLabelWhite}>Itens no carrinho</Text>
                            <Text style={styles.summaryValueWhite}>{cart.length}</Text>
                        </View>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryLabelWhite}>Total</Text>
                            <Text style={styles.summaryValueWhite}>
                                R$ {total.toFixed(2).replace(".", ",")}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.historicButton}
                            onPress={() => {
                                // exemplo: abrir histórico ou finalizar venda
                                navigation.navigate("SalesHistory");
                            }}
                        >
                            <Text style={[styles.historicButtonText, { color: "#7b2ff7" }]}>
                                Histórico
                            </Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>Produtos</Text>

                    <FlatList
                        data={PRODUCTS}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => (
                            <View style={styles.productCard}>
                                <View>
                                    <Text style={styles.productName}>{item.name}</Text>
                                    <Text style={styles.productPrice}>
                                        R$ {item.price.toFixed(2).replace(".", ",")}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.addButton}
                                    onPress={() => addToCart(item)}
                                >
                                    <Ionicons name="add" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}
                    />

                    <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Carrinho</Text>
                    {cart.length === 0 ? (
                        <View style={styles.emptyCart}>
                            <Text style={styles.emptyText}>Carrinho vazio</Text>
                        </View>
                    ) : (
                        <View style={styles.cartList}>
                            {cart.map((item, idx) => (
                                <View key={idx.toString()} style={styles.cartItem}>
                                    <View>
                                        <Text style={styles.cartName}>{item.name}</Text>
                                        <Text style={styles.cartPrice}>
                                            R$ {item.price.toFixed(2).replace(".", ",")}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => removeFromCart(idx)}
                                        style={styles.removeButton}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <TouchableOpacity
                                style={styles.checkoutButton}
                                onPress={() => {
                                    // ação de finalizar venda (placeholder)
                                    navigation.navigate("Checkout", { cart });
                                }}
                            >
                                <Text style={styles.checkoutText}>Finalizar venda - R$ {total.toFixed(2).replace(".", ",")}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity onPress={() => navigation.navigate("Dashboard")}>
                    <Ionicons name="home" size={32} color="#999" />
                </TouchableOpacity>
                <TouchableOpacity>
                    <Ionicons name="cart" size={32} color="#872bb8" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate("NewProduct")}>
                    <Ionicons name="add-circle-outline" size={32} color="#999" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate("Inventory")}>
                    <Ionicons name="cube" size={32} color="#999" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
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
        marginBottom: 90,
    },
    header: {
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 20,
    },
    headerTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#fff",
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    historicButton: {
        backgroundColor: "#fff",
        padding: 8,
        height: 44,
        width: 96,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    historicButtonText: {
        fontWeight: "600",
    },
    summaryBox: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        minWidth: 110,
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.12)",
    },
    summaryLabelWhite: {
        fontSize: 12,
        color: "#fff",
    },
    summaryValueWhite: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
        marginTop: 4,
    },
    content: {
        paddingHorizontal: 20,
        marginTop: 18,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
        marginBottom: 10,
    },
    productCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        elevation: 2,
    },
    productName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#222",
    },
    productPrice: {
        color: "#777",
        marginTop: 6,
    },
    addButton: {
        backgroundColor: "#872bb8",
        padding: 10,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyCart: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
        elevation: 2,
    },
    emptyText: {
        color: "#888",
    },
    cartList: {
        marginTop: 8,
    },
    cartItem: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        elevation: 1,
    },
    cartName: {
        fontWeight: "600",
        color: "#222",
    },
    cartPrice: {
        color: "#666",
        marginTop: 4,
    },
    removeButton: {
        backgroundColor: "#e74c3c",
        padding: 8,
        borderRadius: 8,
    },
    checkoutButton: {
        backgroundColor: "#7b2ff7",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 8,
    },
    checkoutText: {
        color: "#fff",
        fontWeight: "700",
    },
    footer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-around",
        padding: 16,
        backgroundColor: "#fff",
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        elevation: 10,
        height: 80,
        alignItems: "center",
    },
});