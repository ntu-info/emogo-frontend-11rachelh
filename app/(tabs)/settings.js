import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      {/* Second tab content */}
      <Text style={styles.title}>Settings tab</Text>

      {/* Link back to the home tab */}
      <Link href="/(tabs)" style={styles.link}>
        Back to Home tab
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
  },
  link: {
    fontSize: 16,
    marginBottom: 12,
    textDecorationLine: "underline",
  },
});
