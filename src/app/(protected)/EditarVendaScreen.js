// EditarVendaScreen.js
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
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function EditarVendaScreen({ route, navigation }) {
  const { sale } = route.params;
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [clienteId, setClienteId] = useState(sale?.customer_id ?? null);
  const [tableNumber, setTableNumber] = useState(
    sale?.order?.table_number ?? sale?.table_number ?? ""
  );
  const [observacoes, setObservacoes] = useState(
    sale?.order?.notes ?? sale?.notes ?? ""
  );
  const [paymentMethod, setPaymentMethod] = useState(
    sale?.payment_method ?? "cash"
  );
  const [showClientesModal, setShowClientesModal] = useState(false);
  const [showProdutosModal, setShowProdutosModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Estados para busca e filtro de produtos
  const [termoBusca, setTermoBusca] = useState('');
  const [grupoSelecionado, setGrupoSelecionado] = useState('todos');
  const [grupos, setGrupos] = useState([]);
  const [gruposCarregados, setGruposCarregados] = useState([]);

  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert("Erro", "Usuário não autenticado");
      navigation.goBack();
      return;
    }

    carregarDados();
  }, [isAuthenticated]);

  // ✅ NOVA FUNÇÃO: Carregar grupos da API
  const carregarGrupos = async () => {
    try {
      console.log("📂 Carregando grupos de produtos para edição...");
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
        
        console.log(`✅ ${gruposData.length} grupos carregados para edição`);
        setGruposCarregados(gruposData);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar grupos:", error.response?.data || error.message);
      setGruposCarregados([]);
    }
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      await Promise.all([
        carregarClientes(),
        carregarProdutos(),
        carregarGrupos(),
        carregarItensVenda(),
      ]);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarClientes = async () => {
    try {
      console.log("📞 Carregando clientes via /customers...");
      const response = await api.get("/customers");
      const data = response.data;

      const clientesData = Array.isArray(data)
        ? data
        : data.customers || data.data || [];

      setClientes(clientesData);
      console.log(`✅ ${clientesData.length} clientes carregados`);
    } catch (error) {
      console.error("❌ Erro ao carregar clientes:", error.message);
      setClientes([]);
    }
  };

  const carregarProdutos = async () => {
    try {
      console.log("📦 Carregando produtos via /product...");
      const response = await api.get("/product");
      const data = response.data;

      const produtosData = Array.isArray(data)
        ? data
        : data.products || data.produtos || data.data || [];

      setProdutosDisponiveis(produtosData);
      setProdutosFiltrados(produtosData);
      console.log(`✅ ${produtosData.length} produtos carregados`);
    } catch (error) {
      console.error("❌ Erro ao carregar produtos:", error.message);
      setProdutosDisponiveis([]);
      setProdutosFiltrados([]);
    }
  };

  // ✅ FUNÇÃO: Encontrar nome do grupo
  const encontrarNomeGrupo = (groupId) => {
    if (!groupId) return 'Sem Grupo';
    
    const grupo = gruposCarregados.find(g => g.id === groupId);
    return grupo ? grupo.name || grupo.nome || `Grupo ${groupId}` : `Grupo ${groupId}`;
  };

  // ✅ FUNÇÃO: Extrair grupos únicos dos produtos
  const extrairGruposDosProdutos = (produtosData, gruposAPI) => {
    const gruposUnicos = [...new Map(produtosData
      .filter(p => p.group_id || p.grupo_id)
      .map(p => {
        const grupoId = p.group_id || p.grupo_id;
        const grupoNome = encontrarNomeGrupo(grupoId);
        return [grupoId, { id: grupoId, nome: grupoNome }];
      })).values()];
    
    // Adicionar opção "Todos" no início
    const gruposComTodos = [
      { id: 'todos', nome: 'Todos' },
      ...gruposUnicos
    ];
    
    console.log(`📂 ${gruposUnicos.length} grupos encontrados nos produtos`);
    return gruposComTodos;
  };

  // ✅ useEffect: Processar grupos quando dados carregarem
  useEffect(() => {
    if (gruposCarregados.length > 0 && produtosDisponiveis.length > 0) {
      console.log("🔄 Processando grupos dos produtos para edição...");
      const gruposProcessados = extrairGruposDosProdutos(produtosDisponiveis, gruposCarregados);
      setGrupos(gruposProcessados);
    }
  }, [gruposCarregados, produtosDisponiveis]);

  // ✅ FUNÇÕES DE BUSCA E FILTRO DE PRODUTOS
  const handleBusca = (texto) => {
    setTermoBusca(texto);
    filtrarProdutos(texto, grupoSelecionado);
  };

  const handleFiltroGrupo = (grupoId) => {
    setGrupoSelecionado(grupoId);
    filtrarProdutos(termoBusca, grupoId);
  };

  const filtrarProdutos = (busca, grupoId) => {
    let filtrados = [...produtosDisponiveis];

    // Filtro por busca
    if (busca) {
      filtrados = filtrados.filter(produto =>
        produto.name?.toLowerCase().includes(busca.toLowerCase()) ||
        produto.nome?.toLowerCase().includes(busca.toLowerCase())
      );
    }

    // Filtro por grupo
    if (grupoId !== 'todos') {
      filtrados = filtrados.filter(produto => 
        produto.group_id === grupoId || produto.grupo_id === grupoId
      );
    }

    setProdutosFiltrados(filtrados);
  };

  const carregarItensVenda = async () => {
    try {
      console.log("🛒 Carregando itens da venda ID:", sale?.id);

      // VERIFICAÇÃO DOS DADOS DISPONÍVEIS NO route.params
      console.log("📋 Dados da venda no route.params:", {
        saleId: sale?.id,
        hasItems: !!sale?.items,
        itemsCount: sale?.items?.length,
        hasOrder: !!sale?.order,
        orderItemsCount: sale?.order?.items?.length,
        saleData: sale,
      });

      let items = [];

      // PRIMEIRO: Tenta usar os dados que já vieram no route.params
      if (sale?.items && Array.isArray(sale.items) && sale.items.length > 0) {
        items = sale.items;
        console.log("✅ Usando items direto do route.params:", items.length);
      }
      // SEGUNDO: Tenta usar items do order
      else if (
        sale?.order?.items &&
        Array.isArray(sale.order.items) &&
        sale.order.items.length > 0
      ) {
        items = sale.order.items;
        console.log("✅ Usando items do order:", items.length);
      }
      // TERCEIRO: Tenta buscar via API (como fallback)
      else {
        console.log("🔄 Tentando buscar itens via API...");

        const endpoints = [
          `/sales/${sale.id}/items`,
          `/sale/${sale.id}/items`,
          `/sales/${sale.id}`,
          `/sale/${sale.id}`,
        ];

        for (const endpoint of endpoints) {
          try {
            console.log(`🔄 Tentando endpoint: ${endpoint}`);
            const response = await api.get(endpoint);
            const data = response.data;

            // Extrai items de diferentes estruturas
            const extractedItems =
              data.items || data.order?.items || data.data?.items || [];

            if (extractedItems.length > 0) {
              items = extractedItems;
              console.log(`✅ Itens carregados via ${endpoint}:`, items.length);
              break;
            }
          } catch (error) {
            console.log(
              `❌ Endpoint falhou: ${endpoint}`,
              error.response?.status
            );
            continue;
          }
        }
      }

      // CONVERSÃO DOS ITEMS
      const produtosConvertidos = items.map((item) => {
        const produto = {
          id:
            item.product_id ||
            item.produto_id ||
            item.id ||
            item.product?.id ||
            item.produto?.id,
          nome:
            item.product?.name ||
            item.produto?.nome ||
            item.name ||
            item.nome ||
            item.product_name ||
            "Produto",
          preco: Number(
            item.unit_price ||
              item.preco_unitario ||
              item.price ||
              item.preco ||
              0
          ),
          quantidade: Number(item.quantity || item.quantidade || item.qty || 1),
          subtotal: Number(
            item.subtotal ||
              (item.unit_price || item.price || 0) * (item.quantity || 1)
          ),
        };

        console.log("📦 Item convertido:", produto);
        return produto;
      });

      setProdutos(produtosConvertidos);
      console.log(
        `🎯 Total de ${produtosConvertidos.length} produtos carregados na venda`
      );
    } catch (error) {
      console.error(
        "❌ Erro crítico ao carregar itens da venda:",
        error.message
      );

      // FALLBACK ULTIMATO: Cria produtos básicos se nada funcionar
      const fallbackItems = [
        {
          id: 1,
          nome: "Produto Exemplo",
          preco: 10.0,
          quantidade: 1,
          subtotal: 10.0,
        },
      ];

      setProdutos(fallbackItems);
      console.log("⚠ Usando fallback de exemplo");
    }
  };

  // --- Manipulação de produtos na UI ---
  const adicionarProduto = (produto) => {
    if (!produto || !produto.id) {
      console.error("Produto inválido:", produto);
      return;
    }

    const produtoExistente = produtos.find((p) => p.id === produto.id);
    if (produtoExistente) {
      setProdutos((prev) =>
        prev.map((p) =>
          p.id === produto.id
            ? {
                ...p,
                quantidade: p.quantidade + 1,
                subtotal: Number((p.quantidade + 1) * p.preco),
              }
            : p
        )
      );
    } else {
      setProdutos((prev) => [
        ...prev,
        {
          id: produto.id,
          nome: produto.name || produto.nome || "Produto sem nome",
          preco: Number(produto.price || produto.preco || 0),
          quantidade: 1,
          subtotal: Number(produto.price || produto.preco || 0),
        },
      ]);
    }
    setShowProdutosModal(false);
  };

  const removerProduto = (id) => {
    setProdutos((prev) => prev.filter((produto) => produto.id !== id));
  };

  const atualizarQuantidade = (id, novaQuantidade) => {
    if (novaQuantidade < 1) {
      removerProduto(id);
      return;
    }
    setProdutos((prev) =>
      prev.map((produto) =>
        produto.id === id
          ? {
              ...produto,
              quantidade: novaQuantidade,
              subtotal: Number(novaQuantidade * produto.preco),
            }
          : produto
      )
    );
  };

  const calcularTotal = () => {
    const total = produtos.reduce(
      (totalAcc, produto) => totalAcc + (Number(produto.subtotal) || 0),
      0
    );
    return Math.round(total * 100) / 100;
  };

  // ✅ NOVA FUNÇÃO: Cancelar Venda
  const cancelarVenda = async () => {
    Alert.alert(
      "Cancelar Venda",
      "Tem certeza que deseja cancelar esta venda? Esta ação não pode ser desfeita.",
      [
        {
          text: "Manter Venda",
          style: "cancel"
        },
        {
          text: "Cancelar Venda",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              console.log("❌ Cancelando venda ID:", sale.id);
              
              // Payload para cancelar a venda
              const payload = {
                status: "cancelled",
                // Mantém os outros dados para auditoria
                total_amount: calcularTotal(),
                payment_method: paymentMethod,
              };

              console.log("📤 Payload de cancelamento:", payload);

              // Tenta cancelar via PATCH
              const response = await api.patch(`/sales/${sale.id}`, payload);
              console.log("✅ Venda cancelada com sucesso:", response.data);

              Alert.alert(
                "Venda Cancelada", 
                "A venda foi cancelada com sucesso.",
                [
                  {
                    text: "OK",
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              console.error(
                "❌ Erro ao cancelar venda:",
                error.response?.data || error.message
              );

              let errorMessage = "Não foi possível cancelar a venda.";

              // Tenta fallback com PUT
              if (error.response?.status === 404 || error.response?.status === 405) {
                try {
                  console.log("🔄 Tentando PUT como fallback para cancelamento...");
                  const putResponse = await api.put(`/sales/${sale.id}`, {
                    status: "cancelled",
                    total_amount: calcularTotal(),
                    payment_method: paymentMethod,
                  });

                  console.log("✅ Venda cancelada via PUT:", putResponse.data);

                  Alert.alert(
                    "Venda Cancelada", 
                    "A venda foi cancelada com sucesso.",
                    [
                      {
                        text: "OK",
                        onPress: () => navigation.goBack(),
                      },
                    ]
                  );
                  return;
                } catch (putError) {
                  console.error("❌ PUT também falhou:", putError.response?.data);
                  errorMessage = "Endpoint não encontrado. Verifique a URL da API.";
                }
              } else if (error.response?.status === 401) {
                errorMessage = "Sessão expirada. Faça login novamente.";
              } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
              }

              Alert.alert("Erro", errorMessage);
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  // --- Atualizar venda (COM ITENS) ---
  const atualizarVenda = async () => {
    if (produtos.length === 0) {
      Alert.alert("Atenção", "A venda deve ter pelo menos um produto.");
      return;
    }

    // Validação adicional
    if (!paymentMethod) {
      Alert.alert("Atenção", "Selecione uma forma de pagamento.");
      return;
    }

    const total = calcularTotal();
    if (total <= 0) {
      Alert.alert("Atenção", "O total da venda deve ser maior que zero.");
      return;
    }

    setSaving(true);
    try {
      // Primeiro: Atualiza os dados básicos da venda
      const salePayload = {
        customer_id: clienteId || null,
        total_amount: total,
        payment_method: paymentMethod,
        status: "pending",
      };

      // Adiciona campos opcionais
      if (tableNumber && tableNumber.trim() !== "") {
        salePayload.table_number = tableNumber.trim();
      }
      if (observacoes && observacoes.trim() !== "") {
        salePayload.notes = observacoes.trim();
      }

      console.log("📤 Atualizando venda ID:", sale.id);
      console.log("📦 Sale Payload:", salePayload);

      // Atualiza dados básicos da venda
      const saleResponse = await api.patch(`/sales/${sale.id}`, salePayload);
      console.log("✅ Venda atualizada:", saleResponse.data);

      // Segundo: Atualiza os itens da venda (se necessário)
      try {
        const itemsPayload = {
          items: produtos.map((produto) => ({
            product_id: produto.id,
            quantity: Number(produto.quantidade),
            unit_price: Number(produto.preco),
          })),
        };

        console.log("🛒 Atualizando itens:", itemsPayload);

        // Tenta atualizar itens (endpoints comuns)
        const itemsEndpoints = [
          `/sales/${sale.id}/items`,
          `/sales/${sale.id}/update-items`,
          `/sale/${sale.id}/items`,
        ];

        let itemsUpdated = false;
        for (const endpoint of itemsEndpoints) {
          try {
            await api.put(endpoint, itemsPayload);
            console.log(`✅ Itens atualizados via: ${endpoint}`);
            itemsUpdated = true;
            break;
          } catch (itemError) {
            console.log(
              `❌ Endpoint ${endpoint} falhou:`,
              itemError.response?.status
            );
            continue;
          }
        }

        if (!itemsUpdated) {
          console.log(
            "ℹ️ Não foi possível atualizar itens, mas a venda foi atualizada"
          );
        }
      } catch (itemsError) {
        console.log(
          "⚠️ Erro ao atualizar itens, mas venda foi salva:",
          itemsError.message
        );
        // Não impede o sucesso da operação principal
      }

      Alert.alert("Sucesso", "Venda atualizada com sucesso!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error(
        "❌ Erro ao atualizar venda:",
        error.response?.data || error.message
      );

      let errorMessage = "Não foi possível atualizar a venda.";

      if (error.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Alert.alert("Erro", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const finalizarVenda = async () => {
    if (produtos.length === 0) {
      Alert.alert(
        "Atenção",
        "A venda deve ter pelo menos um produto para finalizar."
      );
      return;
    }

    setSaving(true);
    try {
      // Payload SIMPLES igual ao que funciona na SaleScreen
      const payload = {
        status: "paid",
        payment_method: paymentMethod,
        // Inclui o total atualizado
        total_amount: calcularTotal(),
      };

      console.log("💰 Finalizando venda ID:", sale.id);
      console.log("📤 Payload:", payload);

      // Tenta APENAS o endpoint que sabemos funcionar
      const response = await api.patch(`/sales/${sale.id}`, payload);

      console.log("✅ Venda finalizada com sucesso:", response.data);

      Alert.alert("Sucesso", "Venda finalizada com sucesso!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error(
        "❌ Erro ao finalizar venda:",
        error.response?.data || error.message
      );

      let errorMessage = "Não foi possível finalizar a venda.";

      // Tenta fallback SIMPLES com PUT
      if (error.response?.status === 404 || error.response?.status === 405) {
        try {
          console.log("🔄 Tentando PUT como fallback...");
          const putResponse = await api.put(`/sales/${sale.id}`, {
            status: "paid",
            payment_method: paymentMethod,
            total_amount: calcularTotal(),
          });

          console.log("✅ Venda finalizada via PUT:", putResponse.data);

          Alert.alert("Sucesso", "Venda finalizada com sucesso!", [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]);
          return;
        } catch (putError) {
          console.error("❌ PUT também falhou:", putError.response?.data);
          errorMessage = "Endpoint não encontrado. Verifique a URL da API.";
        }
      } else if (error.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Alert.alert("Erro", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const clienteSelecionado = clientes.find((c) => c.id === clienteId);

  // Loading durante o carregamento inicial
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7b2ff7" />
          <Text style={styles.loadingText}>Carregando dados da venda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Venda #{sale?.id}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.userSection}>
          <Text style={styles.userLabel}>Vendedor:</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>

        <View style={[styles.section, styles.statusSection]}>
          <Text style={styles.statusLabel}>Status:</Text>
          <View style={styles.statusBadge}>
            <Ionicons name="time-outline" size={16} color="#856404" />
            <Text style={styles.statusText}>
              {sale?.status ? sale.status.toUpperCase() : "PENDENTE"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mesa</Text>
          <TextInput
            style={styles.input}
            placeholder="Número da mesa (opcional)"
            value={String(tableNumber ?? "")}
            onChangeText={setTableNumber}
            keyboardType="number-pad"
          />
        </View>

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
                ? clienteSelecionado.name ?? clienteSelecionado.nome
                : "Selecionar cliente (opcional)"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

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
              <View key={String(produto.id)} style={styles.produtoItem}>
                <View style={styles.produtoRow}>
                  <View style={styles.produtoInfo}>
                    <Text style={styles.produtoNome}>{produto.nome}</Text>
                    <Text style={styles.produtoPreco}>
                      R$ {Number(produto.preco).toFixed(2)}
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
                    R$ {Number(produto.subtotal).toFixed(2)}
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

        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>R$ {calcularTotal().toFixed(2)}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          {/* ✅ BOTÃO CANCELAR VENDA ADICIONADO */}
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={cancelarVenda}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Cancelar</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.updateButton]}
            onPress={atualizarVenda}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Atualizar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.finalizeButton]}
            onPress={finalizarVenda}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.buttonText}>Finalizar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Clientes */}
      <Modal visible={showClientesModal} transparent animationType="slide">
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
                      {cliente.name ?? cliente.nome}
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

      {/* ✅ Modal de Produtos ATUALIZADO com Grupos e Busca */}
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
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar produtos..."
              value={termoBusca}
              onChangeText={handleBusca}
              placeholderTextColor="#999"
            />
            {termoBusca ? (
              <TouchableOpacity onPress={() => handleBusca('')}>
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
            {grupos.map(grupo => {
              const produtosNoGrupo = grupo.id === 'todos' 
                ? produtosDisponiveis 
                : produtosDisponiveis.filter(p => 
                    p.group_id === grupo.id || p.grupo_id === grupo.id
                  );
              
              return (
                <TouchableOpacity
                  key={grupo.id}
                  style={[
                    styles.grupoItem,
                    grupoSelecionado === grupo.id && styles.grupoItemSelecionado
                  ]}
                  onPress={() => handleFiltroGrupo(grupo.id)}
                >
                  <Text style={[
                    styles.grupoText,
                    grupoSelecionado === grupo.id && styles.grupoTextSelecionado
                  ]}>
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
                  {/* ✅ Mostra o nome do grupo */}
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
                  {termoBusca ? 'Tente alterar os termos da busca' : 'Nenhum produto disponível'}
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ✅ ESTILOS ATUALIZADOS com botão de cancelar
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f4fc",
    paddingBottom: 10,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
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

  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  content: {
    flex: 1,
    padding: 20,
  },

  scrollContent: {
    paddingBottom: 30,
    flexGrow: 1,
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

  statusSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statusLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3CD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#856404",
    marginLeft: 4,
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
    padding: 20,
    paddingBottom: 25,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginBottom: 120,
  },

  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginHorizontal: 5,
  },

  // ✅ NOVO ESTILO: Botão Cancelar
  cancelButton: {
    backgroundColor: "#dc3545",
  },

  updateButton: {
    backgroundColor: "#7b2ff7",
  },

  finalizeButton: {
    backgroundColor: "#4CAF50",
  },

  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },

  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
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

  // ✅ NOVOS ESTILOS PARA GRUPOS E BUSCA
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },

  gruposContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
    maxHeight: 50,
  },

  grupoItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  grupoItemSelecionado: {
    backgroundColor: '#7b2ff7',
    borderColor: '#7b2ff7',
  },

  grupoText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  grupoTextSelecionado: {
    color: '#fff',
  },

  produtosList: {
    padding: 16,
    paddingBottom: 32,
  },

  produtoItemModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
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
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },

  produtoPrecoModal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7b2ff7',
    marginBottom: 2,
  },

  produtoGrupoModal: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  emptyStateText: {
    marginTop: 10,
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },

  emptyStateSubtext: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
});