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

// ENDPOINTS CORRETOS
const ENDPOINTS = {
  PRODUCT_GROUPS: '/product_groups',
  PRODUCTS: '/product',
};

// MODIFICADO: De "Variações" para "Grupos"
const COMMON_GROUPS = [
  { label: 'Pequena', value: 'Pequena' },
  { label: 'Média', value: 'Média' },
  { label: 'Grande', value: 'Grande' },
  { label: 'Familiar', value: 'Familiar' },
  { label: 'P', value: 'P' },
  { label: 'M', value: 'M' },
  { label: 'G', value: 'G' },
  { label: 'GG', value: 'GG' },
  { label: '300ml', value: '300ml' },
  { label: '500ml', value: '500ml' },
  { label: '1L', value: '1L' },
  { label: 'Individual', value: 'Individual' },
  { label: 'Promocional', value: 'Promocional' },
  { label: 'Simples', value: 'Simples' },
  { label: 'Completa', value: 'Completa' },
];

export default function NovoProdutoScreen({ route, navigation }) {
  const { editingProduct, categoryId } = route.params || {};
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    group_id: null, // MODIFICADO: Este campo agora é para "Categoria"
    image_url: ''
  });
  
  const [productGroups, setProductGroups] = useState([]); // MODIFICADO: Agora são "Categorias"
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false); // MODIFICADO
  const [showGroupModal, setShowGroupModal] = useState(false); // MODIFICADO: Agora é para "Grupo"
  const [baseName, setBaseName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(''); // MODIFICADO: De "selectedVariant" para "selectedGroup"

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
      
      extractNameParts(editingProduct.name);
    } else if (categoryId) {
      setFormData(prev => ({
        ...prev,
        group_id: categoryId
      }));
    }
  };

  const extractNameParts = (fullName) => {
    if (!fullName) {
      setBaseName('');
      setSelectedGroup('');
      return;
    }

    const patterns = [
      /^(.*?)\s*-\s*(.+)$/,
      /^(.*?)\s*\(\s*(.+?)\s*\)$/,
      /^(.*?)\s*\/\s*(.+)$/,
    ];

    for (const pattern of patterns) {
      const match = fullName.match(pattern);
      if (match) {
        setBaseName(match[1].trim());
        setSelectedGroup(match[2].trim());
        return;
      }
    }

    for (const group of COMMON_GROUPS) {
      if (fullName.toLowerCase().endsWith(` ${group.value.toLowerCase()}`)) {
        const base = fullName.substring(0, fullName.length - group.value.length - 1).trim();
        setBaseName(base);
        setSelectedGroup(group.value);
        return;
      }
    }

    setBaseName(fullName);
    setSelectedGroup('');
  };

  // MODIFICADO: Função agora busca "Categorias"
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

  const handleBaseNameChange = (text) => {
    setBaseName(text);
    updateFullName(text, selectedGroup);
  };

  // MODIFICADO: Função agora seleciona "Grupo"
  const handleGroupSelect = (group) => {
    setSelectedGroup(group);
    updateFullName(baseName, group);
    setShowGroupModal(false);
  };

  const updateFullName = (base, group) => {
    if (group) {
      setFormData(prev => ({
        ...prev,
        name: `${base} - ${group}`
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        name: base
      }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePriceChange = (value) => {
    const cleaned = value.replace(/[^0-9.,]/g, '');
    const withDot = cleaned.replace(',', '.');
    const parts = withDot.split('.');
    
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    
    handleInputChange('price', withDot);
  };

  const handleStockChange = (value) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    handleInputChange('stock', cleaned);
  };

  // MODIFICADO: Agora retorna nome da "Categoria"
  const getSelectedCategoryName = () => {
    if (!formData.group_id) return 'Selecionar categoria (opcional)';
    const category = productGroups.find(g => g.id === formData.group_id);
    return category ? category.name : 'Selecionar categoria';
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validação', 'Nome do produto é obrigatório');
      return false;
    }

    if (!formData.price || formData.price.trim() === '') {
      Alert.alert('Validação', 'Preço é obrigatório');
      return false;
    }

    const priceNum = parseFloat(formData.price.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Validação', 'Preço deve ser um número maior que 0');
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
        price: parseFloat(formData.price.replace(',', '.')),
        stock: parseInt(formData.stock || '0'),
        user_id: user.id
      };

      if (formData.group_id) {
        productData.group_id = formData.group_id;
      }
      
      if (formData.image_url.trim()) {
        productData.image_url = formData.image_url.trim();
      }

      if (editingProduct) {
        const productId = editingProduct.id;
        const url = `${ENDPOINTS.PRODUCTS}/${productId}`;
        
        await api.patch(url, productData);
        Alert.alert('Sucesso', 'Produto atualizado!');
        navigation.goBack();
      } else {
        await api.post(ENDPOINTS.PRODUCTS, productData);
        Alert.alert('Sucesso', 'Produto criado com sucesso');
        navigation.goBack();
      }
      
    } catch (error) {
      console.error('❌ Erro ao salvar produto:', error);
      
      let errorMessage = "Não foi possível salvar o produto";
      
      if (error.response?.status === 404) {
        errorMessage = `Rota não encontrada. Verifique se o backend está rodando.`;
      } else if (error.response?.status === 400) {
        if (error.response?.data?.errors) {
          const errors = error.response.data.errors.map(err => 
            `${err.path?.join('.') || 'campo'}: ${err.message}`
          ).join('\n');
          errorMessage = `Erros de validação:\n${errors}`;
        } else {
          errorMessage = "Dados inválidos enviados para o servidor.";
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert('Erro', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // MODIFICADO: Modal para selecionar "Categoria"
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
            <TouchableOpacity onPress={() => createQuickCategory()}>
              <Ionicons name="add" size={26} color="#fff" />
            </TouchableOpacity>
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
                <Text style={styles.categoryItemText}>Sem categoria</Text>
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
                      {category.icon || '📁'}
                    </Text>
                    <View>
                      <Text style={styles.categoryItemText}>{category.name}</Text>
                    </View>
                  </View>
                  {formData.group_id === category.id && (
                    <Ionicons name="checkmark" size={20} color="#7b2ff7" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  // MODIFICADO: Função para criar "Categoria" rápida
  const createQuickCategory = async () => {
    try {
      setLoading(true);
      const categoryName = baseName || 'Nova Categoria';
      
      await api.post(ENDPOINTS.PRODUCT_GROUPS, {
        name: categoryName,
        icon: '📁',
        user_id: user?.id
      });
      
      await fetchProductGroups();
      Alert.alert('Sucesso', `Categoria "${categoryName}" criada`);
      setShowCategoryModal(false);
    } catch (error) {
      console.error('❌ Erro ao criar categoria:', error);
      Alert.alert('Erro', 'Não foi possível criar a categoria');
    } finally {
      setLoading(false);
    }
  };

  // MODIFICADO: Modal para selecionar "Grupo"
  const GroupModal = () => (
    <Modal
      visible={showGroupModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowGroupModal(false)}
    >
      <View style={styles.groupModalOverlay}>
        <View style={styles.groupModalContent}>
          <View style={styles.groupModalHeader}>
            <Text style={styles.groupModalTitle}>Selecionar Grupo</Text>
            <TouchableOpacity onPress={() => setShowGroupModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.groupsList}>
            <TouchableOpacity
              style={[
                styles.groupOption,
                !selectedGroup && styles.groupOptionSelected
              ]}
              onPress={() => handleGroupSelect('')}
            >
              <Text style={styles.groupOptionText}>Sem grupo</Text>
              {!selectedGroup && <Ionicons name="checkmark" size={20} color="#7b2ff7" />}
            </TouchableOpacity>
            
            {COMMON_GROUPS.map((group, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.groupOption,
                  selectedGroup === group.value && styles.groupOptionSelected
                ]}
                onPress={() => handleGroupSelect(group.value)}
              >
                <Text style={styles.groupOptionText}>{group.label}</Text>
                {selectedGroup === group.value && (
                  <Ionicons name="checkmark" size={20} color="#7b2ff7" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.groupCustom}>
            <TextInput
              placeholder="Digite um grupo personalizado"
              value={selectedGroup}
              onChangeText={setSelectedGroup}
              style={styles.groupCustomInput}
            />
            <TouchableOpacity 
              style={styles.groupCustomButton}
              onPress={() => {
                updateFullName(baseName, selectedGroup);
                setShowGroupModal(false);
              }}
            >
              <Text style={styles.groupCustomButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
            </View>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.formContainer}>
            {/* Nome Base */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome do Produto *</Text>
              <TextInput
                placeholder="Ex: Pizza Calabresa"
                value={baseName}
                onChangeText={handleBaseNameChange}
                style={styles.textInput}
              />
            </View>

            {/* MODIFICADO: De "Variação" para "Grupo" */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Grupo (opcional)</Text>
              <TouchableOpacity 
                style={styles.groupSelector}
                onPress={() => setShowGroupModal(true)}
              >
                <Text style={[
                  styles.groupSelectorText,
                  !selectedGroup && styles.groupSelectorPlaceholder
                ]}>
                  {selectedGroup || 'Selecionar grupo...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {formData.name && (
              <View style={styles.namePreview}>
                <Text style={styles.namePreviewText}>Nome: {formData.name}</Text>
              </View>
            )}

            {/* Descrição */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descrição *</Text>
              <TextInput
                placeholder="Descreva o produto..."
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                style={[styles.textInput, styles.textArea]}
                multiline
                numberOfLines={3}
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

            {/* MODIFICADO: De "Grupo" para "Categoria" */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Categoria</Text>
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

            {/* URL Imagem */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>URL da Imagem (opcional)</Text>
              <TextInput
                placeholder="https://exemplo.com/imagem.jpg"
                value={formData.image_url}
                onChangeText={(value) => handleInputChange('image_url', value)}
                style={styles.textInput}
              />
            </View>

            <Text style={styles.requiredText}>* Campos obrigatórios</Text>
            
            <View style={{ height: 90 }} />
          </View>
        </ScrollView>

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
        <GroupModal />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Estilos atualizados
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
  // Estilos para seletor de Grupo
  groupSelector: {
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
  groupSelectorText: {
    fontSize: 16,
    color: '#333',
  },
  groupSelectorPlaceholder: {
    color: '#999',
  },
  // Estilos para seletor de Categoria
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
  namePreview: {
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  namePreviewText: {
    fontSize: 14,
    color: '#333',
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
  groupModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  groupModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
  },
  groupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  groupModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  groupsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  groupOption: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  groupOptionSelected: {
    borderColor: '#7b2ff7',
    backgroundColor: '#f5f0ff',
  },
  groupOptionText: {
    fontSize: 16,
    color: '#333',
  },
  groupCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  groupCustomInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginRight: 10,
  },
  groupCustomButton: {
    backgroundColor: '#7b2ff7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  groupCustomButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});