import React, { useContext } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { BudgetCtx } from "../_layout";

const fmt = (n: number) => new Intl.NumberFormat().format(n);

export default function BudgetScreen() {
  const { budget } = useContext(BudgetCtx);
  const router = useRouter();

  // If no budget yet → show CTA to onboarding
  if (!budget) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Budget</Text>
        <Text style={styles.subtitle}>No budget yet</Text>
        <Pressable onPress={() => router.push("/(onboarding)")} style={styles.button}>
          <Text style={styles.buttonText}>Start Onboarding</Text>
        </Pressable>
      </View>
    );
  }

  // Otherwise render the categories list + Reset action
  const onReset = () => {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem("budget");
      } catch {}
      // full refresh to clear in-memory state
      location.reload();
    } else {
      // on native, just go back to onboarding; setting a new budget will overwrite the old one
      router.push("/(onboarding)");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Budget — {budget.month}</Text>
        <Pressable onPress={onReset}>
          <Text style={styles.resetLink}>Reset</Text>
        </Pressable>
      </View>

      <FlatList
        data={budget.categories}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text>{item.name}</Text>
            <Text>
              {fmt(item.spent)} / {fmt(item.planned)}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 20, fontWeight: "700" },
  resetLink: { color: "#2563eb", fontWeight: "600" },
  subtitle: { marginBottom: 16, color: "#334155" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  separator: { height: 1, backgroundColor: "#e5e7eb" },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: 180,
  },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "600" },
});
