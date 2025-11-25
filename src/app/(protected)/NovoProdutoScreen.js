import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Alert, Modal, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

// ✅ CORREÇÃO: Endpoint atualizado para produtos
const ENDPOINTS = {
  PRODUCT_GROUPS: '/product_groups',
  PRODUCTS: '/products', // ✅ Alterado para plural (mais comum)
};

export default function NovoProdutoScreen({ navigation, route }) {
  const { editingProduct, categoryId } = route.params || {};
  const [productGroups, setProductGroups] = useState([]);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    group_id: '',
    is_active: true
  });

  useEffect(() => {
    if (editingProduct) {
      setProductForm({
        name: editingProduct.name || '',
        description: editingProduct.description || '',
        price: editingProduct.price?.toString() || '',
        stock: editingProduct.stock?.toString() || '',
        group_id: editingProduct.group_id || '',
        is_active: editingProduct.is_active !== undefined ? editingProduct.is_active : true
      });
    } else if (categoryId) {
      setProductForm(prev => ({
        ...prev,
        group_id: categoryId
      }));
    }
    fetchProductGroups();
  }, [editingProduct, categoryId]);

  async function fetchProductGroups() {
    try {
      console.log('🔄 Buscando grupos de produtos...');
      const res = await api.get(ENDPOINTS.PRODUCT_GROUPS);
      const data = res.data;
      
      console.log('✅ Resposta dos grupos:', data);
      
      if (Array.isArray(data)) {
        setProductGroups(data);
      } else if (data && typeof data === 'object') {
        const possibleArrays = ['data', 'product_groups', 'groups', 'items', 'results'];
        let foundArray = null;
        for (const key of possibleArrays) {
          if (Array.isArray(data[key])) {
            foundArray = data[key];
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
      console.log(`✅ ${productGroups.length} grupos carregados`);
    } catch (err) {
      console.warn('❌ Erro ao buscar grupos:', err);
      console.warn('❌ Detalhes do erro:', err.response?.data);
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
      setProductGroups([]);
    }
  }

  async function handleSaveProduct() {
    if (!productForm.name.trim()) {
      Alert.alert('Validação', 'Nome do produto é obrigatório');
      return;
    }

    if (!productForm.price || isNaN(parseFloat(productForm.price))) {
      Alert.alert('Validação', 'Preço é obrigatório e deve ser um número');
      return;
    }

    setCreatingProduct(true);
    try {
      // ✅ CORREÇÃO: Removido image_url do frontend, mas mantido no backend como null
      const productData = {
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        image_url: null, // ✅ REMOVIDO do frontend, enviado como null para backend
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock) || 0,
        group_id: productForm.group_id ? parseInt(productForm.group_id) : null,
        user_id: 1, // ✅ Ajuste para o ID do usuário logado
        is_active: Boolean(productForm.is_active)
      };

      console.log('🔄 Enviando dados do produto:', productData);

      let endpoint = ENDPOINTS.PRODUCTS;
      
      // ✅ CORREÇÃO: Tentando diferentes formatos de endpoint
      if (editingProduct) {
        // Tentativa 1: /products/{id}
        try {
          await api.put(`${endpoint}/${editingProduct.id}`, productData);
          Alert.alert('Sucesso', 'Produto atualizado com sucesso');
          navigation.goBack();
          return;
        } catch (err) {
          console.warn('❌ Erro na tentativa 1:', err.response?.data);
          // Tentativa 2: /product/{id} (singular)
          try {
            await api.put(`/product/${editingProduct.id}`, productData);
            Alert.alert('Sucesso', 'Produto atualizado com sucesso');
            navigation.goBack();
            return;
          } catch (err2) {
            console.warn('❌ Erro na tentativa 2:', err2.response?.data);
            throw err2;
          }
        }
      } else {
        // Tentativa 1: /products
        try {
          await api.post(endpoint, productData);
          Alert.alert('Sucesso', 'Produto criado com sucesso');
          navigation.goBack();
          return;
        } catch (err) {
          console.warn('❌ Erro na tentativa 1:', err.response?.data);
          // Tentativa 2: /product (singular)
          try {
            await api.post('/product', productData);
            Alert.alert('Sucesso', 'Produto criado com sucesso');
            navigation.goBack();
            return;
          } catch (err2) {
            console.warn('❌ Erro na tentativa 2:', err2.response?.data);
            throw err2;
          }
        }
      }
    } catch (err) {
      console.warn('❌ Erro ao salvar produto:', err);
      console.warn('❌ Detalhes do erro:', err.response?.data);
      console.warn('❌ URL da requisição:', err.config?.url);
      
      let errorMessage = 'Não foi possível salvar o produto';
      
      if (err.response?.status === 500) {
        errorMessage = 'Erro interno do servidor. Verifique os logs do backend.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Endpoint não encontrado. Verifique a URL da API.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setCreatingProduct(false);
    }
  }

  async function handleDeleteProduct() {
    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir "${productForm.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // ✅ CORREÇÃO: Tentando diferentes endpoints para delete
              try {
                await api.delete(`${ENDPOINTS.PRODUCTS}/${editingProduct.id}`);
              } catch (err) {
                await api.delete(`/product/${editingProduct.id}`);
              }
              Alert.alert('Sucesso', 'Produto excluído com sucesso');
              navigation.goBack();
            } catch (err) {
              console.warn('❌ Erro ao excluir produto:', err);
              console.warn('❌ Detalhes do erro:', err.response?.data);
              Alert.alert('Erro', 'Não foi possível excluir o produto');
            }
          }
        }
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#872bb8", "#311aa4"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          style={styles.formContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          
          <Text style={styles.formLabel}>Nome do Produto *</Text>
          <TextInput
            placeholder="Digite o nome do produto"
            value={productForm.name}
            onChangeText={(text) => setProductForm({...productForm, name: text})}
            style={styles.formInput}
          />

          <Text style={styles.formLabel}>Descrição</Text>
          <TextInput
            placeholder="Descrição do produto (opcional)"
            value={productForm.description}
            onChangeText={(text) => setProductForm({...productForm, description: text})}
            style={[styles.formInput, styles.textArea]}
            multiline
            numberOfLines={3}
          />

          {/* ✅ REMOVIDO: Campo de URL da imagem */}

          <Text style={styles.formLabel}>Preço *</Text>
          <TextInput
            placeholder="0.00"
            value={productForm.price}
            onChangeText={(text) => setProductForm({...productForm, price: text})}
            style={styles.formInput}
            keyboardType="decimal-pad"
          />

          <Text style={styles.formLabel}>Estoque</Text>
          <TextInput
            placeholder="0"
            value={productForm.stock}
            onChangeText={(text) => setProductForm({...productForm, stock: text})}
            style={styles.formInput}
            keyboardType="numeric"
          />

          <Text style={styles.formLabel}>Categoria</Text>
          <View style={styles.categoryPicker}>
            {productGroups.map(group => (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.categoryOption,
                  productForm.group_id === group.id && styles.categoryOptionSelected
                ]}
                onPress={() => setProductForm({...productForm, group_id: group.id})}
              >
                <Text style={styles.categoryOptionEmoji}>
                  {group.icon || group.emoji || '📁'}
                </Text>
                <Text style={[
                  styles.categoryOptionName,
                  productForm.group_id === group.id && styles.categoryOptionNameSelected
                ]}>
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Status Ativo */}
          <Text style={styles.formLabel}>Status do Produto</Text>
          <View style={styles.statusContainer}>
            <TouchableOpacity
              style={[
                styles.statusOption,
                productForm.is_active && styles.statusOptionActive
              ]}
              onPress={() => setProductForm({...productForm, is_active: true})}
            >
              <Text style={[
                styles.statusText,
                productForm.is_active && styles.statusTextActive
              ]}>
                ✅ Ativo
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.statusOption,
                !productForm.is_active && styles.statusOptionInactive
              ]}
              onPress={() => setProductForm({...productForm, is_active: false})}
            >
              <Text style={[
                styles.statusText,
                !productForm.is_active && styles.statusTextInactive
              ]}>
                ❌ Inativo
              </Text>
            </TouchableOpacity>
          </View>

          {/* BOTÃO PRINCIPAL PARA CRIAR/ATUALIZAR PRODUTO */}
          <TouchableOpacity 
            style={styles.saveProductButton}
            onPress={handleSaveProduct}
            disabled={creatingProduct}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.saveProductButtonText}>
              {creatingProduct ? 'Salvando...' : (editingProduct ? 'Atualizar Produto' : 'Criar Produto')}
            </Text>
          </TouchableOpacity>

          {editingProduct && (
            <TouchableOpacity style={styles.deleteProductButton} onPress={handleDeleteProduct}>
              <Text style={styles.deleteProductButtonText}>
                Excluir Produto
              </Text>
            </TouchableOpacity>
          )}

          {/* ESPAÇAMENTO EXTRA NO FINAL PARA EVITAR SOBREPOSIÇÃO */}
          <View style={styles.bottomSpacing} />
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 36,
  },
  keyboardAvoid: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  formInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryOptionSelected: {
    backgroundColor: '#872bb8',
    borderColor: '#311aa4',
  },
  categoryOptionEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryOptionName: {
    fontSize: 14,
    color: '#333',
  },
  categoryOptionNameSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  statusOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  statusOptionActive: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  statusOptionInactive: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  statusTextActive: {
    color: '#155724',
  },
  statusTextInactive: {
    color: '#721c24',
  },
  saveProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#311aa4',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  saveProductButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteProductButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteProductButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 30,
  },
});