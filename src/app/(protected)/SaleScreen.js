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
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import XLSX from "xlsx";

export default function SaleScreen({ navigation }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sales, setSales] = useState([]);
  const [customersMap, setCustomersMap] = useState({});
  const [showSaleTypeModal, setShowSaleTypeModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showSaleDetails, setShowSaleDetails] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Estados para filtros
  const [filters, setFilters] = useState({
    status: "all",
    dateRange: "today",
    paymentMethod: "all",
    minAmount: "",
    maxAmount: "",
  });

  const { user, token, isAuthenticated } = useAuth();

  const [saleTypes] = useState([
    {
      id: "local",
      name: "Venda Local",
      description: "Venda para consumo no local",
      icon: "storefront-outline",
      color: "#7b2ff7",
    },
    {
      id: "delivery",
      name: "Delivery",
      description: "Entrega no endereço do cliente",
      icon: "bicycle-outline",
      color: "#FF6B35",
    },
  ]);

  // Função para formatar a exibição do pedido/mesa
  const formatOrderDisplay = (sale) => {
    if (sale.sale_type === "local" && sale.table_number) {
      return `Mesa ${sale.table_number}`;
    }
    return `Pedido #${sale.id}`;
  };

  // Função para obter ícone baseado no tipo de venda
  const getSaleIcon = (sale, tipo) => {
    if (tipo === "andamento") {
      return "time-outline";
    }

    if (sale.sale_type === "delivery") {
      return "bicycle-outline";
    }

    return "checkmark-circle-outline";
  };

  // Função para obter cor do ícone baseado no tipo de venda
  const getSaleIconColor = (sale, tipo) => {
    if (tipo === "andamento") {
      return "#FFA500";
    }

    if (sale.sale_type === "delivery") {
      return "#FF6B35";
    }

    return "#4CAF50";
  };

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
        ? salesArray.filter((sale) => {
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

      console.log(
        `✅ ${sortedSales.length} vendas carregadas para o usuário ${user.id}`
      );

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

  // Função para aplicar filtros
  const applyFilters = () => {
    let filteredSales = sales;

    // Filtro por status
    if (filters.status !== "all") {
      filteredSales = filteredSales.filter(
        (sale) => sale.status === filters.status
      );
    }

    // Filtro por data
    if (filters.dateRange !== "all") {
      const today = new Date();
      filteredSales = filteredSales.filter((sale) => {
        const saleDate = new Date(sale.created_at);
        switch (filters.dateRange) {
          case "today":
            return saleDate.toDateString() === today.toDateString();
          case "week":
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return saleDate >= weekAgo;
          case "month":
            const monthAgo = new Date(
              today.getFullYear(),
              today.getMonth() - 1,
              today.getDate()
            );
            return saleDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    // Filtro por método de pagamento
    if (filters.paymentMethod !== "all") {
      filteredSales = filteredSales.filter(
        (sale) => sale.payment_method === filters.paymentMethod
      );
    }

    // Filtro por valor
    if (filters.minAmount) {
      filteredSales = filteredSales.filter(
        (sale) => sale.total_amount >= parseFloat(filters.minAmount)
      );
    }
    if (filters.maxAmount) {
      filteredSales = filteredSales.filter(
        (sale) => sale.total_amount <= parseFloat(filters.maxAmount)
      );
    }

    return filteredSales;
  };

  const filteredSales = applyFilters();

  // Separar pedidos por status (usando vendas filtradas)
  const pedidosEmAndamento = filteredSales
    .filter(
      (sale) =>
        sale.status === "pending" ||
        sale.status === "processing" ||
        !sale.status
    )
    .slice(0, 6);

  const pedidosFinalizados = filteredSales
    .filter(
      (sale) =>
        sale.status === "paid" ||
        sale.status === "completed" ||
        sale.status === "delivered"
    )
    .slice(0, 6);

  // Função para finalizar uma venda pendente
  const finalizarVendaPendente = async (sale) => {
    try {
      console.log("💰 Finalizando venda:", sale.id);

      const updateData = {
        status: "paid",
        payment_method: sale.payment_method || "cash",
      };

      const response = await api.patch(`/sales/${sale.id}`, updateData);

      if (response.data) {
        console.log("✅ Venda finalizada com sucesso:", response.data);

        // Atualizar a lista local
        setSales((prevSales) =>
          prevSales.map((s) =>
            s.id === sale.id
              ? { ...s, status: "paid", updated_at: new Date().toISOString() }
              : s
          )
        );

        setShowSaleDetails(false);
        Alert.alert("Sucesso", "Venda finalizada com sucesso!");
      }
    } catch (error) {
      console.error("❌ Erro ao finalizar venda:", error);
      Alert.alert("Erro", "Não foi possível finalizar a venda.");
    }
  };

  // Função para editar uma venda pendente
  const editarVendaPendente = (sale) => {
    setSelectedSale(sale);
    setShowSaleDetails(false);
    // Navegar para tela de edição (podemos reutilizar a NovaVendaScreen com dados)
    navigation.navigate("EditarVenda", { sale });
  };

  // Função para visualizar detalhes da venda
  const verDetalhesVenda = (sale) => {
    setSelectedSale(sale);
    setShowSaleDetails(true);
  };

  // Função para lidar com a seleção do tipo de venda
  const handleSaleTypeSelect = (saleType) => {
    setShowSaleTypeModal(false);

    switch (saleType.id) {
      case "local":
        navigation.navigate("NovaVenda", { saleType: "local" });
        break;
      case "delivery":
        navigation.navigate("NovaDelivery", { saleType: "delivery" });
        break;
      default:
        // Fallback para venda local caso haja algum problema
        navigation.navigate("NovaVenda", { saleType: "local" });
    }
  };

  // FUNÇÃO PARA GERAR RELATÓRIO XLSX
  const gerarRelatorio = async (tipo) => {
    try {
      setModalVisible(false);
      Alert.alert("Gerando Relatório", "Aguarde...");

      if (!sales || sales.length === 0) {
        Alert.alert("Aviso", "Nenhuma venda registrada.");
        return;
      }

      // --------------------------
      // DEFINIÇÃO DO PERÍODO
      // --------------------------
      const hoje = new Date();
      let startDate = new Date(0);
      let endDate = new Date();

      switch (tipo) {
        case "dia":
          startDate = new Date(hoje);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(hoje);
          endDate.setHours(23, 59, 59, 999);
          break;

        case "semana":
          startDate = new Date(hoje);
          startDate.setDate(hoje.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(hoje);
          endDate.setHours(23, 59, 59, 999);
          break;

        case "mes":
          startDate = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
      }

      // --------------------------
      // FILTRAGEM DAS VENDAS
      // --------------------------
      const vendasFiltradas = sales.filter((v) => {
        if (!v.created_at) return false;
        const data = new Date(v.created_at);
        return data >= startDate && data <= endDate;
      });

      if (vendasFiltradas.length === 0) {
        Alert.alert(
          "Aviso",
          "Nenhuma venda encontrada no período selecionado."
        );
        return;
      }

      // --------------------------
      // TOTALIZAÇÃO
      // --------------------------
      const total = vendasFiltradas.reduce(
        (acc, v) => acc + Number(v.total_amount || 0),
        0
      );

      // --------------------------
      // MONTAGEM DA PLANILHA
      // --------------------------
      const dados = vendasFiltradas.map((v) => {
        const customer = customersMap?.[v.customer_id] || null;

        const nomeCliente = customer
          ? customer.name
          : v.customer_id
          ? `Cliente #${v.customer_id}`
          : "Venda Local";

        return {
          ID: v.id ?? "-",
          "Número/Mesa":
            v.sale_type === "local" && v.table_number
              ? `Mesa ${v.table_number}`
              : `Pedido #${v.id}`,
          "Tipo Venda": v.sale_type === "local" ? "Local" : "Delivery",
          Data: v.created_at
            ? new Date(v.created_at).toLocaleString("pt-BR")
            : "N/A",
          Cliente: nomeCliente,
          Status:
            v.status === "paid"
              ? "Pago"
              : v.status === "pending"
              ? "Pendente"
              : v.status === "cancelled"
              ? "Cancelado"
              : "Outro",
          "Método Pagamento":
            v.payment_method === "cash"
              ? "Dinheiro"
              : v.payment_method === "card"
              ? "Cartão"
              : v.payment_method === "pix"
              ? "PIX"
              : "Outro",
          Valor: Number(v.total_amount || 0),
        };
      });

      // Linha final com TOTAL
      dados.push({
        ID: "",
        "Número/Mesa": "",
        "Tipo Venda": "",
        Data: "",
        Cliente: "TOTAL",
        Status: "",
        "Método Pagamento": "",
        Valor: total,
      });

      // --------------------------
      // CRIAÇÃO DA PLANILHA XLSX
      // --------------------------
      const ws = XLSX.utils.json_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Relatório");

      const wbout = XLSX.write(wb, {
        type: "base64",
        bookType: "xlsx",
      });

      // --------------------------
      // SALVANDO O ARQUIVO
      // --------------------------
      const fileName = `relatorio_vendas_${tipo}_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;

      const path = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(path, wbout, {
        encoding: "base64",
      });

      // --------------------------
      // COMPARTILHAR O ARQUIVO
      // --------------------------
      await Sharing.shareAsync(path, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Salvar Relatório de Vendas",
      });

      Alert.alert("Sucesso!", "Relatório gerado com sucesso!");
    } catch (error) {
      console.log("Erro ao gerar relatório:", error);
      Alert.alert(
        "Erro",
        "Ocorreu um problema ao gerar o relatório. Tente novamente."
      );
    }
  };

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

    rows.push(
      <View key={i} style={styles.pedidosRow}>
        {rowPedidos.map((pedido) => {
          const pedidoCustomer = customersMap[pedido.customer_id] || null;
          const pedidoClientName = pedidoCustomer
            ? pedidoCustomer.name
            : pedido.customer_id
            ? `Cliente #${pedido.customer_id}`
            : "Venda Local";

          return (
            <TouchableOpacity
              key={pedido.id}
              style={[
                styles.pedidoCard,
                tipo === "andamento"
                  ? styles.pedidoAndamento
                  : pedido.sale_type === "delivery"
                  ? styles.pedidoDelivery
                  : styles.pedidoFinalizado,
              ]}
              onPress={() => verDetalhesVenda(pedido)}
            >
              {/* CABEÇALHO DO PEDIDO - ESTILO UNIFICADO */}
              <View style={styles.pedidoHeader}>
                <View style={styles.pedidoTitleContainer}>
                  <Text style={styles.pedidoNumero}>
                    {formatOrderDisplay(pedido)}
                  </Text>
                  
                </View>
                <Ionicons
                  name={getSaleIcon(pedido, tipo)}
                  size={18}
                  color={getSaleIconColor(pedido, tipo)}
                />
              </View>
              
              <Text style={styles.pedidoCliente} numberOfLines={1}>
                {pedidoClientName}
              </Text>
              <Text style={styles.pedidoValor}>
                {formatBRL(pedido.total_amount)}
              </Text>
              <Text style={styles.pedidoData}>
                {pedido.created_at
                  ? new Date(pedido.created_at).toLocaleDateString("pt-BR")
                  : "Data não disponível"}
              </Text>
            </TouchableOpacity>
          );
        })}
        {rowPedidos.length < 3 &&
          Array.from({ length: 3 - rowPedidos.length }).map(
            (_, emptyIndex) => (
              <View
                key={`empty-${emptyIndex}`}
                style={styles.pedidoCardVazio}
              />
            )
          )}
      </View>
    );
  }
  return rows;
};

  // Modal de seleção de tipo de venda
  const renderSaleTypeModal = () => (
    <Modal
      visible={showSaleTypeModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowSaleTypeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecione o tipo de venda</Text>
            <TouchableOpacity
              onPress={() => setShowSaleTypeModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.saleTypesContainer}>
            {saleTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.saleTypeButton, { borderLeftColor: type.color }]}
                onPress={() => handleSaleTypeSelect(type)}
              >
                <View style={styles.saleTypeIconContainer}>
                  <Ionicons name={type.icon} size={28} color={type.color} />
                </View>
                <View style={styles.saleTypeInfo}>
                  <Text style={styles.saleTypeName}>{type.name}</Text>
                  <Text style={styles.saleTypeDescription}>
                    {type.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowSaleTypeModal(false)}
          >
            <Text style={styles.modalCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Modal de detalhes da venda
  const renderSaleDetailsModal = () => {
    if (!selectedSale) return null;

    const customer = customersMap[selectedSale.customer_id] || null;
    const clientName = customer
      ? customer.name
      : selectedSale.customer_id
      ? `Cliente #${selectedSale.customer_id}`
      : "Venda Local";

    const isPending = selectedSale.status === "pending";

    return (
      <Modal
        visible={showSaleDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSaleDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isPending ? "Venda Pendente" : "Venda Finalizada"}
              </Text>
              <TouchableOpacity onPress={() => setShowSaleDetails(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>
                  {selectedSale.sale_type === "local" &&
                  selectedSale.table_number
                    ? "Número da Mesa:"
                    : "Número do Pedido:"}
                </Text>
                <Text style={styles.detailValue}>
                  {selectedSale.sale_type === "local" &&
                  selectedSale.table_number
                    ? `Mesa ${selectedSale.table_number}`
                    : `#${selectedSale.id}`}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Tipo de Venda:</Text>
                <Text style={styles.detailValue}>
                  {selectedSale.sale_type === "local"
                    ? "Venda Local"
                    : "Delivery"}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Cliente:</Text>
                <Text style={styles.detailValue}>{clientName}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Valor Total:</Text>
                <Text style={styles.detailValue}>
                  {formatBRL(selectedSale.total_amount)}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View
                  style={[
                    styles.statusBadge,
                    isPending ? styles.statusPending : styles.statusPaid,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {isPending ? "PENDENTE" : "FINALIZADA"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Data de Criação:</Text>
                <Text style={styles.detailValue}>
                  {selectedSale.created_at
                    ? new Date(selectedSale.created_at).toLocaleString("pt-BR")
                    : "N/A"}
                </Text>
              </View>

              {selectedSale.payment_method && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Forma de Pagamento:</Text>
                  <Text style={styles.detailValue}>
                    {selectedSale.payment_method === "cash"
                      ? "Dinheiro"
                      : selectedSale.payment_method === "card"
                      ? "Cartão"
                      : selectedSale.payment_method === "pix"
                      ? "PIX"
                      : selectedSale.payment_method}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {isPending ? (
                <>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.editButton]}
                    onPress={() => editarVendaPendente(selectedSale)}
                  >
                    <Ionicons name="pencil-outline" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Editar Venda</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.finalizeButton]}
                    onPress={() => finalizarVendaPendente(selectedSale)}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.modalButtonText}>Finalizar Venda</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.modalButton, styles.closeButton]}
                  onPress={() => setShowSaleDetails(false)}
                >
                  <Text style={styles.modalButtonText}>Fechar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Modal de filtros (histórico)
  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtrar Vendas</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            {/* Filtro de Status */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: "all", label: "Todos" },
                  { value: "pending", label: "Pendentes" },
                  { value: "paid", label: "Pagos" },
                  { value: "cancelled", label: "Cancelados" },
                ].map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.filterOption,
                      filters.status === status.value &&
                        styles.filterOptionSelected,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({ ...prev, status: status.value }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.status === status.value &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filtro de Período */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Período</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: "all", label: "Todos" },
                  { value: "today", label: "Hoje" },
                  { value: "week", label: "Esta semana" },
                  { value: "month", label: "Este mês" },
                ].map((period) => (
                  <TouchableOpacity
                    key={period.value}
                    style={[
                      styles.filterOption,
                      filters.dateRange === period.value &&
                        styles.filterOptionSelected,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        dateRange: period.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.dateRange === period.value &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      {period.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filtro de Método de Pagamento */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Método de Pagamento</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: "all", label: "Todos" },
                  { value: "cash", label: "Dinheiro" },
                  { value: "card", label: "Cartão" },
                  { value: "pix", label: "PIX" },
                ].map((method) => (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.filterOption,
                      filters.paymentMethod === method.value &&
                        styles.filterOptionSelected,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        paymentMethod: method.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.paymentMethod === method.value &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filtro por Tipo de Venda */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Tipo de Venda</Text>
              <View style={styles.filterOptions}>
                {[
                  { value: "all", label: "Todos" },
                  { value: "local", label: "Local" },
                  { value: "delivery", label: "Delivery" },
                ].map((saleType) => (
                  <TouchableOpacity
                    key={saleType.value}
                    style={[
                      styles.filterOption,
                      filters.saleType === saleType.value &&
                        styles.filterOptionSelected,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        saleType: saleType.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.saleType === saleType.value &&
                          styles.filterOptionTextSelected,
                      ]}
                    >
                      {saleType.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={[styles.filterButton, styles.clearButton]}
              onPress={() =>
                setFilters({
                  status: "all",
                  dateRange: "today",
                  paymentMethod: "all",
                  saleType: "all",
                  minAmount: "",
                  maxAmount: "",
                })
              }
            >
              <Text style={styles.clearButtonText}>Limpar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, styles.applyButton]}
              onPress={() => {
                setFilterModalVisible(false);
              }}
            >
              <Text style={styles.applyButtonText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Modal de seleção de relatório
  const renderReportModal = () => (
    <Modal visible={modalVisible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>Escolher Tipo de Relatório</Text>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => gerarRelatorio("dia")}
          >
            <Text style={styles.modalButtonText}>Do Dia</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => gerarRelatorio("semana")}
          >
            <Text style={styles.modalButtonText}>Da Semana</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalButton}
            onPress={() => gerarRelatorio("mes")}
          >
            <Text style={styles.modalButtonText}>Do Mês</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: "#aaa" }]}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.modalButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
            onPress={() => navigation.navigate("Login")}
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
        {/* HEADER */}
        <LinearGradient
          colors={["#872bb8", "#311aa4"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Text style={styles.title}>Vendas</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.statsButton}
                onPress={() => navigation.navigate("VendasStats")}
              >
                <Ionicons name="stats-chart" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
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
            <ActivityIndicator
              size="small"
              color="#fff"
              style={{ margin: 8 }}
            />
          )}
        </LinearGradient>

        {/* CONTEÚDO PRINCIPAL */}
        <View style={styles.salesContent}>
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={styles.mainButton}
              onPress={() => setShowSaleTypeModal(true)}
            >
              <Ionicons name="add-circle-outline" size={32} color="#fff" />
              <Text style={styles.mainButtonText}>nova venda</Text>
              <Text style={styles.mainSubText}>iniciar uma venda</Text>
            </TouchableOpacity>

            {/* BOTÃO DE HISTÓRICO AGORA ABRE MODAL DE FILTROS */}
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => setFilterModalVisible(true)}
            >
              <View style={styles.historyIconContainer}>
                <Ionicons name="time-outline" size={28} color="#7b2ff7" />
              </View>
              <Text style={styles.historyButtonText}>Filtrar</Text>
            </TouchableOpacity>
          </View>

          {/* BOTÃO DE RELATÓRIO */}
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => setModalVisible(true)}
          >
            <View style={styles.reportIconContainer}>
              <Ionicons
                name="document-text-outline"
                size={24}
                color="#7b2ff7"
              />
            </View>
            <Text style={styles.reportButtonText}>Relatório</Text>
          </TouchableOpacity>

          {/* SEÇÃO PEDIDOS EM ANDAMENTO */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pedidos em Andamento</Text>
              <Text style={styles.pedidosCount}>
                ({pedidosEmAndamento.length})
              </Text>
            </View>

            {pedidosEmAndamento.length > 0 ? (
              renderPedidosGrid(pedidosEmAndamento, "andamento")
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={40} color="#ccc" />
                <Text style={styles.emptyStateText}>
                  Nenhum pedido em andamento
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Clique em "Nova Venda" para começar
                </Text>
              </View>
            )}
          </View>

          {/* SEÇÃO PEDIDOS FINALIZADOS */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pedidos Finalizados</Text>
              <Text style={styles.pedidosCount}>
                ({pedidosFinalizados.length})
              </Text>
            </View>

            {pedidosFinalizados.length > 0 ? (
              renderPedidosGrid(pedidosFinalizados, "finalizado")
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={40}
                  color="#ccc"
                />
                <Text style={styles.emptyStateText}>
                  Nenhum pedido finalizado
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL PARA ESCOLHER TIPO DE VENDA */}
      {renderSaleTypeModal()}

      {/* MODAL DE DETALHES DA VENDA */}
      {renderSaleDetailsModal()}

      {/* MODAL DE FILTROS (HISTÓRICO) */}
      {renderFilterModal()}

      {/* MODAL DE RELATÓRIO */}
      {renderReportModal()}
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsButton: {
    padding: 8,
    marginLeft: 5,
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
    marginBottom: 20,
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
  // Botão de relatório
  reportButton: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0e6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reportButtonText: {
    color: "#7b2ff7",
    fontSize: 16,
    fontWeight: "bold",
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
  pedidosCount: {
    fontSize: 14,
    color: "#666",
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
  pedidoDelivery: {
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
  },
  pedidoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // Alinhar no topo
    marginBottom: 8,
  },
  pedidoTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexWrap: "wrap",
  },
  pedidoNumero: {
    fontSize: 14, // Aumentado de 12 para 14
    fontWeight: "bold",
    color: "#333", // Mudado de #666 para #333 para melhor contraste
    marginRight: 8,
  },
  deliveryBadge: {
    backgroundColor: "#FF6B35",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  deliveryBadgeText: {
    fontSize: 8, // Reduzido para caber melhor
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 2,
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
  pedidoCardVazio: {
    flex: 1,
    marginHorizontal: 4,
  },
  pedidoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingRight: 40, // Adicione esta linha para criar espaço para os badges
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
  pedidoTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  deliveryBadge: {
    backgroundColor: "#FF6B35",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },

  deliveryBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 2,
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
  emptyStateSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  saleTypesContainer: {
    maxHeight: 400,
  },
  saleTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  saleTypeIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f8f4ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  saleTypeInfo: {
    flex: 1,
  },
  saleTypeName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  saleTypeDescription: {
    fontSize: 12,
    color: "#666",
  },
  modalCancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  modalBody: {
    maxHeight: 400,
  },
  detailSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: "#FFF3CD",
  },
  statusPaid: {
    backgroundColor: "#D1ECF1",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  editButton: {
    backgroundColor: "#FFA500",
  },
  finalizeButton: {
    backgroundColor: "#4CAF50",
  },
  closeButton: {
    backgroundColor: "#7b2ff7",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
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
  // Estilos para filtros
  filterModalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  filterContent: {
    maxHeight: 400,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionSelected: {
    backgroundColor: "#7b2ff7",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#666",
  },
  filterOptionTextSelected: {
    color: "#fff",
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 16,
  },
  filterButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  clearButton: {
    backgroundColor: "#f5f5f5",
  },
  applyButton: {
    backgroundColor: "#7b2ff7",
  },
  clearButtonText: {
    color: "#666",
    fontWeight: "bold",
  },
  applyButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  // Estilos para modal de relatório
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "80%",
  },
  modalButton: {
    backgroundColor: "#7b2ff7",
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
});
