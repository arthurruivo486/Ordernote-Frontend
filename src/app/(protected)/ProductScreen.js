import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import { 
  View, Text, ScrollView, TouchableOpacity, TextInput, Image, Alert, 
  Modal, FlatList, StyleSheet, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from "../../context/AuthContext"; // ← Import do contexto
import api from '../../services/api';

const ENDPOINTS = {
  PRODUCT_GROUPS: '/product_groups',
  PRODUCTS: '/products',
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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Usar o contexto de autenticação
  const { user, token, isAuthenticated } = useAuth();

  // Buscar dados
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchProductGroups(),
        fetchProducts()
      ]);
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  async function fetchProductGroups() {
    try {
      // ✅ Verificar autenticação
      if (!isAuthenticated) {
        console.log("❌ Usuário não autenticado na tela de produtos");
        return;
      }

      console.log('🔄 Buscando grupos de produtos...');
      const res = await api.get(ENDPOINTS.PRODUCT_GROUPS);
      const data = res.data;
      
      if (Array.isArray(data)) {
        console.log(`✅ ${data.length} grupos carregados da API`);
        setProductGroups(data);
      } else if (data && typeof data === 'object') {
        const possibleArrays = ['data', 'product_groups', 'groups', 'items', 'results'];
        let foundArray = null;
        
        for (const key of possibleArrays) {
          if (Array.isArray(data[key])) {
            foundArray = data[key];
            console.log(`✅ Array encontrado na chave "${key}": ${foundArray.length} grupos`);
            break;
          }
        }
        
        if (foundArray) {
          setProductGroups(foundArray);
        } else {
          const groupsArray = Object.values(data).filter(item => 
            item && typeof item === 'object' && (item.name || item.id)
          );
          setProductGroups(groupsArray);
        }
      } else {
        setProductGroups([]);
      }
    } catch (err) {
      console.warn('❌ Erro ao buscar grupos:', err);
      
      let errorMessage = "Não foi possível carregar as categorias";
      
      if (err.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      Alert.alert('Erro', errorMessage);
      setProductGroups([]);
    }
  }

  async function fetchProducts() {
    try {
      // ✅ Verificar autenticação
      if (!isAuthenticated) {
        console.log("❌ Usuário não autenticado");
        return;
      }

      const res = await api.get(ENDPOINTS.PRODUCTS);
      const data = res.data;
      
      // CORREÇÃO: Tratamento mais seguro dos dados (igual ao da tela de clientes)
      let productsArray = [];

      if (Array.isArray(data)) {
        productsArray = data;
      } else if (data && Array.isArray(data.data)) {
        productsArray = data.data;
      } else if (data && Array.isArray(data.products)) {
        productsArray = data.products;
      } else {
        console.warn("Estrutura da resposta não reconhecida:", data);
        productsArray = [];
      }

      setProducts(productsArray);
      setFilteredProducts(productsArray.filter(p => p.is_active !== false));
      
      console.log(`✅ ${productsArray.length} produtos carregados para o usuário ${user?.id}`);
    } catch (err) {
      console.warn('❌ Erro ao buscar produtos:', err);
      
      let errorMessage = "Não foi possível carregar os produtos";
      
      if (err.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      Alert.alert('Erro', errorMessage);
      setProducts([]);
      setFilteredProducts([]);
    }
  }

  function handleSelectGroup(groupId) {
    const group = productGroups.find(g => g.id === groupId);
    if (group) {
      setSelectedCategory(group);
      setShowCategoryModal(true);
    }
  }

  function handleSearch(text) {
    setSearchQuery(text);
    let filtered = products.filter(p => p.is_active !== false);
    if (text) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(text.toLowerCase())
      );
    }
    setFilteredProducts(filtered);
  }

  function handleCloseCategoryModal() {
    setShowCategoryModal(false);
    setSelectedCategory(null);
  }

  function getProductsByCategory(categoryId) {
    return products.filter(p => p.group_id === categoryId && p.is_active !== false);
  }

  // Funções para navegar para a tela de produto
function openAddProductModal(categoryId = null) {

  navigation.navigate('NovoProdutoScreen', { categoryId });
}

