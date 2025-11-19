import React, { useState, useMemo, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    FlatList,
    Image,
    Modal,
    TextInput,
    Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SalesScreen({ navigation }) {
    const PRODUCTS = [
        { id: "p1", name: "Café Expresso", price: 4.5 },
        { id: "p2", name: "Pão de Queijo", price: 3.0 },
        { id: "p3", name: "Suco Natural", price: 6.0 },
        { id: "p4", name: "Sanduíche", price: 12.0 },
        { id: "p5", name: "Água", price: 2.5 },
    ];

    const [cart, setCart] = useState([]); // items: { id, name, price, qty }
    const [comandas, setComandas] = useState([]); // { id, name, items: [] }
    const [comandaInput, setComandaInput] = useState("");
    const [saleDraft, setSaleDraft] = useState(null); // { type, name, order, customer }
    const [cardapioEditMode, setCardapioEditMode] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [newSaleModalVisible, setNewSaleModalVisible] = useState(false);
    const [saleType, setSaleType] = useState("comanda"); // 'comanda' or 'entrega'
    const [orderInput, setOrderInput] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [comandaDetailsVisible, setComandaDetailsVisible] = useState(false);
    const [editingComanda, setEditingComanda] = useState(null);
    const [comandaEditMode, setComandaEditMode] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [cardapioVisible, setCardapioVisible] = useState(false);
    const addToCart = (product) => {
        setCart((prev) => {
            const idx = prev.findIndex((p) => p.id === product.id);
            if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], qty: (copy[idx].qty || 1) + 1 };
                return copy;
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const removeFromCart = (index) => {
        setCart((prev) => prev.filter((_, i) => i !== index));
    };

 const removeProductFromCartById = (id) => {
    setCart((prev) => {
        const idx = prev.findIndex((p) => p.id === id);
        if (idx === -1) return prev;

        const item = prev[idx];
        const qty = item.qty || 1;

        // Se tiver mais de 1 unidade, diminui apenas 1
        if (qty > 1) {
            const copy = [...prev];
            copy[idx] = { ...item, qty: qty - 1 };
            return copy;
        }

        // Se for a última unidade e for o único item no carrinho, não remove tudo aqui
        if (prev.length === 1) {
            alert('Não é permitido remover o último item do carrinho aqui.');
            return prev;
        }

        // Remove apenas este item
        const copy = [...prev];
        copy.splice(idx, 1);
        return copy;
    });
};
    const changeCartQty = (index, delta) => {
        setCart((prev) => {
            const copy = [...prev];
            const item = copy[index];
            if (!item) return prev;
            const newQty = (item.qty || 1) + delta;
            if (newQty <= 0) {
                copy.splice(index, 1);
            } else {
                copy[index] = { ...item, qty: newQty };
            }
            return copy;
        });
    };

    const total = useMemo(
        () => cart.reduce((sum, it) => sum + (it.price * (it.qty || 1)), 0),
        [cart]
    );
    const getAvatarUrl = (id) => {
        const sum = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
        const idx = (sum % 70) + 1; // pravatar tem imagens até ~70
        return `https://i.pravatar.cc/150?img=${idx}`;
    };

    const createComandaAndAdd = () => {
        // Não criar a comanda aqui: apenas adiciona o produto ao carrinho
        if (!selectedProduct) return;
        // se o usuário preencheu um nome/numero na caixa, grava no draft (mas não cria a comanda ainda)
        if (comandaInput && comandaInput.trim()) {
            setSaleDraft((prev) => ({ ...(prev || {}), name: comandaInput.trim() }));
        }
        addToCart(selectedProduct);
        setModalVisible(false);
        setSelectedProduct(null);
    };

    // Nota: não permitimos adicionar diretamente a comandas existentes

    const openComandaModal = (product) => {
        setSelectedProduct(product);
        setModalVisible(true);
    };

    const scrollRef = useRef(null);

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 60 * 1000);
        return () => clearInterval(t);
    }, []);

    // rola a tela para o final das compras quando o carrinho muda
    useEffect(() => {
        if (cart && cart.length > 0) {
            // dá um pequeno timeout para garantir layout
            setTimeout(() => {
                try {
                    scrollRef.current?.scrollToEnd({ animated: true });
                } catch (e) {}
            }, 120);
        }
    }, [cart]);

    const openNewSaleModal = () => {
        setSaleType('comanda');
        setOrderInput('');
        setCustomerName('');
        setCustomerAddress('');
        setCustomerPhone('');
        setNewSaleModalVisible(true);
    };

    const handleCreateSale = () => {
        // Não criar a comanda agora: gravar rascunho da venda e permitir adicionar itens via cardápio
        const draft = {
            type: saleType,
            name: comandaInput && comandaInput.trim() ? comandaInput.trim() : (saleType === 'comanda' ? '' : `Entrega ${Date.now().toString().slice(-4)}`),
            order: orderInput,
            customer: saleType === 'entrega' ? { name: customerName, address: customerAddress, phone: customerPhone } : null,
        };
        // Se for comanda, exigir que o cliente coloque o número/nome antes de prosseguir
        if (draft.type === 'comanda' && (!draft.name || !draft.name.trim())) {
            alert('Informe o número/identificação da comanda antes de prosseguir');
            return;
        }
        setSaleDraft(draft);
        setNewSaleModalVisible(false);
    };

    const openComandaDetails = (comanda) => {
        setEditingComanda(comanda);
        setComandaEditMode(false);
        setComandaDetailsVisible(true);
    };

    const saveComandaEdits = () => {
        if (!editingComanda) return;
        setComandas((prev) => prev.map((c) => (c.id === editingComanda.id ? editingComanda : c)));
        setComandaEditMode(false);
        // Mantemos o modal aberto para permitir editar novamente se quiser
        alert('Alterações salvas');
    };

    const deleteComanda = (id) => {
        setComandas((prev) => prev.filter((c) => c.id !== id));
        setComandaDetailsVisible(false);
    };

    const changeComandaItemQty = (index, delta) => {
        setEditingComanda((prev) => {
            if (!prev) return prev;
            const copy = { ...prev };
            copy.items = copy.items ? [...copy.items] : [];
            const it = copy.items[index];
            if (!it) return prev;
            const newQty = (it.qty || 1) + delta;
            if (newQty <= 0) {
                copy.items.splice(index, 1);
            } else {
                copy.items[index] = { ...it, qty: newQty };
            }
            return copy;
        });
    };

    const removeComandaItem = (index) => {
        setEditingComanda((prev) => {
            if (!prev) return prev;
            const copy = { ...prev };
            copy.items = copy.items ? [...copy.items] : [];
            copy.items.splice(index, 1);
            return copy;
        });
    };

    const getComandaElapsedHours = (createdAt) => {
        if (!createdAt) return 0;
        const hours = (now - createdAt) / (1000 * 60 * 60);
        return Math.max(0, Math.min(24, hours));
    };

    const getClockColor = (elapsed) => {
        if (elapsed < 12) return '#FFD54F';
        if (elapsed < 20) return '#FFB74D';
        return '#EF5350';
    };

    const createComandaFromCart = () => {
        if (!cart || cart.length === 0) {
            alert('Carrinho vazio');
            return;
        }
        if (!saleDraft) {
            alert('Inicie uma nova venda (Nova venda) antes de finalizar o carrinho.');
            return;
        }
        const id = Date.now().toString();
        const name = saleDraft.name && saleDraft.name.trim() ? saleDraft.name.trim() : `Comanda ${id.slice(-4)}`;
        const newComanda = {
            id,
            name,
            items: cart,
            createdAt: Date.now(),
            order: saleDraft.order && saleDraft.order.trim() ? saleDraft.order : cart.map((p) => `${p.qty || 1}x ${p.name}`).join(', '),
            type: saleDraft.type || 'comanda',
            customer: saleDraft.customer || null,
        };
        setComandas((prev) => [newComanda, ...prev]);
        setCart([]);
        setSaleDraft(null);
        // reset edit mode if open
        setCardapioEditMode(false);
        setComandaInput('');
        alert(`Comanda criada: ${name}`);
    };
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView ref={scrollRef} style={styles.scrollContainer}>
                <LinearGradient
                    colors={["#872bb8", "#311aa4"]}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.header}
                >
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => navigation.navigate("Dashboard")}>
                            <Ionicons name="chevron-back" size={26} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Vendas</Text>
                        <TouchableOpacity onPress={() => navigation.navigate("Dashboard")}>
                            <Ionicons name="home-outline" size={26} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.summaryRow}>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryLabelWhite}>Itens no carrinho</Text>
                            <Text style={styles.summaryValueWhite}>{cart.length}</Text>
                        </View>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryLabelWhite}>Total</Text>
                            <Text style={styles.summaryValueWhite}>
                                R$ {total.toFixed(2).replace(".", ",")}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.historicButton}
                            onPress={() => {
                                // Você pode criar uma tela de histórico depois
                                alert("Histórico de vendas");
                            }}
                        >
                            <Text style={[styles.historicButtonText, { color: "#7b2ff7" }]}>
                                Histórico
                            </Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    {/* Comandas (parte superior) */}
                    <Text style={styles.sectionTitle}>Comandas</Text>
                    {comandas.length === 0 ? (
                        <View style={{ marginBottom: 8 }}>
                            <Text style={{ color: "#666" }}>Nenhuma comanda criada</Text>
                        </View>
                    ) : (
                        <View>
                           {comandas.map((c, idx) => {
    const elapsed = getComandaElapsedHours(c.createdAt);
    const color = getClockColor(elapsed);
    const hoursLeft = Math.max(0, Math.floor(24 - elapsed));
    return (
        <TouchableOpacity key={c.id} style={styles.comandaCard} onPress={() => openComandaDetails(c)}>
            {/* badge superior: ordem da comanda (1,2,3,...) */}
            <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>{idx + 1}</Text>
            </View>

            {/* badge inferior: número/identificação da comanda (ex: número da mesa) - separado para não colar */}
            <View style={styles.tableBadge}>
                <Text style={styles.tableBadgeText}>{c.name}</Text>
            </View>

            {/* avatar */}
            <Image source={{ uri: getAvatarUrl(c.id) }} style={styles.avatarCircleComanda} />

            <Text style={styles.comandaName} numberOfLines={2}>{c.name}</Text>
            {c.customer ? (
                <View style={{ marginTop: 6, alignItems: 'center' }}>
                    <Text style={{ fontWeight: '700' }}>{c.customer.name}</Text>
                    {c.customer.phone ? <Text style={{ color: '#666' }}>{c.customer.phone}</Text> : null}
                </View>
            ) : null}
            <Text style={[styles.comandaOrder, { marginTop: 8 }]} numberOfLines={2}>Pedido: {c.order ? c.order : ''}</Text>
            <View style={{ width: '100%', marginTop: 8 }}>
                {(c.items || []).map((it, i) => (
                    <Text key={i} style={styles.comandaItemText}>{(it.qty || 1) + 'x ' + it.name + (it.price ? ` — R$ ${it.price.toFixed(2).replace('.',',')}` : '')}</Text>
                ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <Ionicons name="time-outline" size={16} color={color} />
                <Text style={{ marginLeft: 6, color }}>{hoursLeft}h</Text>
            </View>
        </TouchableOpacity>
    );
})}
                        </View>
                    )}

                    {/* Botão nova venda */}
                    <TouchableOpacity
                        style={styles.newSaleButton}
                        onPress={() => openNewSaleModal()}
                    >
                        <Text style={styles.newSaleButtonText}>Fazer nova venda</Text>
                    </TouchableOpacity>
                    


                    <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Carrinho</Text>
                    {cart.length === 0 ? (
                        <View style={styles.emptyCart}>
                            <Text style={styles.emptyText}>Carrinho vazio</Text>
                        </View>
                    ) : (
                        <View style={styles.cartList}>
                            {cart.map((item, idx) => (
                                <View key={idx.toString()} style={styles.cartItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.cartName}>{item.name}</Text>
                                        <Text style={styles.cartPrice}>
                                            R$ {(item.price * (item.qty || 1)).toFixed(2).replace(".", ",")}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <TouchableOpacity style={[styles.historicButton, { padding: 6, marginRight: 8 }]} onPress={() => changeCartQty(idx, -1)}>
                                            <Text style={{ color: '#7b2ff7', fontWeight: '700' }}>-</Text>
                                        </TouchableOpacity>
                                        <Text style={{ marginRight: 8 }}>{item.qty || 1}</Text>
                                        <TouchableOpacity style={[styles.addButton, { padding: 6, marginRight: 8 }]} onPress={() => changeCartQty(idx, 1)}>
                                            <Text style={{ color: '#fff', fontWeight: '700' }}>+</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => removeFromCart(idx)}
                                            style={styles.removeButton}
                                        >
                                            <Ionicons name="trash-outline" size={20} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            {/* Botão Finalizar na parte inferior da seção de compras */}
                            <View style={{ paddingVertical: 8 }}>
                                <TouchableOpacity
                                    style={[styles.checkoutButton, { marginBottom: 18 }]}
                                    onPress={() => createComandaFromCart()}
                                >
                                    <Text style={styles.checkoutText}>Finalizar venda - R$ {total.toFixed(2).replace(".", ",")}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
            {/* Modal do produto/comanda */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Produto: {selectedProduct?.name}</Text>
                        <Text style={styles.modalLabel}>Ações</Text>
                        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                            <TouchableOpacity style={[styles.addButton, { flex: 1, marginRight: 8 }]} onPress={() => { if (selectedProduct) addToCart(selectedProduct); setModalVisible(false); setSelectedProduct(null); }}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Adicionar ao carrinho</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.historicButton, { flex: 0.6, alignItems: 'center', justifyContent: 'center' }]} onPress={() => { setModalVisible(false); setSelectedProduct(null); }}>
                                <Text style={{ fontWeight: '700', color: '#7b2ff7' }}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>Adicionar ao carrinho (opcional: preencher número da comanda)</Text>
                    <TextInput placeholder="Número / nome da comanda" value={comandaInput} onChangeText={setComandaInput} style={styles.input} keyboardType="number-pad" />
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                            <Pressable style={[styles.addButton, { paddingHorizontal: 16 }]} onPress={createComandaAndAdd}>
                                <Text style={{ color: '#fff', fontWeight: '700' }}>Adicionar e fechar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal nova venda (comanda/entrega) */}
            <Modal visible={newSaleModalVisible} transparent animationType="fade">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Nova venda</Text>
                        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                            <TouchableOpacity style={[styles.optionButton, saleType === 'comanda' && styles.optionButtonActive, { marginRight: 8, flex: 1 }]} onPress={() => setSaleType('comanda')}>
                                <Text style={[saleType === 'comanda' ? styles.optionTextActive : styles.optionText]}> {saleType === 'comanda' ? '✓ ' : ''}Comanda</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.optionButton, saleType === 'entrega' && styles.optionButtonActive, { flex: 1 }]} onPress={() => setSaleType('entrega')}>
                                <Text style={[saleType === 'entrega' ? styles.optionTextActive : styles.optionText]}>{saleType === 'entrega' ? '✓ ' : ''}Entrega</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>Pedido</Text>
                        <TextInput placeholder="Descrição do pedido" value={orderInput} onChangeText={setOrderInput} style={styles.input} />

                        {saleType === 'entrega' ? (
                            <>
                                <Text style={styles.modalLabel}>Informações do cliente</Text>
                                    <TextInput placeholder="Nome" value={customerName} onChangeText={setCustomerName} style={styles.input} />
                                    <TextInput placeholder="Endereço" value={customerAddress} onChangeText={setCustomerAddress} style={styles.input} />
                                    <TextInput placeholder="Telefone" value={customerPhone} onChangeText={setCustomerPhone} style={styles.input} keyboardType="phone-pad" />
                            </>
                        ) : (
                            <>
                                <Text style={styles.modalLabel}>Número da comanda (opcional)</Text>
                                <TextInput placeholder="Ex: 001" value={comandaInput} onChangeText={setComandaInput} style={styles.input} keyboardType="number-pad" />
                            </>
                        )}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                            <TouchableOpacity style={[styles.historicButton, { flex: 1, marginRight: 8 }]} onPress={() => setCardapioVisible(true)}>
                                <Text style={{ color: '#7b2ff7', fontWeight: '700' }}>Abrir Cardápio</Text>
                            </TouchableOpacity>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flex: 1 }}>
                                <TouchableOpacity style={[styles.historicButton, { marginRight: 8 }]} onPress={() => setNewSaleModalVisible(false)}>
                                    <Text style={{ color: '#7b2ff7', fontWeight: '700' }}>Cancelar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.addButton} onPress={handleCreateSale}>
                                    <Text style={{ color: '#fff', fontWeight: '700' }}>Criar</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal detalhes da comanda */}
            <Modal visible={comandaDetailsVisible} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                            <View style={styles.modalContainer}>
                                <Text style={styles.modalTitle}>Detalhes da comanda</Text>
                                {editingComanda ? (
                                    <>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ fontWeight: '700' }}>Comanda</Text>
                                            <TouchableOpacity style={styles.historicButton} onPress={() => setComandaEditMode((s) => !s)}>
                                                <Text style={{ color: '#7b2ff7', fontWeight: '700' }}>{comandaEditMode ? 'Cancelar' : 'Editar'}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {comandaEditMode ? (
                                            <>
                                                <Text style={styles.modalLabel}>Número / Nome da comanda</Text>
                                                <TextInput value={editingComanda.name} onChangeText={(v) => setEditingComanda({ ...editingComanda, name: v })} style={styles.input} keyboardType="number-pad" />

                                                <Text style={styles.modalLabel}>Pedido</Text>
                                                <TextInput value={editingComanda.order || ''} onChangeText={(v) => setEditingComanda({ ...editingComanda, order: v })} style={styles.input} />

                                                <Text style={styles.modalLabel}>Informações do cliente</Text>
                                                <TextInput placeholder="Nome" value={editingComanda.customer ? editingComanda.customer.name : ''} onChangeText={(v) => setEditingComanda({ ...editingComanda, customer: { ...(editingComanda.customer || {}), name: v } })} style={styles.input} />
                                                <TextInput placeholder="Endereço" value={editingComanda.customer ? editingComanda.customer.address : ''} onChangeText={(v) => setEditingComanda({ ...editingComanda, customer: { ...(editingComanda.customer || {}), address: v } })} style={styles.input} />
                                                <TextInput placeholder="Telefone" value={editingComanda.customer ? editingComanda.customer.phone : ''} onChangeText={(v) => setEditingComanda({ ...editingComanda, customer: { ...(editingComanda.customer || {}), phone: v } })} style={styles.input} keyboardType="phone-pad" />

                                                <Text style={[styles.modalLabel, { marginTop: 8 }]}>Itens</Text>
                                                <ScrollView style={{ maxHeight: 180 }}>
                                                    {(editingComanda.items || []).map((it, idx) => (
                                                        <View key={idx} style={[styles.comandaRow, { alignItems: 'center' }]}>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ fontWeight: '700' }}>{it.name}</Text>
                                                                {it.price ? <Text style={{ color: '#666' }}>R$ {it.price.toFixed(2).replace('.',',')}</Text> : null}
                                                            </View>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                <TouchableOpacity style={[styles.historicButton, { padding: 6, marginRight: 8 }]} onPress={() => changeComandaItemQty(idx, -1)}>
                                                                    <Text style={{ color: '#7b2ff7', fontWeight: '700' }}>-</Text>
                                                                </TouchableOpacity>
                                                                <Text style={{ marginRight: 8 }}>{it.qty || 1}</Text>
                                                                <TouchableOpacity style={[styles.addButton, { padding: 6, marginRight: 8 }]} onPress={() => changeComandaItemQty(idx, 1)}>
                                                                    <Text style={{ color: '#fff', fontWeight: '700' }}>+</Text>
                                                                </TouchableOpacity>
                                                                <TouchableOpacity style={styles.removeButton} onPress={() => removeComandaItem(idx)}>
                                                                    <Ionicons name="trash-outline" size={18} color="#fff" />
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </ScrollView>

                                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                                                    <TouchableOpacity style={[styles.historicButton, { marginRight: 8 }]} onPress={() => deleteComanda(editingComanda.id)}>
                                                        <Text style={{ color: '#7b2ff7', fontWeight: '700' }}>Apagar</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={styles.addButton} onPress={saveComandaEdits}>
                                                        <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={[styles.historicButton, { marginLeft: 8 }]} onPress={() => setComandaDetailsVisible(false)}>
                                                        <Text style={{ color: '#7b2ff7', fontWeight: '700' }}>Fechar</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </>
                                        ) : (
                                            <>
                                                <Text style={[styles.modalLabel, { marginTop: 8 }]}>Número / Nome</Text>
                                                <Text style={{ fontWeight: '700' }}>{editingComanda.name}</Text>
                                                <Text style={[styles.modalLabel, { marginTop: 8 }]}>Pedido</Text>
                                                <Text>{editingComanda.order}</Text>
                                                {editingComanda.customer ? (
                                                    <>
                                                        <Text style={[styles.modalLabel, { marginTop: 8 }]}>Cliente</Text>
                                                        <Text style={{ fontWeight: '700' }}>{editingComanda.customer.name}</Text>
                                                        {editingComanda.customer.phone ? <Text style={{ color: '#666' }}>{editingComanda.customer.phone}</Text> : null}
                                                    </>
                                                ) : null}
                                                <Text style={[styles.modalLabel, { marginTop: 8 }]}>Itens</Text>
                                                {(editingComanda.items || []).map((it, idx) => (
                                                    <Text key={idx} style={{ marginTop: 4 }}>{(it.qty || 1) + 'x ' + it.name + (it.price ? ` — R$ ${it.price.toFixed(2).replace('.',',')}` : '')}</Text>
                                                ))}
                                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                                                    <TouchableOpacity style={[styles.historicButton, { marginRight: 8 }]} onPress={() => deleteComanda(editingComanda.id)}>
                                                        <Text style={{ color: '#7b2ff7', fontWeight: '700' }}>Apagar</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={styles.addButton} onPress={() => setComandaEditMode(true)}>
                                                        <Text style={{ color: '#fff', fontWeight: '700' }}>Editar</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={[styles.historicButton, { marginLeft: 8 }]} onPress={() => setComandaDetailsVisible(false)}>
                                                        <Text style={{ color: '#7b2ff7', fontWeight: '700' }}>Fechar</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </>
                                        )}
                                    </>
                                ) : null}
                            </View>
                </View>
            </Modal>
            {/* Modal Cardápio */}
            <Modal visible={cardapioVisible} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Cardápio</Text>
                        {/* informações da comanda (um pouco mais abaixo) */}
                        {saleDraft ? (
                            <View style={{ marginBottom: 16, paddingTop: 16 }}>
                                <Text style={{ fontWeight: '700' }}>{saleDraft.name || (saleDraft.type === 'entrega' ? 'Entrega' : 'Comanda')}</Text>
                                {saleDraft.customer ? <Text style={{ color: '#666', marginTop: 6 }}>{saleDraft.customer.name} • {saleDraft.customer.phone}</Text> : null}
                                {saleDraft.order ? <Text style={{ color: '#666', marginTop: 8 }}>{saleDraft.order}</Text> : null}
                            </View>
                        ) : null}

                        <ScrollView style={{ maxHeight: 320 }}>
                            {PRODUCTS.map((p) => {
                                const qty = (cart.find((it) => it.id === p.id)?.qty) || 0;
                                return (
                                    <View key={p.id} style={[styles.comandaRow, { alignItems: 'center' }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View>
                                                <Text style={{ fontWeight: '700' }}>{p.name}</Text>
                                                <Text style={{ color: '#666' }}>R$ {p.price.toFixed(2).replace('.', ',')}</Text>
                                            </View>
                                            <Text style={{ marginLeft: 10, color: '#444', fontWeight: '700' }}>{qty > 0 ? `${qty}x` : ''}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {cardapioEditMode ? (
                                                <TouchableOpacity style={[styles.historicButton, { marginRight: 8 }]} onPress={() => removeProductFromCartById(p.id)}>
                                                    <Text style={{ color: '#e74c3c', fontWeight: '700' }}>Excluir</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <TouchableOpacity style={[styles.historicButton, { marginRight: 8 }]} onPress={() => addToCart(p)}>
                                                    <Text style={{ color: '#7b2ff7', fontWeight: '700' }}>Adicionar</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                            <TouchableOpacity style={[styles.historicButton, { marginRight: 8 }]} onPress={() => setCardapioEditMode((s) => !s)}>
                                <Text style={{ color: '#7b2ff7', fontWeight: '700' }}>{cardapioEditMode ? 'Cancelar' : 'Editar'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.historicButton, { marginLeft: 0 }, cart.length === 0 ? { backgroundColor: '#eadcff' } : {}]}
                                onPress={() => {
                                    if (cart.length === 0) return; // não permite fechar
                                    setCardapioVisible(false);
                                    setCardapioEditMode(false);
                                }}
                                disabled={cart.length === 0}
                            >
                                <Text style={{ color: cart.length === 0 ? '#8f6fe6' : '#7b2ff7', fontWeight: '700' }}>Fechar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#fff",
    },
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    historicButton: {
        backgroundColor: "#fff",
        padding: 8,
        height: 44,
        width: 96,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    historicButtonText: {
        fontWeight: "600",
    },
    summaryBox: {
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        minWidth: 110,
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.12)",
    },
    summaryLabelWhite: {
        fontSize: 12,
        color: "#fff",
    },
    summaryValueWhite: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
        marginTop: 4,
    },
    content: {
        paddingHorizontal: 20,
        marginTop: 18,
        paddingBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#333",
        marginBottom: 10,
    },

    /* novo botão grande */
    newSaleButton: {
        backgroundColor: "#7b2ff7",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        marginBottom: 12,
    },
    newSaleButtonText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
orderBadge: {
    position: 'absolute',
    left: 12,
    top: 8,
    backgroundColor: '#7b2ff7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 6,
},
orderBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
},
tableBadge: {
    position: 'absolute',
    left: 12,
    top: 40, // separado da ordem para não ficar colado
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 5,
},
tableBadgeText: {
    color: '#222',
    fontWeight: '700',
    fontSize: 12,
},
    /* grid de produtos / usuários */
    productWrapper: {
        flex: 1 / 3,
        alignItems: "center",
    },
    productSquare: {
        width: 110,
        height: 110,
        backgroundColor: "#fff",
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        elevation: 2,
    },
    productImage: {
        width: 86,
        height: 86,
        borderRadius: 12,
    },
    productInfo: {
        marginTop: 8,
        alignItems: "center",
    },
    productNameSmall: {
        fontSize: 13,
        fontWeight: "600",
        color: "#222",
        textAlign: "center",
    },
    productPriceSmall: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
        textAlign: "center",
    },

    productCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        elevation: 2,
    },
    productName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#222",
    },
    productPrice: {
        color: "#777",
        marginTop: 6,
    },
    addButton: {
        backgroundColor: "#872bb8",
        padding: 10,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyCart: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 20,
        alignItems: "center",
        elevation: 2,
    },
    emptyText: {
        color: "#888",
    },
    cartList: {
        marginTop: 8,
    },
    cartItem: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        elevation: 1,
    },
    cartName: {
        fontWeight: "600",
        color: "#222",
    },
    cartPrice: {
        color: "#666",
        marginTop: 4,
    },
    removeButton: {
        backgroundColor: "#e74c3c",
        padding: 8,
        borderRadius: 8,
    },
    checkoutButton: {
        backgroundColor: "#7b2ff7",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 8,
    },
    checkotButton: {
        backgroundColor: "#ffffffff",
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        marginTop: 8,
    },
    checkoutText: {
        color: "#fff",
        fontWeight: "700",
    },
    /* novos estilos adicionados */
    productRounded: {
        width: 110,
        height: 160,
        backgroundColor: "#fff",
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "flex-start",
        elevation: 2,
        paddingVertical: 10,
    },
    numberBadge: {
        position: "absolute",
        left: 8,
        top: 8,
        backgroundColor: "rgba(0,0,0,0.06)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    numberBadgeText: {
        fontSize: 12,
        color: "#222",
    },
    avatarCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginTop: 18,
        marginBottom: 8,
    },
    productPriceLarge: {
        fontSize: 18,
        color: "#444",
        fontWeight: "800",
        marginTop: 6,
    },
    productNameTiny: {
        fontSize: 12,
        color: "#666",
        marginTop: 4,
        textAlign: "center",
        width: 86,
    },
    plusCircle: {
        position: "absolute",
        right: 8,
        bottom: 8,
        backgroundColor: "#7b2ff7",
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    comandaCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        alignItems: 'flex-start',
        elevation: 3,
    },
    numberBadgeComanda: {
        position: 'absolute',
        left: 10,
        top: 8,
        backgroundColor: 'rgba(0,0,0,0.06)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    avatarCircleComanda: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginTop: 12,
        marginBottom: 8,
    },
    comandaName: {
        fontWeight: '800',
        color: '#222',
        fontSize: 18,
    },
    comandaOrder: {
        color: '#444',
        fontSize: 15,
        fontWeight: '600',
    },
    comandaItemText: {
        color: '#444',
        fontSize: 14,
        marginTop: 2,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '92%',
        maxWidth: 520,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 6,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#222',
        marginBottom: 8,
    },
    modalLabel: {
        fontSize: 13,
        color: '#333',
        marginTop: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e6e6e6',
        padding: 10,
        borderRadius: 8,
        marginTop: 6,
    },
    comandaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fafafa',
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
    },
    optionButton: {
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    },
    optionButtonActive: {
        backgroundColor: '#fff',
        borderColor: '#7b2ff7',
    },
    optionText: {
        color: '#222',
        fontWeight: '700',
    },
    optionTextActive: {
        color: '#7b2ff7',
        fontWeight: '700',
    },
    floatingMenuButton: {
        position: 'absolute',
        right: 18,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#7b2ff7',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
    },
});