import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from "react-native";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Erro", "Preencha e-mail e senha.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/login", {
        email: email.trim(),
        password: password.trim(),
      });

      console.log("RESPOSTA LOGIN:", response.data);

      if (response.status === 200) {
        const { user, token } = response.data;
        
        // Salvar no contexto e AsyncStorage
        await login(user, token);
        
        Alert.alert("Sucesso", "Login realizado!");
        navigation.replace("MainApp");
      }
    } catch (error) {
      console.log("ERRO LOGIN:", error.response?.data || error.message);
      
      const errorMessage = error.response?.data?.message || "Erro ao fazer login";
      Alert.alert("Erro", errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ordernote</Text>

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor="#aaa"
        value={email}
        autoCapitalize="none"
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#aaa"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#311aa4",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
    color: "#fff",
    marginBottom: 40,
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  button: {
    width: "100%",
    padding: 15,
    backgroundColor: "#872bb8",
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
  },
});