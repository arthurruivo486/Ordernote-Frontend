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
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function SaleScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sales, setSales] = useState([]);
  const [customersMap, setCustomersMap] = useState({});
  const [showModal, setShowModal] = useState(false);

  const { user, token, isAuthenticated } = useAuth();

  // Busca vendas e clientes
  const fetchData = useCallback(async () => {
    try {
      if (!isAuthenticated) {
        console.log("❌ Usuário não autenticado na tela de vendas");
        Alert.alert("Erro", "Usuário não autenticado");
        return;
      }

      setLoading(true);
      console.log("📊 Carregando vendas para usuário:", user?.id);

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
      console.error("❌ Erro ao carregar vendas:", error);
      
      let errorMessage = "Não foi possível carregar as vendas";
      
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
      console.log("⏳ Aguardando autenticação para carregar vendas");
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

  // Separar pedidos por status
  const pedidosEmAndamento = sales.filter(sale => 
    sale.status === 'pending' || sale.status === 'processing' || !sale.status
  ).slice(0, 6);

  const pedidosFinalizados = sales.filter(sale => 
    sale.status === 'paid' || sale.status === 'completed' || sale.status === 'delivered'
  ).slice(0, 6);

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

  const renderPedidosGrid = (pedidos, tipo) => {
    const rows = [];
    for (let i = 0; i < pedidos.length; i += 3) {
      const rowPedidos = pedidos.slice(i, i + 3);
      const customer = customersMap[pedidos[i]?.customer_id] || null;
      const clientName = customer
        ? customer.name
        : pedidos[i]?.customer_id ? `Cliente #${pedidos[i]?.customer_id}` : "Venda Local";

      rows.push(
        <View key={i} style={styles.pedidosRow}>
          {rowPedidos.map((pedido, index) => {
            const pedidoCustomer = customersMap[pedido.customer_id] || null;
            const pedidoClientName = pedidoCustomer
              ? pedidoCustomer.name
              : pedido.customer_id ? `Cliente #${pedido.customer_id}` : "Venda Local";

            return (
              <TouchableOpacity 
                key={pedido.id} 
                style={[
                  styles.pedidoCard,
                  tipo === 'andamento' ? styles.pedidoAndamento : styles.pedidoFinalizado
                ]}
                onPress={() => Alert.alert("Detalhes da Venda", 
                  `Cliente: ${pedidoClientName}\nValor: ${formatBRL(pedido.total_amount)}\nStatus: ${pedido.status}\nData: ${new Date(pedido.created_at).toLocaleDateString('pt-BR')}`
                )}
              >
                <View style={styles.pedidoHeader}>
                  <Text style={styles.pedidoNumero}>#{pedido.id}</Text>
                  <Ionicons 
                    name={tipo === 'andamento' ? "time-outline" : "checkmark-circle-outline"} 
                    size={16} 
                    color={tipo === 'andamento' ? "#FFA500" : "#4CAF50"} 
                  />
                </View>
                <Text style={styles.pedidoCliente} numberOfLines={1}>
                  {pedidoClientName}
                </Text>
                <Text style={styles.pedidoValor}>
                  {formatBRL(pedido.total_amount)}
                </Text>
                <Text style={styles.pedidoData}>
                  {pedido.created_at ? new Date(pedido.created_at).toLocaleDateString('pt-BR') : 'Data não disponível'}
                </Text>
              </TouchableOpacity>
            );
          })}
          {rowPedidos.length < 3 && 
            Array.from({ length: 3 - rowPedidos.length }).map((_, emptyIndex) => (
              <View key={`empty-${emptyIndex}`} style={styles.pedidoCardVazio} />
            ))
          }
        </View>
      );
    }
    return rows;
  };

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
            Faça login para acessar as vendas
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
        {/* PARTE ROXA SIMPLIFICADA */}
        <LinearGradient
          colors={["#872bb8", "#311aa4"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Text style={styles.title}>Vendas</Text>
            <Ionicons name="cart-outline" size={28} color="#fff" />
          </View>

          <View style={styles.summaryRow}>
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

          {loading && (
            <ActivityIndicator size="small" color="#fff" style={{ margin: 8 }} />
          )}
        </LinearGradient>

        {/* CONTEÚDO PRINCIPAL - BOTÕES LADO A LADO */}
        <View style={styles.salesContent}>
          <View style={styles.buttonsRow}>
            {/* Botão Nova Venda */}
            <TouchableOpacity
              style={styles.mainButton}
              onPress={() => setShowModal(true)}
            >
              <Ionicons name="add-circle-outline" size={32} color="#fff" />
              <Text style={styles.mainButtonText}>nova venda</Text>
              <Text style={styles.mainSubText}>iniciar uma venda</Text>
            </TouchableOpacity>

            {/* Botão Histórico com ícone de relógio */}
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => navigation.navigate("HistoricoVendas")}
            >
              <View style={styles.historyIconContainer}>
                <Ionicons name="time-outline" size={28} color="#7b2ff7" />
              </View>
              <Text style={styles.historyButtonText}>histórico</Text>
            </TouchableOpacity>
          </View>

          {/* SEÇÃO PEDIDOS EM ANDAMENTO */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pedidos em Andamento</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PedidosAndamento')}>
                <Text style={styles.verTodosText}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            
            {pedidosEmAndamento.length > 0 ? (
              renderPedidosGrid(pedidosEmAndamento, 'andamento')
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={40} color="#ccc" />
                <Text style={styles.emptyStateText}>Nenhum pedido em andamento</Text>
              </View>
            )}
          </View>

          {/* SEÇÃO PEDIDOS FINALIZADOS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pedidos Finalizados</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PedidosFinalizados')}>
                <Text style={styles.verTodosText}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            
            {pedidosFinalizados.length > 0 ? (
              renderPedidosGrid(pedidosFinalizados, 'finalizado')
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={40} color="#ccc" />
                <Text style={styles.emptyStateText}>Nenhum pedido finalizado</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL PARA ESCOLHER TIPO DE VENDA */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione o tipo de venda</Text>
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => {
                setShowModal(false);
                navigation.navigate('NovaVenda');
              }}
            >
              <Ionicons name="storefront-outline" size={24} color="#7b2ff7" />
              <Text style={styles.modalButtonText}>Venda Local</Text>
              <Text style={styles.modalButtonSubtext}>Venda para consumo no local</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => {
                setShowModal(false);
                navigation.navigate('NovaDelivery');
              }}
            >
              <Ionicons name="bicycle-outline" size={24} color="#7b2ff7" />
              <Text style={styles.modalButtonText}>Delivery</Text>
              <Text style={styles.modalButtonSubtext}>Entrega no endereço do cliente</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f4fc",
    marginBottom: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  // Estilos da parte roxa
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
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 10,
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
  // Estilos específicos da SalesScreen
  salesContent: {
    padding: 20,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    marginBottom: 30,
  },
  mainButton: {
    backgroundColor: "#7b2ff7",
    flex: 0.7,
    marginRight: 10,
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  mainButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
  },
  mainSubText: {
    color: "#fff",
    opacity: 0.8,
    fontSize: 12,
    marginTop: 4,
  },
  historyButton: {
    backgroundColor: "#fff",
    flex: 0.28,
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0e6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  historyButtonText: {
    color: "#7b2ff7",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  // Estilos das seções de pedidos
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  verTodosText: {
    color: "#7b2ff7",
    fontSize: 14,
    fontWeight: "500",
  },
  pedidosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pedidoCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    minHeight: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pedidoAndamento: {
    borderLeftWidth: 4,
    borderLeftColor: "#FFA500",
  },
  pedidoFinalizado: {
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  pedidoCardVazio: {
    flex: 1,
    marginHorizontal: 4,
  },
  pedidoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pedidoNumero: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
  },
  pedidoCliente: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  pedidoValor: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#7b2ff7",
    marginBottom: 4,
  },
  pedidoData: {
    fontSize: 10,
    color: "#999",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  emptyStateText: {
    marginTop: 10,
    color: "#999",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modalButton: {
    backgroundColor: '#f8f4ff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e8e0ff',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7b2ff7',
    marginTop: 8,
  },
  modalButtonSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  modalCancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  // Estilos para autenticação
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
});