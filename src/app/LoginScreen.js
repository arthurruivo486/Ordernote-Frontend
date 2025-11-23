import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

      if (response.status === 200) {
        const { user, token } = response.data;
        await login(user, token);
        navigation.replace("MainApp");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Erro ao fazer login";
      Alert.alert("Erro", errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* ▬▬▬▬ BARRA BRANCA SUPERIOR ▬▬▬▬ */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>Ordernote</Text>
        </View>
      </View>

      {/* ▬▬▬▬ GRADIENTE ROXO DE FUNDO ▬▬▬▬ */}
      <LinearGradient
        colors={["#872bb8", "#311aa4"]}
        style={styles.gradientArea}
      >

        {/* TÍTULO LOGIN */}
        <Text style={styles.loginTitle}>Login</Text>

        {/* INPUT EMAIL */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor="#4c1a88"
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
          />
        </View>

        {/* INPUT SENHA + ÍCONE */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor="#4c1a88"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color="#4c1a88"
            />
          </TouchableOpacity>
        </View>

        {/* BOTÃO ENTRAR */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginButtonText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* ▬▬▬▬ BARRA BRANCA SUPERIOR ▬▬▬▬ */
 header: {
  width: "100%",
  backgroundColor: "#ffffff",
  paddingVertical: 60,   // AUMENTADO (antes 35)
  paddingHorizontal: 18,
  borderBottomLeftRadius: 25,
  borderBottomRightRadius: 25,
  elevation: 8,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 6,
  marginBottom: -40,     // empurra mais para baixo
  zIndex: 10,
},
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 45,
    height: 45,
    marginRight: 10,
  },
  logoText: {
    fontSize: 28,
    color: "#8b1bb7",
    fontWeight: "bold",
  },

  /* ▬▬▬▬ ÁREA DO GRADIENTE (SEM CARD) ▬▬▬▬ */
  gradientArea: {
  flex: 1,
  width: "100%",
  paddingHorizontal: 25,
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,

  // CENTRALIZAR LOGIN
  justifyContent: "center",
},

  loginTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 25,
  },

  inputWrapper: {
    width: "100%",
    marginBottom: 15,
  },

  input: {
    width: "100%",
    height: 55,
    backgroundColor: "#ffffff",
    borderRadius: 15,
    paddingHorizontal: 20,
    fontSize: 16,
  },

  eyeButton: {
    position: "absolute",
    right: 18,
    top: 16,
  },

  loginButton: {
    width: "100%",
    height: 55,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },

  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
