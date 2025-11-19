import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BUTTONS = [
  'Perfil',
  'Contato',
  'Amigos',
  'Chat de conversa',
  'Pedidos',
  'Configurações',
  'Ajuda',
  'Quem somos nós',
  'O que este app faz',
  'Tutorial',
];

export default function UserScreen() {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(null);

  function open(item) {
    setActive(item);
    setVisible(true);
  }

  function close() {
    setVisible(false);
    setActive(null);
  }

  return (
    <SafeAreaView style={styles.safe}>
        <Image
          source={{ uri: 'https://i.pravatar.cc/150?img=12' }}
          style={styles.avatar}
        />
      <ScrollView contentContainerStyle={styles.container}>
        {BUTTONS.map((b) => (
          <TouchableOpacity
            key={b}
            style={styles.button}
            activeOpacity={0.7}
            onPress={() => open(b)}
          >
            <Text style={styles.buttonText}>{b}</Text>
            <Ionicons name="chevron-forward" size={18} color="#872bb8" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={close}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{active}</Text>

            <Text style={styles.modalBody}>Aqui você pode colocar o conteúdo de "{active}".</Text>

            <Pressable style={styles.centerBackButton} onPress={close} accessibilityLabel="Voltar">
              <View style={styles.backInner}>
                <Ionicons name="chevron-back" size={18} color="#872bb8" />
              </View>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: {
    padding: 20,
    paddingTop: 72,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    position: 'absolute',
    top: 18,
    right: 16,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  buttonText: {
    color: '#872bb8',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 12,
  },
  modalBody: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  centerBackButton: {
    alignSelf: 'center',
  },
  backInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#872bb8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

