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
import { useAuth } from "../../context/AuthContext"; // ← Import do contexto
import api from "../../services/api"; // ← Import da API configurada

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sales, setSales] = useState([]);
  const [customersMap, setCustomersMap] = useState({});

  // ✅ Usar o contexto de autenticação
  const { user, token, isAuthenticated } = useAuth();

  // Busca vendas e clientes e monta o mapa de customers
  const fetchData = useCallback(async () => {
    try {
      // ✅ Verificar autenticação antes de fazer requisições
      if (!isAuthenticated) {
        console.log("❌ Usuário não autenticado no dashboard");
        Alert.alert("Erro", "Usuário não autenticado");
        return;
      }

      setLoading(true);
      console.log("📊 Carregando dashboard para usuário:", user?.id);

      // ✅ Buscar vendas usando a API configurada (já com token)
      const salesResponse = await api.get("/sales");
      
      if (salesResponse.data) {
        console.log("✅ Vendas carregadas:", salesResponse.data);
      }

      // CORREÇÃO: Tratamento mais seguro dos dados
      let salesArray = [];
      const salesData = salesResponse.data;

      if (Array.isArray(salesData)) {
        // Se o backend devolve um array diretamente
        salesArray = salesData;
      } else if (salesData && Array.isArray(salesData.sales)) {
        // Se o backend devolve { sales: [...] }
        salesArray = salesData.sales;
      } else {
        console.warn("Estrutura da resposta não reconhecida:", salesData);
        salesArray = [];
      }

      // ✅ Buscar clientes usando a API configurada (já com token)
      const custResponse = await api.get("/customers");
      
      if (custResponse.data) {
        console.log("✅ Clientes carregados:", custResponse.data);
      }

      // montar mapa id -> cliente
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

      // ✅ Filtrar vendas apenas do usuário logado (se o backend não filtrar)
      const userSales = Array.isArray(salesArray)
        ? salesArray.filter(sale => {
            // Se a venda tem user_id, filtrar apenas as do usuário logado
            if (sale.user_id) {
              return sale.user_id === user.id;
            }
            // Se não tem user_id, mostrar todas (para compatibilidade)
            return true;
          })
        : [];

      // ordenar vendas por data desc
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
  }, [isAuthenticated, user]); // ← Dependências atualizadas

  useEffect(() => {
    // ✅ Só carregar dados se estiver autenticado
    if (isAuthenticated) {
      fetchData();
    } else {
      console.log("⏳ Aguardando autenticação para carregar dashboard");
      setLoading(false);
    }
  }, [fetchData, isAuthenticated]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    if (!isAuthenticated) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }
    setRefreshing(true);
    fetchData();
  }, [fetchData, isAuthenticated]);

  // util: formata BRL
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

  // Calcula total e contagem do dia (compara YYYY-MM-DD)
  const todayISO = new Date().toISOString().slice(0, 10);
  const salesToday = sales.filter((s) => {
    if (!s || !s.created_at) return false;
    const d = s.created_at.slice(0, 10);
    return d === todayISO;
  });
  const totalToday = salesToday.reduce(
    (acc, s) => acc + Number(s.total_amount || 0),
    0
  );

  // recentes: 6 primeiros da lista (já ordenada)
  const recentSales = sales.slice(0, 6);

  // ✅ Mostrar loading enquanto verifica autenticação
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

  // ✅ Mostrar mensagem se não estiver autenticado
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
            enabled={isAuthenticated} // ← Só permite refresh se autenticado
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
              <Text style={styles.title}>Dashboard</Text>
              <Text style={styles.userWelcome}>Olá, {user?.name}!</Text>
            </View>
            <Ionicons name="cart-outline" size={28} color="#fff" />
          </View>

          <View style={styles.summaryRow}>
            <TouchableOpacity
              style={styles.historicButton}
              onPress={() => navigation.navigate("Vendas")}
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
                {formatBRL(totalToday)}
              </Text>
            </View>

            <View style={styles.summaryBox}>
              <Text style={[styles.summaryLabel, { color: "#fff" }]}>
                vendas hoje
              </Text>
              <Text style={[styles.summaryValue, { color: "#fff" }]}>
                {salesToday.length}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitleWhite}>vendas recentes</Text>

          {loading ? (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={{ margin: 8 }}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentRow}
            >
              {recentSales.length === 0 ? (
                <View style={styles.emptyRecent}>
                  <Text style={{ color: "#fff", textAlign: 'center' }}>
                    Nenhuma venda recente
                  </Text>
                  <Text style={{ color: "#fff", opacity: 0.7, fontSize: 12, marginTop: 5 }}>
                    Suas vendas aparecerão aqui
                  </Text>
                </View>
              ) : (
                recentSales.map((s) => {
                  if (!s) return null;
                  const c = customersMap[s.customer_id] || null;
                  const clientName = c
                    ? c.name
                    : s.customer_id ? `Cliente #${s.customer_id}` : "Venda Local";
                  const phone = c ? c.phone : "";
                  return (
                    <View key={s.id} style={styles.recentCard}>
                      <Text style={styles.client} numberOfLines={1}>
                        {clientName}
                      </Text>
                      {phone ? (
                        <Text style={styles.phone} numberOfLines={1}>
                          {phone}
                        </Text>
                      ) : null}
                      <Text style={styles.amount}>
                        {formatBRL(s.total_amount)}
                      </Text>
                      <Text style={styles.saleDate}>
                        {s.created_at
                          ? new Date(s.created_at).toLocaleDateString('pt-BR')
                          : ""}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
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
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => navigation.navigate("Produtos")}
          >
            <Ionicons name="cube-outline" size={30} color="#00bcd4" />
            <Text style={styles.menuText}>Novo Produto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => navigation.navigate("Configurações")}
          >
            <Ionicons name="settings-outline" size={30} color="#ff9800" />
            <Text style={styles.menuText}>Configurações</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => navigation.navigate("PedidosPendentes")}
          >
            <Ionicons name="time-outline" size={30} color="#e91e63" />
            <Text style={styles.menuText}>Pedidos Pendentes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => navigation.navigate("Clientes")}
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

// ✅ ESTILOS ATUALIZADOS
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
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  historicButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  historicButtonText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  summaryBox: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  sectionTitleWhite: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  recentRow: {
    paddingVertical: 10,
  },
  emptyRecent: {
    padding: 20,
    alignItems: 'center',
  },
  recentCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 140,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  client: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 4,
  },
  phone: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  amount: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#7b2ff7",
  },
  saleDate: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
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
  },
  menuText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});