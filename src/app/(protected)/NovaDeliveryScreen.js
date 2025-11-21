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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext"; // ← Import do contexto
import api from "../../services/api"; // ← Import da API configurada

export default function NovaDeliveryScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [clienteId, setClienteId] = useState(null);
  const [endereco, setEndereco] = useState({
    rua: "",
    numero: "",
    complemento: ""
  });
  const [observacoes, setObservacoes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [showClientesModal, setShowClientesModal] = useState(false);
  const [showProdutosModal, setShowProdutosModal] = useState(false);

  // ✅ Usar o contexto de autenticação
  const { user, token, isAuthenticated } = useAuth();

  // Verificar autenticação ao carregar
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert("Erro", "Usuário não autenticado");
      navigation.goBack();
      return;
    }
    
    console.log("✅ Usuário autenticado para delivery:", user?.name);
    carregarClientes();
    carregarProdutos();
  }, [isAuthenticated]);

  const carregarClientes = async () => {
    try {
      console.log("📞 Carregando clientes para delivery...");
      const response = await api.get("/customers");
      
      if (response.data) {
        const data = response.data;
        const clientesData = Array.isArray(data) ? data : data.customers || data.data || [];
        setClientes(clientesData);
        console.log(`✅ ${clientesData.length} clientes carregados para delivery`);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar clientes:", error.response?.data || error.message);
      Alert.alert("Erro", "Não foi possível carregar a lista de clientes");
    }
  };

  const carregarProdutos = async () => {
    try {
      console.log("📦 Carregando produtos para delivery...");
      const response = await api.get("/product");
      
      if (response.data) {
        const data = response.data;
        const produtosData = Array.isArray(data) ? data : data.products || data.data || [];
        setProdutosDisponiveis(produtosData);
        console.log(`✅ ${produtosData.length} produtos carregados para delivery`);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar produtos:", error.response?.data || error.message);
      Alert.alert("Erro", "Não foi possível carregar a lista de produtos");
    }
  };

  const adicionarProduto = (produto) => {
    if (!produto || !produto.id) {
      console.error("Produto inválido:", produto);
      return;
    }

    const produtoExistente = produtos.find(p => p.id === produto.id);
    if (produtoExistente) {
      setProdutos(produtos.map(p =>
        p.id === produto.id ? { 
          ...p, 
          quantidade: p.quantidade + 1,
          subtotal: (p.quantidade + 1) * p.preco
        } : p
      ));
    } else {
      setProdutos([...produtos, {
        id: produto.id,
        nome: produto.name || produto.nome || "Produto sem nome",
        preco: parseFloat(produto.price) || 0,
        quantidade: 1,
        subtotal: parseFloat(produto.price) || 0
      }]);
    }
    setShowProdutosModal(false);
  };

  const removerProduto = (id) => {
    setProdutos(produtos.filter(produto => produto.id !== id));
  };

  const atualizarQuantidade = (id, novaQuantidade) => {
    if (novaQuantidade < 1) {
      removerProduto(id);
      return;
    }
    setProdutos(produtos.map(produto =>
      produto.id === id ? {
        ...produto,
        quantidade: novaQuantidade,
        subtotal: novaQuantidade * produto.preco
      } : produto
    ));
  };

  const calcularTotal = () => {
    return produtos.reduce((total, produto) => total + (produto.subtotal || 0), 0);
  };

  const finalizarDelivery = async () => {
    if (produtos.length === 0) {
      Alert.alert("Atenção", "Adicione pelo menos um produto para finalizar o delivery.");
      return;
    }

    if (!clienteId) {
      Alert.alert("Atenção", "Selecione um cliente para o delivery.");
      return;
    }

    if (!endereco.rua || !endereco.numero) {
      Alert.alert("Atenção", "Informe o endereço de entrega completo.");
      return;
    }

    if (!isAuthenticated) {
      Alert.alert("Erro", "Usuário não autenticado. Faça login novamente.");
      return;
    }

    setLoading(true);
    try {
      console.log("🚀 Iniciando processo de delivery para usuário:", user.id);

      // ✅ 1. Primeiro criar o order (sem mesa)
      const orderData = {
        notes: observacoes,
        status: 'open'
      };

      console.log("📋 Criando order para delivery:", orderData);

      const orderResponse = await api.post("/order", orderData);

      if (orderResponse.data) {
        console.log("✅ Order criada para delivery:", orderResponse.data);
      }

      // ✅ CORREÇÃO: A API retorna orderId (com I maiúsculo)
      const orderId = orderResponse.data.orderId || orderResponse.data.id || orderResponse.data.order_id;
      
      if (!orderId) {
        console.log("❌ Estrutura completa da resposta:", JSON.stringify(orderResponse.data, null, 2));
        throw new Error("ID do pedido não retornado pela API");
      }

      console.log("🎯 Order ID obtido para delivery:", orderId);

      // ✅ 2. Atualizar endereço do cliente se necessário
      const cliente = clientes.find(c => c.id === clienteId);
      if (cliente && (!cliente.address_street || !cliente.address_number)) {
        console.log("🏠 Atualizando endereço do cliente:", cliente.name);
        
        try {
          await api.put(`/customers/${clienteId}`, {
            address_street: endereco.rua,
            address_number: endereco.numero,
            address_notes: endereco.complemento
          });
          console.log("✅ Endereço do cliente atualizado");
        } catch (updateError) {
          console.warn("⚠️ Não foi possível atualizar endereço do cliente:", updateError.message);
          // Não impede a venda se falhar a atualização do endereço
        }
      }

      // ✅ 3. Criar a sale - O user_id VEM DO TOKEN (não precisa enviar)
      const saleData = {
        order_id: orderId,
        customer_id: clienteId,
        total_amount: calcularTotal(),
        payment_method: paymentMethod,
        status: 'pending', // Delivery fica como pending até ser entregue
        // ❌ NÃO enviar user_id - ele vem do token via middleware
        items: produtos.map(produto => ({
          product_id: produto.id,
          quantity: produto.quantidade,
          unit_price: produto.preco,
          subtotal: produto.subtotal
        }))
      };

      console.log("💰 Criando sale para delivery:", saleData);
      console.log("👤 User ID (vindo do token):", user.id);

      // ✅ 4. Criar a venda usando a API configurada (já com token)
      const saleResponse = await api.post("/sales", saleData);

      console.log("✅ Delivery criado com sucesso:", saleResponse.data);

      Alert.alert(
        "Sucesso", 
        "Delivery realizado com sucesso!", 
        [
          { 
            text: "OK", 
            onPress: () => navigation.goBack() 
          }
        ]
      );
      
    } catch (error) {
      console.error("❌ Erro completo no delivery:", error);
      console.error("❌ Detalhes do erro:", error.response?.data);
      
      let errorMessage = "Não foi possível finalizar o delivery.";
      
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
  const clienteSelecionado = clientes.find(c => c.id === clienteId);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Novo Delivery</Text>
          <Text style={styles.userInfo}>Vendedor: {user?.name}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Seção Informações do Vendedor */}
        <View style={styles.userSection}>
          <Text style={styles.userLabel}>Vendedor:</Text>
          <Text style={styles.userName}>{user?.name} (ID: {user?.id})</Text>
        </View>

        {/* Seção Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente *</Text>
          <TouchableOpacity 
            style={styles.selectButton}
            onPress={() => setShowClientesModal(true)}
          >
            <Text style={clienteSelecionado ? styles.selectButtonText : styles.selectButtonPlaceholder}>
              {clienteSelecionado ? clienteSelecionado.name || clienteSelecionado.nome : "Selecionar cliente"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Seção Endereço */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço de Entrega *</Text>
          <TextInput
            style={styles.input}
            placeholder="Rua"
            value={endereco.rua}
            onChangeText={(text) => setEndereco({...endereco, rua: text})}
          />
          <View style={styles.enderecoRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              placeholder="Número"
              value={endereco.numero}
              onChangeText={(text) => setEndereco({...endereco, numero: text})}
            />
            <TextInput
              style={[styles.input, { flex: 2 }]}
              placeholder="Complemento (opcional)"
              value={endereco.complemento}
              onChangeText={(text) => setEndereco({...endereco, complemento: text})}
            />
          </View>
        </View>

        {/* Seção Produtos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produtos *</Text>
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
                    <Text style={styles.produtoPreco}>R$ {produto.preco.toFixed(2)}</Text>
                  </View>
                  <View style={styles.quantidadeContainer}>
                    <TouchableOpacity 
                      style={styles.quantidadeButton}
                      onPress={() => atualizarQuantidade(produto.id, produto.quantidade - 1)}
                    >
                      <Ionicons name="remove" size={16} color="#7b2ff7" />
                    </TouchableOpacity>
                    <Text style={styles.quantidadeText}>{produto.quantidade}</Text>
                    <TouchableOpacity 
                      style={styles.quantidadeButton}
                      onPress={() => atualizarQuantidade(produto.id, produto.quantidade + 1)}
                    >
                      <Ionicons name="add" size={16} color="#7b2ff7" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.subtotal}>R$ {produto.subtotal.toFixed(2)}</Text>
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
              style={[styles.paymentOption, paymentMethod === 'cash' && styles.paymentOptionSelected]}
              onPress={() => setPaymentMethod('cash')}
            >
              <Text style={[styles.paymentOptionText, paymentMethod === 'cash' && styles.paymentOptionTextSelected]}>
                Dinheiro
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.paymentOption, paymentMethod === 'card' && styles.paymentOptionSelected]}
              onPress={() => setPaymentMethod('card')}
            >
              <Text style={[styles.paymentOptionText, paymentMethod === 'card' && styles.paymentOptionTextSelected]}>
                Cartão
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.paymentOption, paymentMethod === 'pix' && styles.paymentOptionSelected]}
              onPress={() => setPaymentMethod('pix')}
            >
              <Text style={[styles.paymentOptionText, paymentMethod === 'pix' && styles.paymentOptionTextSelected]}>
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
            placeholder="Observações do delivery (opcional)"
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
          style={[styles.finalizarButton, loading && styles.finalizarButtonDisabled]}
          onPress={finalizarDelivery}
          disabled={loading || !isAuthenticated}
        >
          <Text style={styles.finalizarButtonText}>
            {loading ? "Processando..." : "Finalizar Delivery"}
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
                <Text style={styles.emptyModalText}>Nenhum cliente cadastrado</Text>
              ) : (
                clientes.map(cliente => (
                  <TouchableOpacity
                    key={cliente.id}
                    style={styles.clienteItem}
                    onPress={() => {
                      setClienteId(cliente.id);
                      // Preencher endereço automaticamente se o cliente já tiver
                      if (cliente.address_street && cliente.address_number) {
                        setEndereco({
                          rua: cliente.address_street,
                          numero: cliente.address_number,
                          complemento: cliente.address_notes || ""
                        });
                      }
                      setShowClientesModal(false);
                    }}
                  >
                    <Text style={styles.clienteNome}>{cliente.name || cliente.nome}</Text>
                    {cliente.phone && <Text style={styles.clientePhone}>{cliente.phone}</Text>}
                    {cliente.address_street && (
                      <Text style={styles.clienteEndereco}>
                        {cliente.address_street}, {cliente.address_number}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Produtos */}
      <Modal
        visible={showProdutosModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Produto</Text>
              <TouchableOpacity onPress={() => setShowProdutosModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {produtosDisponiveis.length === 0 ? (
                <Text style={styles.emptyModalText}>Nenhum produto disponível</Text>
              ) : (
                produtosDisponiveis.map(produto => (
                  <TouchableOpacity
                    key={produto.id}
                    style={styles.produtoModalItem}
                    onPress={() => adicionarProduto(produto)}
                  >
                    <View style={styles.produtoModalInfo}>
                      <Text style={styles.produtoModalNome}>
                        {produto.name || produto.nome}
                      </Text>
                      <Text style={styles.produtoModalPreco}>
                        R$ {parseFloat(produto.price || 0).toFixed(2)}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color="#7b2ff7" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ✅ ESTILOS ATUALIZADOS PARA DELIVERY
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f4fc",
    marginBottom: 120,
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
    marginBottom: 10,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  enderecoRow: {
    flexDirection: "row",
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyModalText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
  clienteItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clienteNome: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  clientePhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  clienteEndereco: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  produtoModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  produtoModalInfo: {
    flex: 1,
  },
  produtoModalNome: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  produtoModalPreco: {
    fontSize: 14,
    color: '#7b2ff7',
    marginTop: 4,
  },
});