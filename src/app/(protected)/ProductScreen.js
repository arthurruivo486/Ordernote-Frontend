
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Não inserir produtos estáticos aqui — estes dados vêm do banco/API.
// Configure `API_BASE_URL` para apontar para seu backend (ex.: 'http://localhost:3333').
const API_BASE_URL = process.env.API_BASE_URL || 'https://h8gt5rj4-3000.brs.devtunnels.ms/api';
const ENDPOINTS = {
  PRODUCT_GROUPS: `${API_BASE_URL}/product_groups`,
  PRODUCTS: `${API_BASE_URL}/products`,
};

export default function ProductScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [productGroups, setProductGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupIcon, setNewGroupIcon] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  async function fetchProductGroups() {
    try {
      const res = await fetch(ENDPOINTS.PRODUCT_GROUPS);
      if (!res.ok) throw new Error(`Groups fetch failed: ${res.status}`);
      const data = await res.json();
      setProductGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('fetchProductGroups error', err.message);
      setProductGroups([]);
    }
  }

  async function fetchProducts() {
    try {
      const res = await fetch(ENDPOINTS.PRODUCTS);
      if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      // por padrão mostrar apenas ativos
      setFilteredProducts(list.filter(p => p.is_active !== false));
    } catch (err) {
      console.warn('fetchProducts error', err.message);
      setProducts([]);
      setFilteredProducts([]);
    }
  }

  useEffect(() => {
    // Carrega grupos e produtos do backend ao montar o componente
    fetchProductGroups();
    fetchProducts();
  }, []);

  function filterAndSet({ groupId = selectedGroupId, query = searchQuery } = {}) {
    let base = products.filter(p => p.is_active !== false);
    if (groupId) base = base.filter(p => p.group_id === groupId);
    if (query) base = base.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    setFilteredProducts(base);
  }

  function handleSelectGroup(groupId) {
    const newId = groupId === selectedGroupId ? null : groupId;
    setSelectedGroupId(newId);
    filterAndSet({ groupId: newId, query: searchQuery });
  }

  function handleSearch(text) {
    setSearchQuery(text);
    filterAndSet({ groupId: selectedGroupId, query: text });
  }

  async function createGroup() {
    if (!newGroupName.trim()) {
      Alert.alert('Validação', 'Nome da categoria é obrigatório');
      return;
    }
    setCreatingGroup(true);
    try {
      const res = await fetch(ENDPOINTS.PRODUCT_GROUPS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newGroupName.trim(), icon: newGroupIcon.trim() || null }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${text}`);
      }

      // Tenta ler o objeto criado (alguns backends retornam o recurso criado)
      let created = null;
      try {
        created = await res.json();
      } catch (e) {
        created = null;
      }

      setNewGroupName('');
      setNewGroupIcon('');

      // Se o backend retornou o grupo criado com id, atualiza otimisticamente
      if (created && created.id) {
        setProductGroups(prev => [created, ...prev]);
      } else {
        // caso não tenha retornado, recarrega a lista do servidor
        await fetchProductGroups();
      }

      Alert.alert('Sucesso', 'Categoria criada com sucesso');
    } catch (err) {
      console.warn('createGroup error', err.message);
      Alert.alert('Erro', 'Não foi possível criar a categoria');
    } finally {
      setCreatingGroup(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <LinearGradient
          colors={["#872bb8", "#311aa4"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.navigate('Product')}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Produtos</Text>
          </View>
        </LinearGradient>

        <View style={styles.createWrapper}>
          <TextInput
            placeholder="Nome da categoria"
            value={newGroupName}
            onChangeText={setNewGroupName}
            style={styles.createInput}
          />
          <TextInput
            placeholder="Emoji (opcional)"
            value={newGroupIcon}
            onChangeText={setNewGroupIcon}
            style={styles.createInput}
          />
          <TouchableOpacity style={styles.createButton} onPress={createGroup} disabled={creatingGroup}>
            <Text style={styles.createButtonText}>{creatingGroup ? 'Criando...' : 'Criar categoria'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.productList}>
          {productGroups.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[styles.productItem, selectedGroupId === g.id && styles.groupItemActive]}
              onPress={() => handleSelectGroup(g.id)}
            >
              <Text style={styles.groupEmoji}>{g.icon ? `${g.icon}` : '📁'}</Text>
              <Text style={styles.productTitle}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchWrapper}>
          <TextInput
            placeholder="Buscar produto..."
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.productList}>
          {filteredProducts.map(prod => (
            <TouchableOpacity key={prod.id} style={styles.productItem}>
              {prod.image_url ? (
                <Image source={{ uri: prod.image_url }} style={styles.productImage} />
              ) : null}
              <Text style={styles.productTitle}>{prod.name}</Text>
              <Text style={styles.productDescription}>{prod.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
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

  productList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  productItem: {
    backgroundColor: "#fff",
    width: "47%",
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
  createWrapper: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  createInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 8,
  },
  createButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  groupContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  groupName: {
    color: '#333',
    fontWeight: '600',
  },
  groupItemActive: {
    borderColor: '#7b2ff7',
    borderWidth: 2,
    shadowColor: '#7b2ff7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    elevation: 4,
  },
}