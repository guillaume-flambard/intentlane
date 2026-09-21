import { StatusBar } from "expo-status-bar";
import { useEffect, useReducer, useRef } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { applyUrl, initialState, type ExampleState } from "./src/router";
import { routePath } from "./src/routes";

type Action = Readonly<{ type: "url"; url: string }>;

function reduce(state: ExampleState, action: Action): ExampleState {
  return applyUrl(state, action.url);
}

export default function App() {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const handledInitialUrl = useRef(false);

  useEffect(() => {
    const subscription = Linking.addEventListener("url", (event) => {
      dispatch({ type: "url", url: event.url });
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (handledInitialUrl.current) return;
    handledInitialUrl.current = true;
    Linking.getInitialURL().then((url) => {
      if (url) dispatch({ type: "url", url });
    });
  }, []);

  const route = state.route ? routePath(state.route) : "no route yet";

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Kollio</Text>
        <Text style={styles.subtitle}>{state.message}</Text>
      </View>
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>last route</Text>
        <Text style={styles.bannerValue}>{route}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {state.ideas.map((idea) => {
          const selected = idea.id === state.selected;
          return (
            <Pressable
              key={idea.id}
              onPress={() => dispatch({ type: "url", url: `kollio:/ideas?idea=${idea.id}` })}
              style={[styles.card, selected && styles.cardSelected]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{idea.title}</Text>
                <Text style={styles.cardPriority}>{idea.priority}</Text>
              </View>
              <Text style={styles.cardMeta}>
                {idea.id} · effort {idea.effort}
                {idea.due ? ` · due ${idea.due}` : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.hint}>
        Say "Create an idea in IntentLane Example" or open intentlaneexample:/ideas/new?title=Hello
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b0d12", paddingTop: 72, paddingHorizontal: 20 },
  header: { marginBottom: 16 },
  title: { color: "#f6f7fb", fontSize: 30, fontWeight: "700" },
  subtitle: { color: "#a4acc4", fontSize: 14, marginTop: 6 },
  banner: { backgroundColor: "#151926", borderRadius: 10, padding: 12, marginBottom: 16 },
  bannerLabel: { color: "#6f7a94", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  bannerValue: { color: "#7cc4ff", fontSize: 14, marginTop: 4 },
  list: { paddingBottom: 24, gap: 10 },
  card: { backgroundColor: "#151926", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#1e2433" },
  cardSelected: { borderColor: "#7cc4ff" },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: "#f6f7fb", fontSize: 16, fontWeight: "600", flexShrink: 1 },
  cardPriority: { color: "#a4acc4", fontSize: 12, textTransform: "uppercase" },
  cardMeta: { color: "#6f7a94", fontSize: 12, marginTop: 6 },
  hint: { color: "#4f5871", fontSize: 11, paddingBottom: 28, paddingTop: 8 }
});
