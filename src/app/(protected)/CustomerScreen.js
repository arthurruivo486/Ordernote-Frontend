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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = "https://h8gt5rj4-3000.brs.devtunnels.ms/api/customers";

export default function CustomerScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Buscar clientes
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch(API_URL);

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.log("Resposta não-JSON:", text.substring(0, 200));
        throw new Error("Resposta não é JSON");
      }

      const data = await res.json();
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (err) {
      console.error("Erro detalhado:", err);
      Alert.alert(
        "Erro",
        `Não foi possível carregar os clientes: ${err.message}`
      );
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
      if (editingId) {
        await fetch(`${API_URL}/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCustomer),
        });
        Alert.alert("Sucesso", "Cliente atualizado!");
      } else {
        await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCustomer),
        });
        Alert.alert("Sucesso", "Cliente criado!");
      }

      setName("");
      setPhone("");
      setStreet("");
      setNumber("");
      setNotes("");
      setEditingId(null);
      fetchCustomers();
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Não foi possível salvar o cliente.");
    }
  };

  // Excluir
  const handleDelete = async (id) => {
    Alert.alert("Confirmação", "Deseja excluir este cliente?", [
      { text: "Cancelar" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await fetch(`${API_URL}/${id}`, { method: "DELETE" });
            fetchCustomers();
          } catch (err) {
            console.error(err);
            Alert.alert("Erro", "Não foi possível excluir o cliente.");
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Cabeçalho igual ao da tela de Vendas */}
        <LinearGradient
          colors={["#872bb8", "#311aa4"]}
          start={{ x: 1.2, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.navigate("Dashboard")}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Clientes</Text>
            
              
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
              placeholder="Nome"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Telefone"
              value={phone}
              onChangeText={setPhone}
            />
            <TextInput
              style={styles.input}
              placeholder="Rua"
              value={street}
              onChangeText={setStreet}
            />
            <TextInput
              style={styles.input}
              placeholder="Número"
              value={number}
              onChangeText={setNumber}
            />
            <TextInput
              style={styles.input}
              placeholder="Observações"
              value={notes}
              onChangeText={setNotes}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {editingId ? "Atualizar Cliente" : "Adicionar Cliente"}
              </Text>
            </TouchableOpacity>
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
              ? `${filteredCustomers.length} resultados encontrados`
              : `Lista de Clientes`}
          </Text>

          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardInfo}>{item.phone}</Text>
                  <Text style={styles.cardInfo}>
                    {item.address_street} {item.address_number}
                  </Text>
                  {item.address_notes ? (
                    <Text style={styles.cardNotes}>{item.address_notes}</Text>
                  ) : null}
                </View>

                <View style={styles.cardButtons}>
                  <TouchableOpacity
                    onPress={() => handleEdit(item)}
                    style={styles.editButton}
                  >
                    <Ionicons name="create-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        </View>
        <View style={styles.Space}>

        </View>
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
  title: {
    left:"32%",
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#f4f4f4",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: "#872bb8",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 3,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    elevation: 3,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  cardInfo: {
    color: "#666",
    fontSize: 14,
    marginTop: 4,
  },
  cardNotes: {
    fontStyle: "italic",
    color: "#999",
    marginTop: 4,
  },
  cardButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editButton: {
    backgroundColor: "#4CAF50",
    padding: 8,
    borderRadius: 10,
  },
  deleteButton: {
    backgroundColor: "#E53935",
    padding: 8,
    borderRadius: 10,
  },
  Space:{
    marginBottom:80,
  },
});