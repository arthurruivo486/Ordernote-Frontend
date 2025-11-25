import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sales, setSales] = useState([]);
  const [customersMap, setCustomersMap] = useState({});

  const { user, token, isAuthenticated } = useAuth();

  // ✅ FUNÇÃO PARA TRADUZIR MÉTODO DE PAGAMENTO
  const traduzirMetodoPagamento = (method) => {
    const methods = {
      'cash': 'Dinheiro',
      'card': 'Cartão',
      'pix': 'PIX',
      'dinheiro': 'Dinheiro',
      'cartao': 'Cartão'
    };
    return methods[method] || method;
  };

  const fetchData = useCallback(async () => {
    try {
      if (!isAuthenticated) {
        console.log("❌ Usuário não autenticado no dashboard");
        Alert.alert("Erro", "Usuário não autenticado");
        return;
      }

      setLoading(true);
      console.log("📊 Carregando dashboard para usuário:", user?.id);

      const salesResponse = await api.get("/sales");
      
      if (salesResponse.data) {
        console.log("✅ Vendas carregadas:", salesResponse.data);
      }

      let salesArray = [];
      const salesData = salesResponse.data;

      if (Array.isArray(salesData)) {
        salesArray = salesData;
      } else if (salesData && Array.isArray(salesData.sales)) {
        salesArray = salesData.sales;
      } else {
        console.warn("Estrutura da resposta não reconhecida:", salesData);
        salesArray = [];
      }

      const custResponse = await api.get("/customers");
      
      if (custResponse.data) {
        console.log("✅ Clientes carregados:", custResponse.data);
      }

      const cmap = {};
      const custData = custResponse.data;
      const customersArray = Array.isArray(custData)
        ? custData
        : custData && Array.isArray(custData.data)
        ? custData.data
        : custData && Array.isArray(custData.customers)
        ? custData.customers
        : [];

      customersArray.forEach((c) => {
        if (c && c.id) {
          cmap[c.id] = c;
        }
      });

      const userSales = Array.isArray(salesArray)
        ? salesArray.filter(sale => {
            if (sale.user_id) {
              return sale.user_id === user.id;
            }
            return true;
          })
        : [];

      const sortedSales = userSales.slice().sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });

      console.log(`✅ ${sortedSales.length} vendas carregadas para o usuário ${user.id}`);
      
      setSales(sortedSales);
      setCustomersMap(cmap);
    } catch (error) {
      console.error("❌ Erro ao carregar dashboard:", error);
      
      let errorMessage = "Não foi possível carregar o dashboard";
      
      if (error.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Erro", errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      console.log("⏳ Aguardando autenticação para carregar dashboard");
      setLoading(false);
    }
  }, [fetchData, isAuthenticated]);

  const onRefresh = useCallback(() => {
    if (!isAuthenticated) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }
    setRefreshing(true);
    fetchData();
  }, [fetchData, isAuthenticated]);

  const formatBRL = (value) => {
    const n = Number(value || 0);
    try {
      return n.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    } catch (e) {
      return `R$ ${n.toFixed(2)}`;
    }
  };

  // ✅ FUNÇÃO PARA NAVEGAR PARA PEDIDOS PENDENTES
  const navigateToPendingOrders = () => {
    navigation.navigate("Vendas", { 
      screen: "VendasMain",
      params: { 
        initialFilter: "pending" 
      }
    });
  };

  const recentSales = sales.slice(0, 6);

  // ✅ CONTADOR DE PEDIDOS PENDENTES PARA O BADGE
  const pendingOrdersCount = sales.filter(sale => 
    sale.status === "pending" || 
    sale.status === "processing" || 
    !sale.status
  ).length;

  if (loading && !isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7b2ff7" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <Ionicons name="lock-closed" size={64} color="#7b2ff7" />
          <Text style={styles.authTitle}>Acesso Restrito</Text>
          <Text style={styles.authMessage}>
            Faça login para acessar o dashboard
          </Text>
          <TouchableOpacity 
            style={styles.authButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.authButtonText}>Fazer Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            enabled={isAuthenticated}
          />
        }
      >
        <LinearGradient
          colors={["#872bb8", "#311aa4"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Inicio</Text>
              <Text style={styles.userWelcome}>Olá, {user?.name}!</Text>
            </View>
            <Ionicons name="cart-outline" size={28} color="#fff" />
          </View>

          <Text style={styles.sectionTitleWhite}>vendas recentes</Text>

          {loading ? (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={{ margin: 8 }}
            />
          ) : (
            <View style={styles.recentContainer}>
              {recentSales.length === 0 ? (
                <View style={styles.emptyRecent}>
                  <Text style={{ color: "#fff", textAlign: "center" }}>
                    Nenhuma venda recente
                  </Text>
                  <Text
                    style={{
                      color: "#fff",
                      opacity: 0.7,
                      fontSize: 12,
                      marginTop: 5,
                    }}
                  >
                    Suas vendas aparecerão aqui
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons
                    name="chevron-back-circle"
                    size={32}
                    color="#ffffffaa"
                    style={{ alignSelf: "center", marginRight: 10 }}
                  />

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.recentScrollContent}
                  >
                    {recentSales.map((s) => {
                      if (!s) return null;
                      const c = customersMap[s.customer_id] || null;
                      const clientName = c ? c.name : s.customer_id ? `Cliente #${s.customer_id}` : "Venda Local";

                      return (
                        <View key={s.id} style={styles.recentCardNEW}>
                          <Text style={styles.recentCardName}>{clientName}</Text>
                          <Text style={styles.recentCardPrice}>{formatBRL(s.total_amount)}</Text>
                          {/* ✅ ATUALIZADO: Mostrar método de pagamento em português */}
                          <Text style={styles.recentCardMethod}>
                            {traduzirMetodoPagamento(s.payment_method)}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>

                  <Ionicons
                    name="chevron-forward-circle"
                    size={32}
                    color="#ffffffaa"
                    style={{ alignSelf: "center", marginLeft: 10 }}
                  />
                </>
              )}
            </View>
          )}
        </LinearGradient>

        <TouchableOpacity
          style={styles.mainButton}
          onPress={() => navigation.navigate("Vendas")}
        >
          <Text style={styles.mainButtonText}>fazer venda</Text>
          <Text style={styles.mainSubText}>crie uma venda já</Text>
        </TouchableOpacity>

        <View style={styles.menuGrid}>
          {/* ✅ CORRIGIDO: Agora navega para a tela correta */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => navigation.navigate("ProductScreen")}
          >
            <Ionicons name="cube-outline" size={30} color="#00bcd4" />
            <Text style={styles.menuText}>Novo Produto</Text>
          </TouchableOpacity>

          {/* ✅ CORRIGIDO: Agora navega para a tela correta */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => navigation.navigate("UserScreen")}
          >
            <Ionicons name="settings-outline" size={30} color="#ff9800" />
            <Text style={styles.menuText}>Configurações</Text>
          </TouchableOpacity>

          {/* ✅ ATUALIZADO: Botão para Pedidos Pendentes com badge */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={navigateToPendingOrders}
          >
            <View style={styles.pedidosPendentesContainer}>
              <Ionicons name="time-outline" size={30} color="#e91e63" />
              {pendingOrdersCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingOrdersCount > 9 ? '9+' : pendingOrdersCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.menuText}>Pedidos Pendentes</Text>
          </TouchableOpacity>

          {/* ✅ CORRIGIDO: Agora navega para a tela correta */}
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => navigation.navigate("CustomerScreen")}
          >
            <Ionicons name="person-add-outline" size={30} color="#18d467" />
            <Text style={styles.menuText}>Cadastrar Cliente</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#7b2ff7",
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  authMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  authButton: {
    backgroundColor: "#7b2ff7",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  authButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  userWelcome: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.8,
    marginTop: 4,
  },
  sectionTitleWhite: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  recentContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  recentScrollContent: {
    paddingVertical: 10,
  },
  emptyRecent: {
    padding: 20,
    alignItems: 'center',
    flex: 1,
  },
  recentCardNEW: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginRight: 12,
    minWidth: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  recentCardName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#5c1fa8",
    marginBottom: 6,
  },
  recentCardPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5c1fa8",
    marginBottom: 4,
  },
  recentCardMethod: {
    fontSize: 13,
    color: "#5c1fa8",
    opacity: 0.8,
  },
  mainButton: {
    backgroundColor: "#7b2ff7",
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  mainButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  mainSubText: {
    color: "#fff",
    opacity: 0.8,
    fontSize: 14,
    marginTop: 4,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },
  menuCard: {
    backgroundColor: "#fff",
    width: "48%",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  menuText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  // ✅ NOVOS ESTILOS PARA O BADGE DE PEDIDOS PENDENTES
  pedidosPendentesContainer: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#e91e63",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
});