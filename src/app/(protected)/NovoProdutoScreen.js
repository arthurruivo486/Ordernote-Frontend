import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Image, Alert,
  Modal, StyleSheet, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

const ENDPOINTS = {
  PRODUCT_GROUPS: '/product_groups',
  PRODUCTS: '/products',
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
    image_url: ''
  });

  useEffect(() => {
    if (editingProduct) {
      setProductForm({
        name: editingProduct.name || '',
        description: editingProduct.description || '',
        price: editingProduct.price?.toString() || '',
        stock: editingProduct.stock?.toString() || '',
        group_id: editingProduct.group_id || '',
        image_url: editingProduct.image_url || ''
      });
    } else if (categoryId) {
      setProductForm(prev => ({ ...prev, group_id: categoryId }));
    }
    
    fetchProductGroups();
  }, [editingProduct, categoryId]);

  async function fetchProductGroups() {
    try {
      const res = await api.get(ENDPOINTS.PRODUCT_GROUPS);
      const data = res.data;
      
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
    } catch (err) {
      console.warn('❌ Erro ao buscar grupos:', err);
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
      const productData = {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock) || 0,
        group_id: productForm.group_id ? parseInt(productForm.group_id) : null,
        image_url: productForm.image_url.trim() || null,
        is_active: true
      };

      if (editingProduct) {
        await api.put(`${ENDPOINTS.PRODUCTS}/${editingProduct.id}`, productData);
        Alert.alert('Sucesso', 'Produto atualizado com sucesso');
      } else {
        await api.post(ENDPOINTS.PRODUCTS, productData);
        Alert.alert('Sucesso', 'Produto criado com sucesso');
      }

      navigation.goBack();
    } catch (err) {
      console.warn('Erro ao salvar produto:', err);
      Alert.alert('Erro', 'Não foi possível salvar o produto');
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
              await api.delete(`${ENDPOINTS.PRODUCTS}/${editingProduct.id}`);
              Alert.alert('Sucesso', 'Produto excluído com sucesso');
              navigation.goBack();
            } catch (err) {
              console.warn('Erro ao excluir produto:', err);
              Alert.alert('Erro', 'Não foi possível excluir o produto');
            }
          }
        }
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#872bb8", "#311aa4"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
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
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
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

          <Text style={styles.formLabel}>URL da Imagem</Text>
          <TextInput
            placeholder="https://exemplo.com/imagem.jpg (opcional)"
            value={productForm.image_url}
            onChangeText={(text) => setProductForm({...productForm, image_url: text})}
            style={styles.formInput}
          />

          <TouchableOpacity 
            style={styles.saveProductButton}
            onPress={handleSaveProduct}
            disabled={creatingProduct}
          >
            <Text style={styles.saveProductButtonText}>
              {creatingProduct ? 'Salvando...' : (editingProduct ? 'Atualizar Produto' : 'Criar Produto')}
            </Text>
          </TouchableOpacity>

          {editingProduct && (
            <TouchableOpacity 
              style={styles.deleteProductButton}
              onPress={handleDeleteProduct}
            >
              <Text style={styles.deleteProductButtonText}>
                Excluir Produto
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f4fc",
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 26,
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formLabel: {
    color: '#333',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 6,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryOptionSelected: {
    backgroundColor: '#7b2ff7',
    borderColor: '#7b2ff7',
  },
  categoryOptionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryOptionName: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  categoryOptionNameSelected: {
    color: '#fff',
  },
  saveProductButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveProductButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  deleteProductButton: {
    backgroundColor: '#f44336',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  deleteProductButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});