function openEditProductModal(product) {
  navigation.navigate('NovoProdutoScreen', { editingProduct: product });
}

  async function handleDeleteProduct(product) {
    // ✅ Verificar autenticação
    if (!isAuthenticated) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }

    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir "${product.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`${ENDPOINTS.PRODUCTS}/${product.id}`);
              Alert.alert('Sucesso', 'Produto excluído com sucesso');
              await fetchProducts();
            } catch (err) {
              console.warn('❌ Erro ao excluir produto:', err);
              
              let errorMessage = "Não foi possível excluir o produto";
              
              if (err.response?.status === 401) {
                errorMessage = "Sessão expirada. Faça login novamente.";
              } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
              }
              
              Alert.alert('Erro', errorMessage);
            }
          }
        }
      ]
    );
  }

  async function createGroup() {
    // ✅ Verificar autenticação
    if (!isAuthenticated) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }

    if (!newGroupName.trim()) {
      Alert.alert('Validação', 'Nome da categoria é obrigatório');
      return;
    }

    setCreatingGroup(true);
    try {
      await api.post(ENDPOINTS.PRODUCT_GROUPS, {
        name: newGroupName.trim(),
        icon: newGroupIcon.trim() || null,
      });
      
      await fetchProductGroups();
      setNewGroupName('');
      setNewGroupIcon('');
      Alert.alert('Sucesso', 'Categoria criada com sucesso');
    } catch (err) {
      console.warn('❌ Erro ao criar categoria:', err);
      
      let errorMessage = "Não foi possível criar a categoria";
      
      if (err.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setCreatingGroup(false);
    }
  }

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
            Faça login para gerenciar produtos
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

  // Componente para a modal de produtos por categoria
  const CategoryProductsModal = () => {
    const categoryProducts = selectedCategory ? getProductsByCategory(selectedCategory.id) : [];
    
    return (
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        onRequestClose={handleCloseCategoryModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <LinearGradient
            colors={["#872bb8", "#311aa4"]}
            style={styles.modalHeader}
          >
            <View style={styles.modalHeaderContent}>
              <TouchableOpacity 
                onPress={handleCloseCategoryModal}
                style={styles.backButton}
              >
                <Ionicons name="chevron-back" size={26} color="#fff" />
              </TouchableOpacity>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalCategoryEmoji}>
                  {selectedCategory?.icon || selectedCategory?.emoji || '📁'}
                </Text>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedCategory?.name || 'Categoria'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => openAddProductModal(selectedCategory?.id)}
                style={styles.addButton}
              >
                <Ionicons name="add" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.modalContent}>
            <Text style={styles.productsCount}>
              {categoryProducts.length} produto{categoryProducts.length !== 1 ? 's' : ''} nesta categoria
            </Text>
            
            {categoryProducts.length > 0 ? (
              <FlatList
                data={categoryProducts}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.productsList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.productListItem}
                    onPress={() => openEditProductModal(item)}
                    onLongPress={() => handleDeleteProduct(item)}
                  >
                    {item.image_url ? (
                      <Image 
                        source={{ uri: item.image_url }} 
                        style={styles.productListImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.productListImagePlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#ccc" />
                      </View>
                    )}
                    <View style={styles.productListInfo}>
                      <Text style={styles.productListName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.productListPrice}>
                        {formatBRL(item.price)}
                      </Text>
                      {item.description ? (
                        <Text style={styles.productListDescription} numberOfLines={1}>
                          {item.description}
                        </Text>
                      ) : null}
                      <Text style={styles.productListStock}>
                        Estoque: {item.stock || 0}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="file-tray-outline" size={64} color="#ccc" />
                <Text style={styles.emptyStateText}>
                  Nenhum produto nesta categoria
                </Text>
                <TouchableOpacity 
                  style={styles.addFirstProductButton}
                  onPress={() => openAddProductModal(selectedCategory?.id)}
                >
                  <Text style={styles.addFirstProductButtonText}>
                    Adicionar primeiro produto
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    );
  };

  const formatBRL = (value) => {
    const n = Number(value || 0);
    return n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

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
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.title}>Produtos</Text>
              <Text style={styles.userInfo}>Gerencie seus produtos</Text>
            </View>
            <TouchableOpacity onPress={() => openAddProductModal()}>
              <Ionicons name="add" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Formulário de criação de categoria */}
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
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={createGroup} 
            disabled={creatingGroup}
          >
            <Text style={styles.createButtonText}>
              {creatingGroup ? 'Criando...' : 'Criar categoria'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de categorias */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>
            Categorias ({productGroups.length})
          </Text>
          
          {loading ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" color="#7b2ff7" />
              <Text style={styles.loadingText}>Carregando categorias...</Text>
            </View>
          ) : (
            <View style={styles.categoriesGrid}>
              {productGroups.map(g => {
                const emoji = g.icon || g.emoji || g.symbol || '📁';
                const name = g.name || g.title || g.label || 'Sem nome';
                const productCount = products.filter(p => p.group_id === g.id && p.is_active !== false).length;
                
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={styles.categoryCard}
                    onPress={() => handleSelectGroup(g.id)}
                  >
                    <Text style={styles.categoryEmoji}>{emoji}</Text>
                    <Text style={styles.categoryName} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.categoryCount}>
                      {productCount} produto{productCount !== 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {!loading && productGroups.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="folder-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
                Nenhuma categoria encontrada
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Crie sua primeira categoria acima
              </Text>
            </View>
          )}
        </View>

        {/* Busca e lista de produtos */}
        <View style={styles.searchWrapper}>
          <TextInput
            placeholder="Buscar produto..."
            value={searchQuery}
            onChangeText={handleSearch}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>
            {searchQuery ? `Resultados (${filteredProducts.length})` : `Todos os Produtos (${filteredProducts.length})`}
          </Text>
          
          {loading ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" color="#7b2ff7" />
              <Text style={styles.loadingText}>Carregando produtos...</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map(prod => (
                <TouchableOpacity 
                  key={prod.id} 
                  style={styles.productCard}
                  onPress={() => openEditProductModal(prod)}
                >
                  {prod.image_url ? (
                    <Image 
                      source={{ uri: prod.image_url }} 
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color="#ccc" />
                    </View>
                  )}
                  <Text style={styles.productName} numberOfLines={2}>
                    {prod.name}
                  </Text>
                  <Text style={styles.productPrice}>
                    {formatBRL(prod.price)}
                  </Text>
                  {prod.description ? (
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {prod.description}
                    </Text>
                  ) : null}
                  <Text style={styles.productStock}>
                    Estoque: {prod.stock || 0}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!loading && filteredProducts.length === 0 && products.length > 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
                Nenhum produto encontrado
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Tente alterar os termos da busca
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.Space}></View>
      </ScrollView>

      {/* Modal de produtos por categoria */}
      <CategoryProductsModal />
    </SafeAreaView>
  );
}

// ✅ ESTILOS ATUALIZADOS (incluindo os mesmos da tela de clientes)
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
    justifyContent: "space-between",
    marginBottom: 40,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
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
  createWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 20,
  },
  createInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
  categoriesSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  loadingSection: {
    alignItems: 'center',
    padding: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryName: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryCount: {
    color: '#666',
    fontSize: 11,
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: '#fff',
    width: '48%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  productName: {
    color: '#111',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  productPrice: {
    color: '#7b2ff7',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 4,
  },
  productDescription: {
    color: '#666',
    fontSize: 11,
    marginBottom: 4,
  },
  productStock: {
    color: '#888',
    fontSize: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9f4fc',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalCategoryEmoji: {
    fontSize: 20,
    marginRight: 8,
    color: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  productsCount: {
    color: '#666',
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  productsList: {
    paddingBottom: 20,
  },
  productListItem: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productListImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  productListImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productListInfo: {
    flex: 1,
  },
  productListName: {
    color: '#111',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  productListPrice: {
    color: '#7b2ff7',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  productListDescription: {
    color: '#666',
    fontSize: 11,
    marginBottom: 2,
  },
  productListStock: {
    color: '#888',
    fontSize: 10,
  },
  addFirstProductButton: {
    backgroundColor: '#7b2ff7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  addFirstProductButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  Space: {
    marginBottom: 80,
  },
});