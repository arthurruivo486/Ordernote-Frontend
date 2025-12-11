import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
  Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from "../../context/AuthContext";
import api from '../../services/api';

// ENDPOINTS CORRETOS
const ENDPOINTS = {
  PRODUCT_GROUPS: '/product_groups',
  PRODUCTS: '/product',
  PRODUCT_VARIATIONS: '/product_variations',
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

// SABORES PRÉ-DEFINIDOS PARA PIZZA (sem banco de dados)
const PIZZA_FLAVORS = [
  { id: 1, name: 'Calabresa', basePrice: 5.00, category: 'tradicional' },
  { id: 2, name: 'Mussarela', basePrice: 4.00, category: 'tradicional' },
  { id: 3, name: 'Catupiry Frango', basePrice: 7.00, category: 'especial' },
  { id: 4, name: 'Portuguesa', basePrice: 6.00, category: 'tradicional' },
  { id: 5, name: 'Quatro Queijos', basePrice: 8.00, category: 'especial' },
  { id: 6, name: 'Bacon', basePrice: 6.00, category: 'tradicional' },
  { id: 7, name: 'Marguerita', basePrice: 5.00, category: 'tradicional' },
  { id: 8, name: 'Napolitana', basePrice: 6.50, category: 'especial' },
];

// Componente para o Modal de Grupo
const GroupModal = ({ visible, selectedGroup, onClose, onSelectGroup }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (visible) {
      setInputValue('');
    }
  }, [visible]);

  const handleSelect = useCallback((group) => {
    onSelectGroup(group);
    onClose();
  }, [onSelectGroup, onClose]);

  const handleCustomConfirm = useCallback(() => {
    if (inputValue.trim()) {
      onSelectGroup(inputValue.trim());
      onClose();
    }
  }, [inputValue, onSelectGroup, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.groupModalOverlay}>
        <View style={styles.groupModalContent}>
          <View style={styles.groupModalHeader}>
            <Text style={styles.groupModalTitle}>Selecionar Grupo</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.groupsList}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={[
                styles.groupOption,
                !selectedGroup && styles.groupOptionSelected
              ]}
              onPress={() => handleSelect('')}
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
                onPress={() => handleSelect(group.value)}
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
              value={inputValue}
              onChangeText={setInputValue}
              style={styles.groupCustomInput}
              onSubmitEditing={handleCustomConfirm}
            />
            <TouchableOpacity 
              style={[styles.groupCustomButton, !inputValue.trim() && styles.groupCustomButtonDisabled]}
              onPress={handleCustomConfirm}
              disabled={!inputValue.trim()}
            >
              <Text style={styles.groupCustomButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Componente para Modal de Variação
const VariationModal = ({ visible, variation, onClose, onSave, isEditing }) => {
  const [variationData, setVariationData] = useState({
    name: '',
    price: '',
    is_active: true
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (visible) {
      if (isEditing && variation) {
        setVariationData({
          name: variation.name || '',
          price: variation.price ? String(variation.price) : '',
          is_active: variation.is_active !== undefined ? variation.is_active : true
        });
      } else {
        setVariationData({
          name: '',
          price: '',
          is_active: true
        });
      }
      setErrors({});
    }
  }, [visible, isEditing, variation]);

  const handleChange = (field, value) => {
    setVariationData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpa erro do campo quando o usuário começa a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handlePriceChange = (value) => {
    const cleaned = value.replace(/[^0-9.,]/g, '');
    const withDot = cleaned.replace(',', '.');
    const parts = withDot.split('.');
    
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    
    handleChange('price', withDot);
  };

  const validate = () => {
    const newErrors = {};
    
    if (!variationData.name.trim()) {
      newErrors.name = 'Nome da variação é obrigatório';
    }
    
    if (!variationData.price || variationData.price.trim() === '') {
      newErrors.price = 'Preço é obrigatório';
    } else {
      const priceNum = parseFloat(variationData.price.replace(',', '.'));
      if (isNaN(priceNum) || priceNum < 0) {
        newErrors.price = 'Preço deve ser um número maior ou igual a 0';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    
    const priceNum = parseFloat(variationData.price.replace(',', '.'));
    onSave({
      ...variationData,
      price: priceNum
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.variationModalOverlay}>
        <View style={styles.variationModalContent}>
          <View style={styles.variationModalHeader}>
            <Text style={styles.variationModalTitle}>
              {isEditing ? 'Editar Variação' : 'Nova Variação'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.variationForm}>
            <View style={styles.variationInputGroup}>
              <Text style={styles.variationLabel}>Nome da Variação *</Text>
              <TextInput
                placeholder="Ex: Broto, Grande, Com borda, etc."
                value={variationData.name}
                onChangeText={(value) => handleChange('name', value)}
                style={[styles.variationInput, errors.name && styles.inputError]}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>
            
            <View style={styles.variationInputGroup}>
              <Text style={styles.variationLabel}>Preço *</Text>
              <View style={styles.variationPriceContainer}>
                <Text style={styles.variationCurrencySymbol}>R$</Text>
                <TextInput
                  placeholder="0.00"
                  value={variationData.price}
                  onChangeText={handlePriceChange}
                  style={[styles.variationInput, styles.variationPriceInput, errors.price && styles.inputError]}
                  keyboardType="decimal-pad"
                />
              </View>
              {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>
            
            <View style={[styles.variationInputGroup, styles.switchContainer]}>
              <Text style={styles.variationLabel}>Variação Ativa</Text>
              <Switch
                value={variationData.is_active}
                onValueChange={(value) => handleChange('is_active', value)}
                trackColor={{ false: '#767577', true: '#7b2ff7' }}
                thumbColor={variationData.is_active ? '#f4f3f4' : '#f4f3f4'}
              />
            </View>
          </ScrollView>
          
          <View style={styles.variationModalFooter}>
            <TouchableOpacity 
              style={styles.variationCancelButton}
              onPress={onClose}
            >
              <Text style={styles.variationCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.variationSaveButton}
              onPress={handleSave}
            >
              <Text style={styles.variationSaveButtonText}>
                {isEditing ? 'Atualizar' : 'Salvar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// NOVO: Modal para Produto Personalizado (Pizza de Metades)
const CustomProductModal = ({ visible, onClose, onSaveCustomProduct }) => {
  const [productType, setProductType] = useState('pizza_halves');
  const [selectedFlavors, setSelectedFlavors] = useState([null, null]);
  const [baseProduct, setBaseProduct] = useState({
    name: 'Pizza Personalizada',
    basePrice: 30.00,
    description: ''
  });
  
  const handleSelectFlavor = (index, flavor) => {
    const newSelection = [...selectedFlavors];
    newSelection[index] = flavor;
    setSelectedFlavors(newSelection);
  };

  const calculatePrice = () => {
    if (productType === 'pizza_halves') {
      let total = baseProduct.basePrice;
      selectedFlavors.forEach(flavor => {
        if (flavor) total += flavor.basePrice / 2;
      });
      return total;
    }
    return baseProduct.basePrice;
  };

  const generateProductName = () => {
    if (productType === 'pizza_halves') {
      const flavorsText = selectedFlavors
        .filter(f => f)
        .map(f => f.name)
        .join(' / ');
      return `Pizza Metade ${flavorsText}`;
    }
    return baseProduct.name;
  };

  const generateDescription = () => {
    if (productType === 'pizza_halves') {
      return `Pizza personalizada com metades: ${selectedFlavors[0]?.name || '?'} e ${selectedFlavors[1]?.name || '?'}`;
    }
    return baseProduct.description;
  };

  const handleSave = () => {
    if (productType === 'pizza_halves' && (!selectedFlavors[0] || !selectedFlavors[1])) {
      Alert.alert('Atenção', 'Selecione os dois sabores para as metades');
      return;
    }

    const customProduct = {
      id: `custom-${Date.now()}`,
      name: generateProductName(),
      description: generateDescription(),
      price: calculatePrice(),
      isCustom: true,
      customType: productType,
      customData: {
        baseProduct: { ...baseProduct },
        selectedFlavors: [...selectedFlavors],
        calculatedPrice: calculatePrice()
      }
    };

    onSaveCustomProduct(customProduct);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.customProductOverlay}>
        <View style={styles.customProductContent}>
          <View style={styles.customProductHeader}>
            <Text style={styles.customProductTitle}>Criar Produto Personalizado</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.customProductForm}>
            <View style={styles.customProductSection}>
              <Text style={styles.customProductSectionTitle}>Tipo de Produto</Text>
              <View style={styles.productTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.productTypeOption,
                    productType === 'pizza_halves' && styles.productTypeOptionSelected
                  ]}
                  onPress={() => setProductType('pizza_halves')}
                >
                  <Ionicons 
                    name="pizza" 
                    size={24} 
                    color={productType === 'pizza_halves' ? '#7b2ff7' : '#666'} 
                  />
                  <Text style={[
                    styles.productTypeText,
                    productType === 'pizza_halves' && styles.productTypeTextSelected
                  ]}>
                    Pizza de Metades
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.productTypeOption,
                    productType === 'custom' && styles.productTypeOptionSelected
                  ]}
                  onPress={() => setProductType('custom')}
                >
                  <Ionicons 
                    name="build" 
                    size={24} 
                    color={productType === 'custom' ? '#7b2ff7' : '#666'} 
                  />
                  <Text style={[
                    styles.productTypeText,
                    productType === 'custom' && styles.productTypeTextSelected
                  ]}>
                    Personalizado
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {productType === 'pizza_halves' && (
              <>
                <View style={styles.customProductSection}>
                  <Text style={styles.customProductSectionTitle}>Preço Base da Pizza</Text>
                  <View style={styles.basePriceContainer}>
                    <Text style={styles.currencySymbol}>R$</Text>
                    <TextInput
                      placeholder="30.00"
                      value={String(baseProduct.basePrice)}
                      onChangeText={(text) => {
                        const num = parseFloat(text.replace(',', '.')) || 0;
                        setBaseProduct(prev => ({ ...prev, basePrice: num }));
                      }}
                      style={styles.basePriceInput}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.customProductSection}>
                  <Text style={styles.customProductSectionTitle}>Metade 1</Text>
                  <View style={styles.flavorPickerContainer}>
                    {PIZZA_FLAVORS.map(flavor => (
                      <TouchableOpacity
                        key={flavor.id}
                        style={[
                          styles.flavorOption,
                          selectedFlavors[0]?.id === flavor.id && styles.flavorOptionSelected
                        ]}
                        onPress={() => handleSelectFlavor(0, flavor)}
                      >
                        <Text style={styles.flavorOptionText}>{flavor.name}</Text>
                        <Text style={styles.flavorOptionPrice}>
                          +R$ {(flavor.basePrice / 2).toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.customProductSection}>
                  <Text style={styles.customProductSectionTitle}>Metade 2</Text>
                  <View style={styles.flavorPickerContainer}>
                    {PIZZA_FLAVORS.map(flavor => (
                      <TouchableOpacity
                        key={flavor.id}
                        style={[
                          styles.flavorOption,
                          selectedFlavors[1]?.id === flavor.id && styles.flavorOptionSelected
                        ]}
                        onPress={() => handleSelectFlavor(1, flavor)}
                      >
                        <Text style={styles.flavorOptionText}>{flavor.name}</Text>
                        <Text style={styles.flavorOptionPrice}>
                          +R$ {(flavor.basePrice / 2).toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.customProductSection}>
                  <Text style={styles.customProductSectionTitle}>Resumo</Text>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryText}>
                      <Text style={styles.summaryLabel}>Produto:</Text> Pizza de Metades
                    </Text>
                    <Text style={styles.summaryText}>
                      <Text style={styles.summaryLabel}>Metade 1:</Text> {selectedFlavors[0]?.name || 'Não selecionado'}
                    </Text>
                    <Text style={styles.summaryText}>
                      <Text style={styles.summaryLabel}>Metade 2:</Text> {selectedFlavors[1]?.name || 'Não selecionado'}
                    </Text>
                    <Text style={styles.summaryText}>
                      <Text style={styles.summaryLabel}>Preço Base:</Text> R$ {baseProduct.basePrice.toFixed(2)}
                    </Text>
                    <Text style={styles.summaryText}>
                      <Text style={styles.summaryLabel}>Adicionais:</Text> R$ {(
                        (selectedFlavors[0]?.basePrice || 0) / 2 +
                        (selectedFlavors[1]?.basePrice || 0) / 2
                      ).toFixed(2)}
                    </Text>
                    <View style={styles.summaryDivider} />
                    <Text style={styles.summaryTotal}>
                      <Text style={styles.summaryLabel}>Preço Total:</Text> R$ {calculatePrice().toFixed(2)}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {productType === 'custom' && (
              <View style={styles.customProductSection}>
                <Text style={styles.customProductSectionTitle}>Produto Personalizado</Text>
                <TextInput
                  placeholder="Nome do produto personalizado"
                  value={baseProduct.name}
                  onChangeText={(text) => setBaseProduct(prev => ({ ...prev, name: text }))}
                  style={styles.customProductInput}
                />
                <TextInput
                  placeholder="Descrição"
                  value={baseProduct.description}
                  onChangeText={(text) => setBaseProduct(prev => ({ ...prev, description: text }))}
                  style={[styles.customProductInput, styles.customProductTextArea]}
                  multiline
                />
                <View style={styles.basePriceContainer}>
                  <Text style={styles.currencySymbol}>R$</Text>
                  <TextInput
                    placeholder="0.00"
                    value={String(baseProduct.basePrice)}
                    onChangeText={(text) => {
                      const num = parseFloat(text.replace(',', '.')) || 0;
                      setBaseProduct(prev => ({ ...prev, basePrice: num }));
                    }}
                    style={styles.basePriceInput}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.customProductFooter}>
            <TouchableOpacity 
              style={styles.customProductCancelButton}
              onPress={onClose}
            >
              <Text style={styles.customProductCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.customProductSaveButton}
              onPress={handleSave}
            >
              <Text style={styles.customProductSaveButtonText}>Criar Produto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// MODAL PARA SELECIONAR CATEGORIA
const CategoryModal = ({ 
  visible, 
  onClose, 
  productGroups, 
  loading, 
  formData, 
  handleInputChange,
  createQuickCategory,
  baseName,
  user
}) => {
  const getSelectedCategoryName = () => {
    if (!formData.group_id) return 'Selecionar categoria (opcional)';
    const category = productGroups.find(g => g.id === formData.group_id);
    return category ? category.name : 'Selecionar categoria';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <LinearGradient
          colors={["#872bb8", "#311aa4"]}
          style={styles.modalHeader}
        >
          <View style={styles.modalHeaderContent}>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Selecionar Categoria</Text>
            <TouchableOpacity onPress={createQuickCategory}>
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
                  onClose();
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
                    onClose();
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
  const [variations, setVariations] = useState([]);
  const [customProducts, setCustomProducts] = useState([]); // NOVO: Produtos personalizados
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [showCustomProductModal, setShowCustomProductModal] = useState(false); // NOVO
  const [editingVariation, setEditingVariation] = useState(null);
  const [baseName, setBaseName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchProductGroups();
      initializeForm();
    }
  }, [isAuthenticated, editingProduct, categoryId]);

  const initializeForm = async () => {
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
      
      // Carrega variações do produto se estiver editando
      await fetchVariations(editingProduct.id);
    } else if (categoryId) {
      setFormData(prev => ({
        ...prev,
        group_id: categoryId
      }));
    }
  };

  const fetchVariations = async (productId) => {
    try {
      const res = await api.get(ENDPOINTS.PRODUCT_VARIATIONS, {
        params: {
          product_id: productId,
          user_id: user?.id
        }
      });
      setVariations(res.data || []);
    } catch (error) {
      console.error("❌ Erro ao carregar variações:", error);
      setVariations([]);
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

  const handleBaseNameChange = useCallback((text) => {
    setBaseName(text);
    updateFullName(text, selectedGroup);
  }, [selectedGroup]);

  // MODIFICADO: Função agora seleciona "Grupo"
  const handleGroupSelect = useCallback((group) => {
    setSelectedGroup(group);
    updateFullName(baseName, group);
    setShowGroupModal(false);
  }, [baseName]);

  const updateFullName = useCallback((base, group) => {
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
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handlePriceChange = useCallback((value) => {
    const cleaned = value.replace(/[^0-9.,]/g, '');
    const withDot = cleaned.replace(',', '.');
    const parts = withDot.split('.');
    
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    
    handleInputChange('price', withDot);
  }, [handleInputChange]);

  const handleStockChange = useCallback((value) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    handleInputChange('stock', cleaned);
  }, [handleInputChange]);

  // MODIFICADO: Agora retorna nome da "Categoria"
  const getSelectedCategoryName = useCallback(() => {
    if (!formData.group_id) return 'Selecionar categoria (opcional)';
    const category = productGroups.find(g => g.id === formData.group_id);
    return category ? category.name : 'Selecionar categoria';
  }, [formData.group_id, productGroups]);

  // Funções para manipular variações
  const handleAddVariation = () => {
    setEditingVariation(null);
    setShowVariationModal(true);
  };

  const handleEditVariation = (variation) => {
    setEditingVariation(variation);
    setShowVariationModal(true);
  };

  const handleDeleteVariation = async (variationId) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta variação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`${ENDPOINTS.PRODUCT_VARIATIONS}/${variationId}`, {
                params: { user_id: user?.id }
              });
              
              setVariations(prev => prev.filter(v => v.id !== variationId));
              Alert.alert('Sucesso', 'Variação excluída com sucesso');
            } catch (error) {
              console.error('❌ Erro ao excluir variação:', error);
              Alert.alert('Erro', 'Não foi possível excluir a variação');
            }
          }
        }
      ]
    );
  };

  const handleSaveVariation = async (variationData) => {
    try {
      if (editingVariation) {
        await api.patch(`${ENDPOINTS.PRODUCT_VARIATIONS}/${editingVariation.id}`, {
          ...variationData,
          product_id: editingProduct?.id,
          user_id: user?.id
        }, {
          params: { user_id: user?.id }
        });

        setVariations(prev => prev.map(v => 
          v.id === editingVariation.id ? { ...v, ...variationData } : v
        ));
      } else {
        setVariations(prev => [...prev, {
          ...variationData,
          id: `temp-${Date.now()}`, 
          product_id: null, 
          user_id: user?.id
        }]);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar variação:', error);
      Alert.alert('Erro', 'Não foi possível salvar a variação');
    }
  };

  const handleSaveCustomProduct = (customProduct) => {
    setCustomProducts(prev => [...prev, customProduct]);
    
    if (customProducts.length === 0 && variations.length === 0) {
      setFormData(prev => ({
        ...prev,
        name: customProduct.name,
        description: customProduct.description,
        price: String(customProduct.price)
      }));
    }
  };

  // NOVO: Remover produto personalizado
  const handleRemoveCustomProduct = (productId) => {
    setCustomProducts(prev => prev.filter(p => p.id !== productId));
  };

  // MODIFICADA: Agora inclui produtos personalizados na validação
  const validateForm = () => {
    // Se houver produtos personalizados, não valida o formulário principal
    if (customProducts.length > 0) {
      return true;
    }

    // Validação normal para produtos não-personalizados
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

  // MODIFICADA: Agora lida com produtos personalizados
  const handleSave = async () => {
    if (!isAuthenticated) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }

    if (!validateForm()) return;

    setSaving(true);
    try {
      // Se houver produtos personalizados, cria um produto especial
      if (customProducts.length > 0) {
        // Para cada produto personalizado, cria um produto no banco
        for (const customProduct of customProducts) {
          const productData = {
            name: customProduct.name,
            description: customProduct.description,
            price: customProduct.price,
            stock: parseInt(formData.stock || '0'),
            user_id: user.id,
            is_custom: true, // Flag para identificar produto personalizado
            custom_data: JSON.stringify(customProduct.customData) // Salva dados extras
          };

          if (formData.group_id) {
            productData.group_id = formData.group_id;
          }
          
          if (formData.image_url.trim()) {
            productData.image_url = formData.image_url.trim();
          }

          await api.post(ENDPOINTS.PRODUCTS, productData);
        }
        
        Alert.alert('Sucesso', `${customProducts.length} produto(s) personalizado(s) criado(s) com sucesso`);
        navigation.goBack();
      } else {
        // Fluxo normal para produto não-personalizado
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
          
          // Salva variações do produto existente
          for (const variation of variations) {
            if (variation.id && variation.id.toString().startsWith('temp-')) {
              await api.post(ENDPOINTS.PRODUCT_VARIATIONS, {
                ...variation,
                product_id: productId,
                user_id: user.id
              });
            } else if (variation.id) {
              await api.patch(`${ENDPOINTS.PRODUCT_VARIATIONS}/${variation.id}`, {
                name: variation.name,
                price: variation.price,
                is_active: variation.is_active
              }, {
                params: { user_id: user.id }
              });
            }
          }
          
          Alert.alert('Sucesso', 'Produto atualizado!');
          navigation.goBack();
        } else {
          const response = await api.post(ENDPOINTS.PRODUCTS, productData);
          const productId = response.data.id || response.data.product_id;
          
          // Cria variações para o novo produto
          for (const variation of variations) {
            await api.post(ENDPOINTS.PRODUCT_VARIATIONS, {
              ...variation,
              product_id: productId,
              user_id: user.id
            });
          }
          
          Alert.alert('Sucesso', 'Produto criado com sucesso');
          navigation.goBack();
        }
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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            {/* NOVO: Botão para criar produto personalizado */}
            <View style={styles.customProductSection}>
              <TouchableOpacity 
                style={styles.createCustomProductButton}
                onPress={() => setShowCustomProductModal(true)}
              >
                <Ionicons name="color-wand" size={24} color="#fff" />
                <Text style={styles.createCustomProductButtonText}>
                  Criar Produto Personalizado
                </Text>
              </TouchableOpacity>
              <Text style={styles.customProductHelperText}>
                Ex: Pizza de metades, combinações especiais, etc.
              </Text>
            </View>

            {/* Lista de produtos personalizados criados */}
            {customProducts.length > 0 && (
              <View style={styles.customProductsList}>
                <Text style={styles.customProductsTitle}>Produtos Personalizados Criados:</Text>
                {customProducts.map((product) => (
                  <View key={product.id} style={styles.customProductItem}>
                    <View style={styles.customProductItemInfo}>
                      <Text style={styles.customProductItemName}>{product.name}</Text>
                      <Text style={styles.customProductItemDescription}>
                        {product.description}
                      </Text>
                      <Text style={styles.customProductItemPrice}>
                        R$ {product.price.toFixed(2)}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.removeCustomProductButton}
                      onPress={() => handleRemoveCustomProduct(product.id)}
                    >
                      <Ionicons name="trash" size={20} color="#ff6b6b" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Se houver produtos personalizados, esconde o formulário normal */}
            {customProducts.length === 0 && (
              <>
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

                {/* Grupo */}
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

                {/* Preço Base */}
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

                {/* Variações do Produto */}
                <View style={styles.inputGroup}>
                  <View style={styles.variationsHeader}>
                    <Text style={styles.label}>Variações do Produto</Text>
                    <TouchableOpacity 
                      style={styles.addVariationButton}
                      onPress={handleAddVariation}
                    >
                      <Ionicons name="add-circle" size={24} color="#7b2ff7" />
                      <Text style={styles.addVariationButtonText}>Adicionar</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {variations.length === 0 ? (
                    <View style={styles.noVariationsContainer}>
                      <Text style={styles.noVariationsText}>
                        Nenhuma variação adicionada. Clique em "Adicionar" para criar variações.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.variationsList}>
                      {variations.map((variation, index) => (
                        <View key={variation.id || index} style={styles.variationItem}>
                          <View style={styles.variationInfo}>
                            <View style={styles.variationNameContainer}>
                              <Text style={styles.variationName}>{variation.name}</Text>
                              {!variation.is_active && (
                                <View style={styles.inactiveBadge}>
                                  <Text style={styles.inactiveBadgeText}>Inativa</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.variationPrice}>
                              R$ {typeof variation.price === 'number' 
                                ? variation.price.toFixed(2).replace('.', ',') 
                                : '0,00'}
                            </Text>
                          </View>
                          <View style={styles.variationActions}>
                            <TouchableOpacity 
                              style={styles.variationActionButton}
                              onPress={() => handleEditVariation(variation)}
                            >
                              <Ionicons name="pencil" size={18} color="#7b2ff7" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.variationActionButton}
                              onPress={() => handleDeleteVariation(variation.id)}
                            >
                              <Ionicons name="trash" size={18} color="#ff6b6b" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </>
            )}

            {/* URL Imagem (sempre visível) */}
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
                {customProducts.length > 0 
                  ? `Salvar ${customProducts.length} Produto(s) Personalizado(s)`
                  : editingProduct ? 'Atualizar Produto' : 'Cadastrar Produto'
                }
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <CategoryModal
          visible={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          productGroups={productGroups}
          loading={loading}
          formData={formData}
          handleInputChange={handleInputChange}
          createQuickCategory={createQuickCategory}
          baseName={baseName}
          user={user}
        />
        <GroupModal
          visible={showGroupModal}
          selectedGroup={selectedGroup}
          onClose={() => setShowGroupModal(false)}
          onSelectGroup={handleGroupSelect}
        />
        <VariationModal
          visible={showVariationModal}
          variation={editingVariation}
          onClose={() => setShowVariationModal(false)}
          onSave={handleSaveVariation}
          isEditing={!!editingVariation}
        />
        <CustomProductModal
          visible={showCustomProductModal}
          onClose={() => setShowCustomProductModal(false)}
          onSaveCustomProduct={handleSaveCustomProduct}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Estilos atualizados (apenas adicionando os novos)
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
  // Estilos para variações
  variationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addVariationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f0ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7b2ff7',
  },
  addVariationButtonText: {
    color: '#7b2ff7',
    fontWeight: '600',
    marginLeft: 4,
  },
  noVariationsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  noVariationsText: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 14,
  },
  variationsList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  variationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  variationInfo: {
    flex: 1,
  },
  variationNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  variationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginRight: 8,
  },
  inactiveBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    color: '#c62828',
    fontWeight: '600',
  },
  variationPrice: {
    fontSize: 14,
    color: '#666',
  },
  variationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  variationActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Modal de variação
  variationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  variationModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
  },
  variationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  variationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  variationForm: {
    maxHeight: 400,
  },
  variationInputGroup: {
    marginBottom: 16,
  },
  variationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  variationInput: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
  variationPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  variationCurrencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
    paddingVertical: 10,
  },
  variationPriceInput: {
    flex: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variationModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  variationCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
  },
  variationCancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  variationSaveButton: {
    backgroundColor: '#7b2ff7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  variationSaveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // NOVOS ESTILOS PARA PRODUTOS PERSONALIZADOS
  customProductSection: {
    marginBottom: 20,
  },
  createCustomProductButton: {
    backgroundColor: '#7b2ff7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  createCustomProductButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  customProductHelperText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
  },
  customProductsList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  customProductsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  customProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customProductItemInfo: {
    flex: 1,
  },
  customProductItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  customProductItemDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  customProductItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7b2ff7',
  },
  removeCustomProductButton: {
    padding: 8,
  },
  
  // Modal de Produto Personalizado
  customProductOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  customProductContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '100%',
    maxHeight: '90%',
    padding: 20,
  },
  customProductHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  customProductTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  customProductForm: {
    maxHeight: 500,
  },
  customProductSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  productTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  productTypeOption: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginHorizontal: 5,
  },
  productTypeOptionSelected: {
    borderColor: '#7b2ff7',
    backgroundColor: '#f5f0ff',
  },
  productTypeText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  productTypeTextSelected: {
    color: '#7b2ff7',
  },
  basePriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  basePriceInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    fontSize: 16,
  },
  flavorPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  flavorOption: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginBottom: 10,
    alignItems: 'center',
  },
  flavorOptionSelected: {
    borderColor: '#7b2ff7',
    backgroundColor: '#f5f0ff',
  },
  flavorOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  flavorOptionPrice: {
    fontSize: 12,
    color: '#7b2ff7',
  },
  summaryBox: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  summaryLabel: {
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#dee2e6',
    marginVertical: 10,
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  customProductInput: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    fontSize: 16,
    marginBottom: 12,
  },
  customProductTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  customProductFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  customProductCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 12,
  },
  customProductCancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  customProductSaveButton: {
    backgroundColor: '#7b2ff7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  customProductSaveButtonText: {
    color: '#fff',
    fontWeight: '600',
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
    marginBottom:40,
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
    fontSize: 16,
  },
  groupCustomButton: {
    backgroundColor: '#7b2ff7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  groupCustomButtonDisabled: {
    backgroundColor: '#ccc',
  },
  groupCustomButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});