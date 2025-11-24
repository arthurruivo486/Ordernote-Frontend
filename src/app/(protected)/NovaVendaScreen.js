import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function NovaVendaScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [clienteId, setClienteId] = useState(null);
  const [tableNumber, setTableNumber] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [showClientesModal, setShowClientesModal] = useState(false);
  const [showProdutosModal, setShowProdutosModal] = useState(false);

  // Estados para busca e filtro
  const [termoBusca, setTermoBusca] = useState("");
  const [grupoSelecionado, setGrupoSelecionado] = useState("todos");
  const [grupos, setGrupos] = useState([]);
  const [gruposCarregados, setGruposCarregados] = useState([]); // ✅ Estado separado para grupos da API

  // ✅ Usar o contexto de autenticação
  const { user, token, isAuthenticated } = useAuth();

  // Verificar autenticação ao carregar
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert("Erro", "Usuário não autenticado");
      navigation.goBack();
      return;
    }

    console.log("✅ Usuário autenticado:", user?.name);
    carregarClientes();
    carregarProdutos();
    carregarGrupos(); // ✅ Carregar grupos separadamente
  }, [isAuthenticated]);

  // ✅ NOVA FUNÇÃO: Carregar grupos da API
  const carregarGrupos = async () => {
    try {
      console.log("📂 Carregando grupos de produtos...");
      const response = await api.get("/product_groups");

      if (response.data) {
        const data = response.data;
        let gruposData = [];

        // Diferentes formatos que a API pode retornar
        if (Array.isArray(data)) {
          gruposData = data;
        } else if (data.data && Array.isArray(data.data)) {
          gruposData = data.data;
        } else if (data.product_groups && Array.isArray(data.product_groups)) {
          gruposData = data.product_groups;
        } else if (data.groups && Array.isArray(data.groups)) {
          gruposData = data.groups;
        }

        console.log(`✅ ${gruposData.length} grupos carregados da API`);
        setGruposCarregados(gruposData); // ✅ Usar estado separado
      }
    } catch (error) {
      console.error(
        "❌ Erro ao carregar grupos:",
        error.response?.data || error.message
      );
      setGruposCarregados([]); // ✅ Inicializar como array vazio
    }
  };

  const carregarClientes = async () => {
    try {
      console.log("📞 Carregando clientes...");
      const response = await api.get("/customers");

      if (response.data) {
        const data = response.data;
        const clientesData = Array.isArray(data)
          ? data
          : data.customers || data.data || [];
        setClientes(clientesData);
        console.log(`✅ ${clientesData.length} clientes carregados`);
      }
    } catch (error) {
      console.error(
        "❌ Erro ao carregar clientes:",
        error.response?.data || error.message
      );
      Alert.alert("Erro", "Não foi possível carregar a lista de clientes");
    }
  };

  const carregarProdutos = async () => {
    try {
      console.log("📦 Carregando produtos...");
      const response = await api.get("/product");

      if (response.data) {
        const data = response.data;
        const produtosData = Array.isArray(data)
          ? data
          : data.products || data.data || [];
        setProdutosDisponiveis(produtosData);
        setProdutosFiltrados(produtosData);
        console.log(`✅ ${produtosData.length} produtos carregados`);
      }
    } catch (error) {
      console.error(
        "❌ Erro ao carregar produtos:",
        error.response?.data || error.message
      );
      Alert.alert("Erro", "Não foi possível carregar a lista de produtos");
    }
  };

  // ✅ FUNÇÃO ATUALIZADA: Encontrar nome do grupo
  const encontrarNomeGrupo = (groupId) => {
    if (!groupId) return "Sem Grupo";

    const grupo = gruposCarregados.find((g) => g.id === groupId);
    return grupo
      ? grupo.name || grupo.nome || `Grupo ${groupId}`
      : `Grupo ${groupId}`;
  };

  // ✅ FUNÇÃO ATUALIZADA: Extrair grupos únicos dos produtos (SEM setState)
  const extrairGruposDosProdutos = (produtosData, gruposAPI) => {
    const gruposUnicos = [
      ...new Map(
        produtosData
          .filter((p) => p.group_id || p.grupo_id)
          .map((p) => {
            const grupoId = p.group_id || p.grupo_id;
            // ✅ Agora usa a função encontrarNomeGrupo que busca nos grupos carregados
            const grupoNome = encontrarNomeGrupo(grupoId);
            return [grupoId, { id: grupoId, nome: grupoNome }];
          })
      ).values(),
    ];

    // ✅ Adicionar opção "Todos" no início
    const gruposComTodos = [{ id: "todos", nome: "Todos" }, ...gruposUnicos];

    console.log(`📂 ${gruposUnicos.length} grupos encontrados nos produtos`);
    return gruposComTodos;
  };

  // ✅ useEffect CORRIGIDO: Sem loop infinito
  useEffect(() => {
    if (gruposCarregados.length > 0 && produtosDisponiveis.length > 0) {
      console.log("🔄 Processando grupos dos produtos...");
      const gruposProcessados = extrairGruposDosProdutos(
        produtosDisponiveis,
        gruposCarregados
      );
      setGrupos(gruposProcessados);
    }
  }, [gruposCarregados, produtosDisponiveis]); // ✅ Dependências fixas

  // Função para buscar produtos
  const handleBusca = (texto) => {
    setTermoBusca(texto);
    filtrarProdutos(texto, grupoSelecionado);
  };

  // Função para filtrar por grupo
  const handleFiltroGrupo = (grupoId) => {
    setGrupoSelecionado(grupoId);
    filtrarProdutos(termoBusca, grupoId);
  };

  // ✅ FUNÇÃO ATUALIZADA: Filtrar produtos
  const filtrarProdutos = (busca, grupoId) => {
    let filtrados = [...produtosDisponiveis];

    // Filtro por busca
    if (busca) {
      filtrados = filtrados.filter(
        (produto) =>
          produto.name?.toLowerCase().includes(busca.toLowerCase()) ||
          produto.nome?.toLowerCase().includes(busca.toLowerCase())
      );
    }

    // Filtro por grupo
    if (grupoId !== "todos") {
      filtrados = filtrados.filter(
        (produto) =>
          produto.group_id === grupoId || produto.grupo_id === grupoId
      );
    }

    setProdutosFiltrados(filtrados);
  };

  const adicionarProduto = (produto) => {
    if (!produto || !produto.id) {
      console.error("Produto inválido:", produto);
      return;
    }

    const produtoExistente = produtos.find((p) => p.id === produto.id);
    if (produtoExistente) {
      setProdutos(
        produtos.map((p) =>
          p.id === produto.id
            ? {
                ...p,
                quantidade: p.quantidade + 1,
                subtotal: (p.quantidade + 1) * p.preco,
              }
            : p
        )
      );
    } else {
      setProdutos([
        ...produtos,
        {
          id: produto.id,
          nome: produto.name || produto.nome || "Produto sem nome",
          preco: parseFloat(produto.price) || 0,
          quantidade: 1,
          subtotal: parseFloat(produto.price) || 0,
        },
      ]);
    }
    setShowProdutosModal(false);
  };

  const removerProduto = (id) => {
    setProdutos(produtos.filter((produto) => produto.id !== id));
  };

  const atualizarQuantidade = (id, novaQuantidade) => {
    if (novaQuantidade < 1) {
      removerProduto(id);
      return;
    }
    setProdutos(
      produtos.map((produto) =>
        produto.id === id
          ? {
              ...produto,
              quantidade: novaQuantidade,
              subtotal: novaQuantidade * produto.preco,
            }
          : produto
      )
    );
  };

  const calcularTotal = () => {
    return produtos.reduce(
      (total, produto) => total + (produto.subtotal || 0),
      0
    );
  };

  const finalizarVenda = async () => {
    if (produtos.length === 0) {
      Alert.alert(
        "Atenção",
        "Adicione pelo menos um produto para finalizar a venda."
      );
      return;
    }

    if (!isAuthenticated) {
      Alert.alert("Erro", "Usuário não autenticado. Faça login novamente.");
      return;
    }

    setLoading(true);
    try {
      console.log("🚀 Criando venda pendente para usuário:", user.id);

      const orderData = {
        table_number: tableNumber ? parseInt(tableNumber) : null,
        notes: observacoes,
        status: "open",
      };

      console.log("📋 Criando order:", orderData);
      const orderResponse = await api.post("/order", orderData);
      const orderId =
        orderResponse.data.orderId ||
        orderResponse.data.id ||
        orderResponse.data.order_id;

      if (!orderId) {
        throw new Error("ID do pedido não retornado pela API");
      }

      console.log("🎯 Order ID obtido:", orderId);

      const saleData = {
        order_id: orderId,
        customer_id: clienteId || null,
        total_amount: calcularTotal(),
        payment_method: paymentMethod,
        status: "pending",
        sale_type: "local",
        table_number: tableNumber ? parseInt(tableNumber) : null,
        items: produtos.map((produto) => ({
          product_id: produto.id,
          quantity: produto.quantidade,
          unit_price: produto.preco,
          subtotal: produto.subtotal,
        })),
      };

      console.log("💰 Criando sale PENDENTE:", saleData);
      const saleResponse = await api.post("/sales", saleData);

      console.log("✅ Venda pendente criada com sucesso:", saleResponse.data);

      Alert.alert(
        "Venda Aberta",
        "Venda iniciada com sucesso! Agora ela aparece nos Pedidos em Andamento.",
        [
          {
            text: "Continuar Vendendo",
            onPress: () => {
              setProdutos([]);
              setTableNumber("");
              setObservacoes("");
              setClienteId(null);
            },
          },
          {
            text: "Ver Pedidos",
            onPress: () => navigation.navigate("Vendas"),
          },
        ]
      );
    } catch (error) {
      console.error("❌ Erro ao criar venda pendente:", error);
      console.error("❌ Detalhes do erro:", error.response?.data);

      let errorMessage = "Não foi possível iniciar a venda.";

      if (error.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Alert.alert("Erro", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Mostrar informações do usuário logado
  const clienteSelecionado = clientes.find((c) => c.id === clienteId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Nova Venda - Local</Text>
          <Text style={styles.userInfo}>Vendedor: {user?.name}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Seção Informações do Vendedor */}
        <View style={styles.userSection}>
          <Text style={styles.userLabel}>Vendedor:</Text>
          <Text style={styles.userName}>
            {user?.name} (ID: {user?.id})
          </Text>
        </View>

        {/* Seção Mesa */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mesa</Text>
          <TextInput
            style={styles.input}
            placeholder="Número da mesa (opcional)"
            value={tableNumber}
            onChangeText={(text) => {
              const numericText = text.replace(/[^0-9]/g, "");
              setTableNumber(numericText);
            }}
            keyboardType="number-pad"
            maxLength={3}
          />
          {tableNumber && (
            <Text style={styles.tableHelperText}>
              Venda será registrada para a Mesa {tableNumber}
            </Text>
          )}
        </View>

        {tableNumber && (
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Mesa selecionada:</Text>
            <Text style={styles.infoValue}>Mesa {tableNumber}</Text>
          </View>
        )}

        {/* Seção Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowClientesModal(true)}
          >
            <Text
              style={
                clienteSelecionado
                  ? styles.selectButtonText
                  : styles.selectButtonPlaceholder
              }
            >
              {clienteSelecionado
                ? clienteSelecionado.name || clienteSelecionado.nome
                : "Selecionar cliente (opcional)"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Seção Produtos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produtos</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowProdutosModal(true)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {produtos.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum produto adicionado</Text>
          ) : (
            produtos.map((produto) => (
              <View key={produto.id} style={styles.produtoItem}>
                <View style={styles.produtoRow}>
                  <View style={styles.produtoInfo}>
                    <Text style={styles.produtoNome}>{produto.nome}</Text>
                    <Text style={styles.produtoPreco}>
                      R$ {produto.preco.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.quantidadeContainer}>
                    <TouchableOpacity
                      style={styles.quantidadeButton}
                      onPress={() =>
                        atualizarQuantidade(produto.id, produto.quantidade - 1)
                      }
                    >
                      <Ionicons name="remove" size={16} color="#7b2ff7" />
                    </TouchableOpacity>
                    <Text style={styles.quantidadeText}>
                      {produto.quantidade}
                    </Text>
                    <TouchableOpacity
                      style={styles.quantidadeButton}
                      onPress={() =>
                        atualizarQuantidade(produto.id, produto.quantidade + 1)
                      }
                    >
                      <Ionicons name="add" size={16} color="#7b2ff7" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.subtotal}>
                    R$ {produto.subtotal.toFixed(2)}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removerProduto(produto.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Seção Pagamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Forma de Pagamento</Text>
          <View style={styles.paymentOptions}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === "cash" && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod("cash")}
            >
              <Text
                style={[
                  styles.paymentOptionText,
                  paymentMethod === "cash" && styles.paymentOptionTextSelected,
                ]}
              >
                Dinheiro
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === "card" && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod("card")}
            >
              <Text
                style={[
                  styles.paymentOptionText,
                  paymentMethod === "card" && styles.paymentOptionTextSelected,
                ]}
              >
                Cartão
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === "pix" && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod("pix")}
            >
              <Text
                style={[
                  styles.paymentOptionText,
                  paymentMethod === "pix" && styles.paymentOptionTextSelected,
                ]}
              >
                PIX
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Observações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Observações da venda (opcional)"
            multiline
            value={observacoes}
            onChangeText={setObservacoes}
          />
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>R$ {calcularTotal().toFixed(2)}</Text>
        </View>
      </ScrollView>

      {/* Botão Finalizar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.finalizarButton,
            loading && styles.finalizarButtonDisabled,
          ]}
          onPress={finalizarVenda}
          disabled={loading || !isAuthenticated}
        >
          <Text style={styles.finalizarButtonText}>
            {loading ? "Processando..." : "Finalizar Venda"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Clientes */}
      <Modal
        visible={showClientesModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Cliente</Text>
              <TouchableOpacity onPress={() => setShowClientesModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {clientes.length === 0 ? (
                <Text style={styles.emptyModalText}>
                  Nenhum cliente cadastrado
                </Text>
              ) : (
                clientes.map((cliente) => (
                  <TouchableOpacity
                    key={cliente.id}
                    style={styles.clienteItem}
                    onPress={() => {
                      setClienteId(cliente.id);
                      setShowClientesModal(false);
                    }}
                  >
                    <Text style={styles.clienteNome}>
                      {cliente.name || cliente.nome}
                    </Text>
                    {cliente.phone && (
                      <Text style={styles.clientePhone}>{cliente.phone}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Produtos ATUALIZADO */}
      <Modal
        visible={showProdutosModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProdutosModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar Produto</Text>
            <TouchableOpacity onPress={() => setShowProdutosModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Barra de Pesquisa */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar produtos..."
              value={termoBusca}
              onChangeText={handleBusca}
              placeholderTextColor="#999"
            />
            {termoBusca ? (
              <TouchableOpacity onPress={() => handleBusca("")}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Filtro por Grupos */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.gruposContainer}
          >
            {grupos.map((grupo) => {
              const produtosNoGrupo =
                grupo.id === "todos"
                  ? produtosDisponiveis
                  : produtosDisponiveis.filter(
                      (p) => p.group_id === grupo.id || p.grupo_id === grupo.id
                    );

              return (
                <TouchableOpacity
                  key={grupo.id}
                  style={[
                    styles.grupoItem,
                    grupoSelecionado === grupo.id &&
                      styles.grupoItemSelecionado,
                  ]}
                  onPress={() => handleFiltroGrupo(grupo.id)}
                >
                  <Text
                    style={[
                      styles.grupoText,
                      grupoSelecionado === grupo.id &&
                        styles.grupoTextSelecionado,
                    ]}
                  >
                    {grupo.nome} ({produtosNoGrupo.length})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Lista de Produtos Filtrados */}
          <FlatList
            data={produtosFiltrados}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.produtosList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.produtoItemModal}
                onPress={() => adicionarProduto(item)}
              >
                <View style={styles.produtoInfoModal}>
                  <Text style={styles.produtoNomeModal}>
                    {item.name || item.nome}
                  </Text>
                  <Text style={styles.produtoPrecoModal}>
                    R$ {parseFloat(item.price || item.preco || 0).toFixed(2)}
                  </Text>
                  {/* ✅ Agora mostra o nome correto do grupo */}
                  <Text style={styles.produtoGrupoModal}>
                    {encontrarNomeGrupo(item.group_id || item.grupo_id)}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={24} color="#7b2ff7" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>
                  Nenhum produto encontrado
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {termoBusca
                    ? "Tente alterar os termos da busca"
                    : "Nenhum produto disponível"}
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ✅ ESTILOS (mantenha os mesmos do código anterior)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f4fc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerInfo: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  userInfo: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  userSection: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userLabel: {
    fontSize: 14,
    color: "#666",
  },
  userName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#7b2ff7",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoSection: {
    backgroundColor: "#f0e6ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
    color: "#7b2ff7",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "bold",
  },
  tableHelperText: {
    fontSize: 12,
    color: "#7b2ff7",
    marginTop: 5,
    fontStyle: "italic",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#f9f9f9",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  selectButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9f9f9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectButtonText: {
    fontSize: 14,
    color: "#333",
  },
  selectButtonPlaceholder: {
    fontSize: 14,
    color: "#999",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7b2ff7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 5,
    fontSize: 12,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    padding: 20,
  },
  produtoItem: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  produtoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  produtoInfo: {
    flex: 1,
  },
  produtoNome: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  produtoPreco: {
    fontSize: 12,
    color: "#666",
  },
  quantidadeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
  },
  quantidadeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f0e6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  quantidadeText: {
    marginHorizontal: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  subtotal: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#7b2ff7",
    marginHorizontal: 10,
  },
  removeButton: {
    padding: 5,
  },
  paymentOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  paymentOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    marginHorizontal: 4,
  },
  paymentOptionSelected: {
    backgroundColor: "#7b2ff7",
    borderColor: "#7b2ff7",
  },
  paymentOptionText: {
    fontSize: 14,
    color: "#666",
  },
  paymentOptionTextSelected: {
    color: "#fff",
    fontWeight: "bold",
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#7b2ff7",
  },
  footer: {
    marginBottom: 120,
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  finalizarButton: {
    backgroundColor: "#7b2ff7",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  finalizarButtonDisabled: {
    backgroundColor: "#ccc",
  },
  finalizarButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  emptyModalText: {
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
    padding: 20,
  },
  clienteItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  clienteNome: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  clientePhone: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  gruposContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
    maxHeight: 50,
  },
  grupoItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  grupoItemSelecionado: {
    backgroundColor: "#7b2ff7",
    borderColor: "#7b2ff7",
  },
  grupoText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  grupoTextSelecionado: {
    color: "#fff",
  },
  produtosList: {
    padding: 16,
    paddingBottom: 32,
  },
  produtoItemModal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  produtoInfoModal: {
    flex: 1,
  },
  produtoNomeModal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  produtoPrecoModal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#7b2ff7",
    marginBottom: 2,
  },
  produtoGrupoModal: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyStateText: {
    marginTop: 10,
    color: "#999",
    fontSize: 16,
    textAlign: "center",
  },
  emptyStateSubtext: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
});
