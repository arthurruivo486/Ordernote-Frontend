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
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function UserScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [privacyModal, setPrivacyModal] = useState(false);
  const [supportModal, setSupportModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { user, token, isAuthenticated, logout } = useAuth();

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

  const handleContactSupport = () => {
    Linking.openURL(`mailto:suporte@ordernote.com?subject=Suporte - ${user?.name || "Usuário"}`);
  };

  const handleOpenFAQ = () => {
    // Aqui você pode navegar para uma tela de FAQ ou abrir um link
    Alert.alert("FAQ", "Em breve disponível!");
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL("https://seusite.com/politica-de-privacidade");
  };

  const handleTermsOfService = () => {
    Linking.openURL("https://seusite.com/termos-de-uso");
  };

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

          {/* Privacidade */}
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setPrivacyModal(true)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark" size={22} color="#4CAF50" />
              <Text style={styles.menuItemText}>Privacidade e Segurança</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* Ajuda */}
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setSupportModal(true)}
          >
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

      {/* Modal de Privacidade */}
      <Modal
        visible={privacyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacidade e Segurança</Text>
              <TouchableOpacity onPress={() => setPrivacyModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.privacySection}>
                <Ionicons name="shield-checkmark" size={48} color="#4CAF50" style={styles.privacyIcon} />
                <Text style={styles.privacyTitle}>Sua privacidade é importante</Text>
                <Text style={styles.privacyDescription}>
                  Nos comprometemos a proteger seus dados pessoais e garantir a segurança das suas informações.
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.privacyOption}
                onPress={handlePrivacyPolicy}
              >
                <View style={styles.privacyOptionLeft}>
                  <Ionicons name="document-text" size={22} color="#666" />
                  <Text style={styles.privacyOptionText}>Política de Privacidade</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.privacyOption}
                onPress={handleTermsOfService}
              >
                <View style={styles.privacyOptionLeft}>
                  <Ionicons name="reader" size={22} color="#666" />
                  <Text style={styles.privacyOptionText}>Termos de Uso</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>

              <View style={styles.securityInfo}>
                <Text style={styles.securityTitle}>Medidas de Segurança</Text>
                <View style={styles.securityItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.securityText}>Dados criptografados</Text>
                </View>
                <View style={styles.securityItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.securityText}>Autenticação segura</Text>
                </View>
                <View style={styles.securityItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.securityText}>Backups regulares</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setPrivacyModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Fechar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Ajuda e Suporte */}
      <Modal
        visible={supportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSupportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajuda e Suporte</Text>
              <TouchableOpacity onPress={() => setSupportModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.supportSection}>
                <Ionicons name="help-circle" size={48} color="#2196F3" style={styles.supportIcon} />
                <Text style={styles.supportTitle}>Como podemos ajudar?</Text>
                <Text style={styles.supportDescription}>
                  Estamos aqui para responder suas dúvidas e resolver qualquer problema.
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.supportOption}
                onPress={handleContactSupport}
              >
                <View style={styles.supportOptionLeft}>
                  <Ionicons name="mail" size={22} color="#666" />
                  <View>
                    <Text style={styles.supportOptionText}>Contatar Suporte</Text>
                    <Text style={styles.supportOptionSubtext}>Respondemos em até 24h</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.supportOption}
                onPress={handleOpenFAQ}
              >
                <View style={styles.supportOptionLeft}>
                  <Ionicons name="help-buoy" size={22} color="#666" />
                  <View>
                    <Text style={styles.supportOptionText}>Perguntas Frequentes</Text>
                    <Text style={styles.supportOptionSubtext}>Encontre respostas rápidas</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
              </TouchableOpacity>

              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>Informações de Contato</Text>
                <View style={styles.contactItem}>
                  <Ionicons name="time" size={16} color="#666" />
                  <Text style={styles.contactText}>Segunda a Sexta: 9h às 18h</Text>
                </View>
                <View style={styles.contactItem}>
                  <Ionicons name="mail" size={16} color="#666" />
                  <Text style={styles.contactText}>suporte@ordernote.com</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setSupportModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Fechar</Text>
              </TouchableOpacity>
            </ScrollView>
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
  // Privacy Styles
  privacySection: {
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 20,
  },
  privacyIcon: {
    marginBottom: 15,
  },
  privacyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  privacyDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  privacyOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  privacyOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  privacyOptionText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  securityInfo: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  securityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  // Support Styles
  supportSection: {
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 20,
  },
  supportIcon: {
    marginBottom: 15,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  supportDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  supportOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  supportOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  supportOptionText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  supportOptionSubtext: {
    fontSize: 12,
    color: "#999",
    marginLeft: 12,
    marginTop: 2,
  },
  contactInfo: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
});