import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext"; // ← Import do contexto
import api from "../../services/api"; // ← Import da API configurada

export default function UserScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ✅ Usar o contexto de autenticação
  const { user, token, isAuthenticated, logout } = useAuth();

  // ✅ Função para fazer logout
  const handleLogout = () => {
    Alert.alert(
      "Sair da Conta",
      "Tem certeza que deseja sair da sua conta?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            try {
              console.log("🚪 Fazendo logout...");
              await logout();
              // Navegar para a tela de login após logout
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error("❌ Erro ao fazer logout:", error);
              Alert.alert("Erro", "Não foi possível fazer logout");
            }
          }
        }
      ]
    );
  };

  // ✅ Função para trocar de conta (logout + navegar para login)
  const handleSwitchAccount = () => {
    Alert.alert(
      "Trocar de Conta",
      "Deseja sair desta conta e entrar com outra?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Trocar",
          onPress: async () => {
            try {
              console.log("🔄 Trocando de conta...");
              await logout();
              // Navegar para a tela de login
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error("❌ Erro ao trocar conta:", error);
              Alert.alert("Erro", "Não foi possível trocar de conta");
            }
          }
        }
      ]
    );
  };

  // ✅ Função para alterar senha
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Erro", "Preencha todos os campos");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Erro", "As senhas não coincidem");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Erro", "A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      console.log("🔐 Alterando senha...");

      // ✅ Chamar API para alterar senha
      const response = await api.put("/user/change-password", {
        currentPassword,
        newPassword
      });

      Alert.alert("Sucesso", "Senha alterada com sucesso!");
      setChangePasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("❌ Erro ao alterar senha:", error);
      
      let errorMessage = "Não foi possível alterar a senha";
      
      if (error.response?.status === 401) {
        errorMessage = "Senha atual incorreta";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert("Erro", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Mostrar mensagem se não estiver autenticado
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <Ionicons name="lock-closed" size={64} color="#7b2ff7" />
          <Text style={styles.authTitle}>Acesso Restrito</Text>
          <Text style={styles.authMessage}>
            Faça login para acessar seu perfil
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
      <ScrollView style={styles.scrollContainer}>
        {/* Header com Gradiente */}
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
            <Text style={styles.headerTitle}>Perfil</Text>
            <View style={{ width: 26 }} />
          </View>

          {/* Informações do Usuário */}
          <View style={styles.userInfoSection}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={40} color="#7b2ff7" />
            </View>
            <Text style={styles.userName}>{user?.name || "Usuário"}</Text>
            <Text style={styles.userEmail}>{user?.email || "E-mail não informado"}</Text>
            <Text style={styles.userRole}>
              {user?.role === "admin" ? "Administrador" : "Vendedor"}
            </Text>
          </View>
        </LinearGradient>

        {/* Estatísticas Rápidas */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#7b2ff7" />
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Vendas Hoje</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>R$ 1.245</Text>
            <Text style={styles.statLabel}>Total Hoje</Text>
          </View>
        </View>

        {/* Menu de Opções */}
        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>Configurações da Conta</Text>

          {/* Alterar Senha */}
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setChangePasswordModal(true)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="lock-closed" size={22} color="#7b2ff7" />
              <Text style={styles.menuItemText}>Alterar Senha</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* Notificações */}
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications" size={22} color="#FF9800" />
              <Text style={styles.menuItemText}>Notificações</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* Privacidade */}
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark" size={22} color="#4CAF50" />
              <Text style={styles.menuItemText}>Privacidade e Segurança</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* Ajuda */}
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle" size={22} color="#2196F3" />
              <Text style={styles.menuItemText}>Ajuda e Suporte</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Seção de Conta */}
        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>Gerenciar Conta</Text>

          {/* Trocar de Conta */}
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleSwitchAccount}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="swap-horizontal" size={22} color="#9C27B0" />
              <Text style={styles.menuItemText}>Trocar de Conta</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* Sair da Conta */}
          <TouchableOpacity 
            style={[styles.menuItem, styles.logoutItem]}
            onPress={handleLogout}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="log-out" size={22} color="#F44336" />
              <Text style={[styles.menuItemText, styles.logoutText]}>Sair da Conta</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Informações do App */}
        <View style={styles.appInfoContainer}>
          <Text style={styles.appVersion}>Ordernote v1.0.0</Text>
          <Text style={styles.appCopyright}>© 2024 Ordernote. Todos os direitos reservados.</Text>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Modal para Alterar Senha */}
      <Modal
        visible={changePasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alterar Senha</Text>
              <TouchableOpacity onPress={() => setChangePasswordModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Senha Atual</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Digite sua senha atual"
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />

              <Text style={styles.inputLabel}>Nova Senha</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Digite a nova senha"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />

              <Text style={styles.inputLabel}>Confirmar Nova Senha</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Confirme a nova senha"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity 
                style={[
                  styles.modalButton,
                  loading && styles.modalButtonDisabled
                ]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Alterar Senha</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setChangePasswordModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ✅ ESTILOS ATUALIZADOS
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f4fc",
  },
  scrollContainer: {
    flex: 1,
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
    paddingBottom: 30,
    paddingTop: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  userInfoSection: {
    alignItems: "center",
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.9,
    marginBottom: 5,
  },
  userRole: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.7,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
  },
  statCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  menuContainer: {
    backgroundColor: "#fff",
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: "#F44336",
  },
  appInfoContainer: {
    alignItems: "center",
    padding: 20,
  },
  appVersion: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  appCopyright: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  bottomSpace: {
    height: 40,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 15,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  modalButton: {
    backgroundColor: "#7b2ff7",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  modalButtonDisabled: {
    backgroundColor: "#ccc",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalCancelButton: {
    padding: 16,
    alignItems: "center",
    marginTop: 10,
  },
  modalCancelButtonText: {
    color: "#666",
    fontSize: 16,
  },
});