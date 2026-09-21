import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>IntentLane Example</Text>
      <Text style={styles.body}>
        Register an idea in the iOS Shortcuts app and watch the route open.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#0b0d12",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24
  },
  title: {
    color: "#f6f7fb",
    fontSize: 22,
    fontWeight: "600"
  },
  body: {
    color: "#a4acc4",
    fontSize: 15,
    textAlign: "center"
  }
});
