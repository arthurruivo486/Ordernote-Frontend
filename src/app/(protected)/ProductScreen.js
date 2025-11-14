
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProductScreen() {
  //const [products, setProducts] = useState([]);
  //const [filteredProducts, setFilteredProducts] = useState([]);
  //const [searchQuery, setSearchQuery] = useState("");

  //useEffect(() => {
    //fetchProducts();
  //}, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <LinearGradient
          colors={["#872bb8", "#311aa4"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.navigate("Product")}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.title}>Produtos</Text>
          </View>
        </LinearGradient>

        <TouchableOpacity style={styles.mainButton}>
          <Text style={styles.mainButtonText} >nova categoria</Text>
        </TouchableOpacity>

        <View style={styles.productList}>
          <TouchableOpacity style={styles.productItem}>
            <Text>Produto 1</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.productItem}>
            <Text>Produto 2</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.productItem}>
            <Text>Produto 3</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
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
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    left:"32%",
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },

  productList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  productItem: {
    backgroundColor: "#fff",
    width: "47%",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  mainButton: {
    backgroundColor: "#7b2ff7",
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  mainButtonText: {
    color: "#fff",
  },
}