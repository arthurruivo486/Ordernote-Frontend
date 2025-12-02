import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from "../../context/AuthContext";
import api from '../../services/api';

const ENDPOINTS = {
  PRODUCT_GROUPS: '/product_groups',
  PRODUCTS: '/product',
};

export default function NovoProdutoScreen({ route, navigation }) {
  const { editingProduct, categoryId } = route.params || {};
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    group_id: null,
    image_url: ''
  });
  const [productGroups, setProductGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchProductGroups();
      initializeForm();
    }
  }, [isAuthenticated, editingProduct, categoryId]);

  const initializeForm = () => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || '',
        description: editingProduct.description || '',
        price: editingProduct.price ? String(editingProduct.price) : '',
        stock: editingProduct.stock ? String(editingProduct.stock) : '',
        group_id: editingProduct.group_id || null,
        image_url: editingProduct.image_url || ''
      });
    } else if (categoryId) {
      setFormData(prev => ({
        ...prev,
        group_id: categoryId
      }));
    }
  };

  const fetchProductGroups = async () => {
    try {
      setLoading(true);
      const res = await api.get(ENDPOINTS.PRODUCT_GROUPS);
      const data = res.data;
      
      let groupsArray = [];

      if (Array.isArray(data)) {
        groupsArray = data;
      } else if (data && Array.isArray(data.data)) {
        groupsArray = data.data;
      } else if (data && Array.isArray(data.product_groups)) {
        groupsArray = data.product_groups;
      }

      // Filtrar grupos do usuário atual
      const userGroups = groupsArray.filter(grupo => 
        !grupo.user_id || grupo.user_id === user?.id
      );

      setProductGroups(userGroups);
    } catch (error) {
      console.error("❌ Erro ao carregar categorias:", error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePriceChange = (value) => {
    // Permitir apenas números e ponto decimal
    const cleanedValue = value.replace(/[^0-9.]/g, '');
    
    // Garantir que há apenas um ponto decimal
    const parts = cleanedValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limitar a 2 casas decimais
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    handleInputChange('price', cleanedValue);
  };

  const handleStockChange = (value) => {
    // Permitir apenas números
    const cleanedValue = value.replace(/[^0-9]/g, '');
    handleInputChange('stock', cleanedValue);
  };

  const getSelectedCategoryName = () => {
    if (!formData.group_id) return 'Selecionar categoria';
    const category = productGroups.find(g => g.id === formData.group_id);
    return category ? category.name : 'Selecionar categoria';
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validação', 'Nome do produto é obrigatório');
      return false;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      Alert.alert('Validação', 'Preço deve ser maior que 0');
      return false;
    }

    if (formData.stock === '' || parseInt(formData.stock) < 0) {
      Alert.alert('Validação', 'Estoque deve ser 0 ou mais');
      return false;
    }

    if (!formData.group_id) {
      Alert.alert('Validação', 'Selecione uma categoria');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }

    if (!validateForm()) return;

    setSaving(true);
    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock || '0'),
        group_id: formData.group_id,
        image_url: formData.image_url.trim(),
        user_id: user.id // ✅ Incluir user_id
      };

      if (editingProduct) {
        await api.put(`${ENDPOINTS.PRODUCTS}/${editingProduct.id}`, productData);
        Alert.alert('Sucesso', 'Produto atualizado com sucesso');
      } else {
        await api.post(ENDPOINTS.PRODUCTS, productData);
        Alert.alert('Sucesso', 'Produto criado com sucesso');
      }

      navigation.goBack();
    } catch (error) {
      console.error('❌ Erro ao salvar produto:', error);
      
      let errorMessage = editingProduct 
        ? "Não foi possível atualizar o produto" 
        : "Não foi possível criar o produto";

      if (error.response?.status === 401) {
        errorMessage = "Sessão expirada. Faça login novamente.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.map(err => err.message).join('\n');
      }

      Alert.alert('Erro', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const CategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      animationType="slide"
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <LinearGradient
          colors={["#872bb8", "#311aa4"]}
          style={styles.modalHeader}
        >
          <View style={styles.modalHeaderContent}>
            <TouchableOpacity 
              onPress={() => setShowCategoryModal(false)}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Selecionar Categoria</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

        <View style={styles.modalContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7b2ff7" />
              <Text style={styles.loadingText}>Carregando categorias...</Text>
            </View>
          ) : (
            <ScrollView style={styles.categoriesList}>
              <TouchableOpacity
                style={[
                  styles.categoryItem,
                  !formData.group_id && styles.categoryItemSelected
                ]}
                onPress={() => {
                  handleInputChange('group_id', null);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={styles.categoryItemText}>Nenhuma categoria</Text>
                {!formData.group_id && (
                  <Ionicons name="checkmark" size={20} color="#7b2ff7" />
                )}
              </TouchableOpacity>

              {productGroups.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    formData.group_id === category.id && styles.categoryItemSelected
                  ]}
                  onPress={() => {
                    handleInputChange('group_id', category.id);
                    setShowCategoryModal(false);
                  }}
                >
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryEmoji}>
                      {category.icon || category.emoji || '📁'}
                    </Text>
                    <Text style={styles.categoryItemText}>{category.name}</Text>
                  </View>
                  {formData.group_id === category.id && (
                    <Ionicons name="checkmark" size={20} color="#7b2ff7" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {!loading && productGroups.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="folder-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>
                Nenhuma categoria encontrada
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Crie categorias na tela de produtos
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <Ionicons name="lock-closed" size={64} color="#7b2ff7" />
          <Text style={styles.authTitle}>Acesso Restrito</Text>
          <Text style={styles.authMessage}>
            Faça login para cadastrar produtos
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
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Cabeçalho */}
        <LinearGradient
          colors={["#872bb8", "#311aa4"]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.title}>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </Text>
              <Text style={styles.userInfo}>
                {editingProduct ? 'Atualize os dados do produto' : 'Cadastre um novo produto'}
              </Text>
            </View>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

        {/* Formulário rolável */}
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            {/* Nome do Produto */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome do Produto *</Text>
              <TextInput
                placeholder="Ex: Camiseta Básica"
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                style={styles.textInput}
                maxLength={100}
              />
            </View>

            {/* Descrição */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                placeholder="Descreva o produto..."
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                style={[styles.textInput, styles.textArea]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={500}
              />
            </View>

            {/* Preço */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preço *</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.currencySymbol}>R$</Text>
                <TextInput
                  placeholder="0.00"
                  value={formData.price}
                  onChangeText={handlePriceChange}
                  style={[styles.textInput, styles.priceInput]}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Estoque */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Estoque</Text>
              <TextInput
                placeholder="0"
                value={formData.stock}
                onChangeText={handleStockChange}
                style={styles.textInput}
                keyboardType="number-pad"
              />
            </View>

            {/* Categoria */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Categoria *</Text>
              <TouchableOpacity 
                style={styles.categorySelector}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={[
                  styles.categorySelectorText,
                  !formData.group_id && styles.categorySelectorPlaceholder
                ]}>
                  {getSelectedCategoryName()}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* URL da Imagem */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>URL da Imagem (opcional)</Text>
              <TextInput
                placeholder="https://exemplo.com/imagem.jpg"
                value={formData.image_url}
                onChangeText={(value) => handleInputChange('image_url', value)}
                style={styles.textInput}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* Campos obrigatórios */}
            <Text style={styles.requiredText}>* Campos obrigatórios</Text>
            
            {/* Espaço extra para o botão fixo */}
            <View style={{ height: 90 }} />
          </View>
        </ScrollView>

        {/* Botão FIXO na parte inferior */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>
                {editingProduct ? 'Atualizar Produto' : 'Cadastrar Produto'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <CategoryModal />
      </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  placeholder: {
    width: 26,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
    paddingVertical: 12,
  },
  priceInput: {
    flex: 1,
  },
  categorySelector: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categorySelectorText: {
    fontSize: 16,
    color: '#333',
  },
  categorySelectorPlaceholder: {
    color: '#999',
  },
  saveButton: {
    backgroundColor: '#7b2ff7',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  requiredText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 10,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: 25,
    backgroundColor: '#f9f4fc',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7b2ff7',
  },
  categoriesList: {
    flex: 1,
  },
  categoryItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryItemSelected: {
    borderColor: '#7b2ff7',
    backgroundColor: '#f5f0ff',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 18,
    marginRight: 12,
  },
  categoryItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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