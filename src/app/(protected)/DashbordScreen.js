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

const API_BASE = "https://h8gt5rj4-3000.brs.devtunnels.ms/api";

export default function DashboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sales, setSales] = useState([]);
  const [customersMap, setCustomersMap] = useState({});

  // Busca vendas e clientes e monta o mapa de customers
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Buscar vendas - com tratamento mais robusto
      const salesRes = await fetch(`${API_BASE}/sale`);
      if (!salesRes.ok) throw new Error(`Erro vendas: ${salesRes.status}`);
      const salesData = await salesRes.json();

      console.log("Resposta da API de vendas:", salesData); // Para debug

      // CORREÇÃO: Tratamento mais seguro dos dados
      let salesArray = [];

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

      // Buscar clientes (para exibir nome/telefone)
      const custRes = await fetch(`${API_BASE}/customers`);
      if (!custRes.ok) throw new Error(`Erro clientes: ${custRes.status}`);
      const custData = await custRes.json();

      // montar mapa id -> cliente
      const cmap = {};
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

      // ordenar vendas por data desc (apenas se salesArray for array)
      const sortedSales = Array.isArray(salesArray)
        ? salesArray.slice().sort((a, b) => {
            const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
            const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
            return tb - ta;
          })
        : [];

      setSales(sortedSales);
      setCustomersMap(cmap);
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
      Alert.alert(
        "Erro",
        `Não foi possível carregar o dashboard: ${err.message}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

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

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient
          colors={["#872bb8", "#311aa4"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Text style={styles.title}>Dashboard</Text>
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

          <Text style={styles.sectionTitleWhite}>recente</Text>

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
                <View style={{ padding: 10 }}>
                  <Text style={{ color: "#fff" }}>Nenhuma venda recente</Text>
                </View>
              ) : (
                recentSales.map((s) => {
                  if (!s) return null;
                  const c = customersMap[s.customer_id] || null;
                  const clientName = c
                    ? c.name
                    : `Cliente #${s.customer_id || "—"}`;
                  const phone = c ? c.phone : "";
                  return (
                    <View key={s.id} style={styles.recentCard}>
                      <Text style={styles.client}>{clientName}</Text>
                      {phone ? <Text style={styles.phone}>{phone}</Text> : null}
                      <Text style={styles.amount}>
                        {formatBRL(s.total_amount)}
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: "#666", marginTop: 6 }}
                      >
                        {s.created_at
                          ? new Date(s.created_at).toLocaleString()
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

// Adicione os estilos que faltam
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f4fc",
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
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
