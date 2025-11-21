import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext"; // ← Import do contexto
import api from "../../services/api"; // ← Import da API configurada

export default function CustomerScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState(null);

  // ✅ Usar o contexto de autenticação
  const { user, token, isAuthenticated } = useAuth();

  // Buscar clientes
  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomers();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchCustomers = async () => {
    try {
      // ✅ Verificar autenticação antes de fazer requisições
      if (!isAuthenticated) {
        console.log("❌ Usuário não autenticado na tela de clientes");
        Alert.alert("Erro", "Usuário não autenticado");
        return;
      }

      setLoading(true);
      console.log("📞 Carregando clientes para usuário:", user?.id);

      // ✅ Buscar clientes usando a API configurada (já com token)
      const response = await api.get("/customers");
      
      if (response.data) {
        console.log("✅ Clientes carregados:", response.data);
      }

      const data = response.data;
      
      // CORREÇÃO: Tratamento mais seguro dos dados
      let customersArray = [];

      if (Array.isArray(data)) {
        // Se o backend devolve um array diretamente
        customersArray = data;
      } else if (data && Array.isArray(data.data)) {
        // Se o backend devolve { data: [...] }
        customersArray = data.data;
      } else if (data && Array.isArray(data.customers)) {
        // Se o backend devolve { customers: [...] }
        customersArray = data.customers;
      } else {
        console.warn("Estrutura da resposta não reconhecida:", data);
        customersArray = [];
      }

      setCustomers(customersArray);
      setFilteredCustomers(customersArray);
      
      console.log(`✅ ${customersArray.length} clientes carregados para o usuário ${user.id}`);
    } catch (error) {
      console.error("❌ Erro ao carregar clientes:", error);
      
      let errorMessage = "Não foi possível carregar os clientes";
      
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
    }
  };

  // Filtrar clientes
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter((c) =>
      [c.name, c.phone, c.address_street]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query.toLowerCase()))
    );
    setFilteredCustomers(filtered);
  };

  // Criar ou atualizar
  const handleSave = async () => {
    // ✅ Verificar autenticação
    if (!isAuthenticated) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }

    if (!name.trim()) {
      Alert.alert("Erro", "O nome é obrigatório.");
      return;
    }

    const newCustomer = {
      name,
      phone,
      address_street: street,
      address_number: number,
      address_notes: notes,
    };

    try {
      console.log("💾 Salvando cliente...", newCustomer);

      if (editingId) {
        // ✅ Atualizar cliente usando a API configurada
        await api.put(`/customers/${editingId}`, newCustomer);
        Alert.alert("Sucesso", "Cliente atualizado!");
      } else {
        // ✅ Criar cliente usando a API configurada
        await api.post("/customers", newCustomer);
        Alert.alert("Sucesso", "Cliente criado!");
      }

      // Limpar formulário
      setName("");
      setPhone("");
      setStreet("");
      setNumber("");
      setNotes("");
      setEditingId(null);
      
      // Recarregar lista
      fetchCustomers();
    } catch (error) {
      console.error("❌ Erro ao salvar cliente:", error);
      
      let errorMessage = "Não foi possível salvar o cliente";
      
      if (error.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert("Erro", errorMessage);
    }
  };

  // Excluir
  const handleDelete = async (id) => {
    // ✅ Verificar autenticação
    if (!isAuthenticated) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }

    Alert.alert("Confirmação", "Deseja excluir este cliente?", [
      { text: "Cancelar" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            console.log("🗑️ Excluindo cliente ID:", id);
            
            // ✅ Excluir cliente usando a API configurada
            await api.delete(`/customers/${id}`);
            
            Alert.alert("Sucesso", "Cliente excluído com sucesso!");
            fetchCustomers();
          } catch (error) {
            console.error("❌ Erro ao excluir cliente:", error);
            
            let errorMessage = "Não foi possível excluir o cliente";
            
            if (error.response?.status === 401) {
              errorMessage = "Sessão expirada. Faça login novamente.";
            } else if (error.response?.data?.message) {
              errorMessage = error.response.data.message;
            }
            
            Alert.alert("Erro", errorMessage);
          }
        },
      },
    ]);
  };

  // Editar
  const handleEdit = (customer) => {
    setName(customer.name);
    setPhone(customer.phone || "");
    setStreet(customer.address_street || "");
    setNumber(customer.address_number || "");
    setNotes(customer.address_notes || "");
    setEditingId(customer.id);
  };

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
            Faça login para gerenciar clientes
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Cabeçalho igual ao da tela de Vendas */}
        <LinearGradient
          colors={["#872bb8", "#311aa4"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.title}>Clientes</Text>
              <Text style={styles.userInfo}>Gerencie seus clientes</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Conteúdo */}
        <View style={styles.content}>
          {/* Formulário */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>
              {editingId ? "Editar Cliente" : "Cadastrar Cliente"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nome *"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Telefone"
              placeholderTextColor="#999"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              placeholder="Rua"
              placeholderTextColor="#999"
              value={street}
              onChangeText={setStreet}
            />
            <TextInput
              style={styles.input}
              placeholder="Número"
              placeholderTextColor="#999"
              value={number}
              onChangeText={setNumber}
            />
            <TextInput
              style={styles.input}
              placeholder="Observações"
              placeholderTextColor="#999"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <TouchableOpacity 
              style={[
                styles.saveButton, 
                !name.trim() && styles.saveButtonDisabled
              ]} 
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={styles.saveButtonText}>
                {editingId ? "Atualizar Cliente" : "Adicionar Cliente"}
              </Text>
            </TouchableOpacity>

            {editingId && (
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setName("");
                  setPhone("");
                  setStreet("");
                  setNumber("");
                  setNotes("");
                  setEditingId(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar Edição</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 🔍 Barra de Pesquisa */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color="#555"
              style={{ marginRight: 8 }}
            />
            <TextInput
              placeholder="Buscar por nome, telefone ou rua..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={handleSearch}
              style={styles.searchInput}
            />
          </View>

          {/* Lista de Clientes */}
          <Text style={styles.sectionTitle}>
            {searchQuery.length > 0
              ? `${filteredCustomers.length} resultado(s) encontrado(s)`
              : `Lista de Clientes (${customers.length})`}
          </Text>

          {loading ? (
            <View style={styles.loadingCustomers}>
              <ActivityIndicator size="small" color="#7b2ff7" />
              <Text style={styles.loadingCustomersText}>Carregando clientes...</Text>
            </View>
          ) : filteredCustomers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </Text>
              <Text style={styles.emptyMessage}>
                {searchQuery ? "Tente alterar os termos da busca" : "Cadastre seu primeiro cliente acima"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    {item.phone && (
                      <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={14} color="#666" />
                        <Text style={styles.cardInfo}>{item.phone}</Text>
                      </View>
                    )}
                    {(item.address_street || item.address_number) && (
                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={14} color="#666" />
                        <Text style={styles.cardInfo}>
                          {item.address_street} {item.address_number}
                        </Text>
                      </View>
                    )}
                    {item.address_notes ? (
                      <View style={styles.infoRow}>
                        <Ionicons name="document-text-outline" size={14} color="#666" />
                        <Text style={styles.cardNotes}>{item.address_notes}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cardButtons}>
                    <TouchableOpacity
                      onPress={() => handleEdit(item)}
                      style={styles.editButton}
                    >
                      <Ionicons name="create-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
        <View style={styles.Space}></View>
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    marginLeft: -26, // Compensa o ícone de voltar
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  userInfo: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.8,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    marginTop: 18,
    paddingBottom: 20,
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    elevation: 3,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
  },
  input: {
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  saveButton: {
    backgroundColor: "#872bb8",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 5,
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    padding: 10,
    alignItems: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    elevation: 3,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333"
  },
  loadingCustomers: {
    alignItems: "center",
    padding: 20,
  },
  loadingCustomersText: {
    marginTop: 8,
    fontSize: 14,
    color: "#7b2ff7",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 12,
    marginBottom: 6,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  cardInfo: {
    color: "#666",
    fontSize: 14,
    marginLeft: 6,
  },
  cardNotes: {
    fontStyle: "italic",
    color: "#999",
    fontSize: 14,
    marginLeft: 6,
  },
  cardButtons: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  editButton: {
    backgroundColor: "#4CAF50",
    padding: 8,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: "#E53935",
    padding: 8,
    borderRadius: 8,
  },
  Space: {
    marginBottom: 80,
  },
});