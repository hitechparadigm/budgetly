import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { BudgetCtx } from "../_layout";
import type { Category } from "../_layout";

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export default function BudgetScreen() {
  const router = useRouter();
  const { budget, setBudget } = useContext(BudgetCtx);

  // UI state (declare unconditionally)
  const [editing, setEditing] = useState<boolean>(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // When budget changes, seed edit drafts
  useEffect(() => {
    if (!budget) {
      setDrafts({});
      return;
    }
    const init: Record<string, string> = {};
    budget.categories.forEach((c) => {
      init[c.id] = String(c.planned ?? 0);
    });
    setDrafts(init);
  }, [budget]);

  // Totals (planned/spent/remaining)
  const totals = useMemo(() => {
    if (!budget) return { planned: 0, spent: 0, remaining: 0 };
    const planned = budget.categories.reduce(
      (s, c) => s + (Number(c.planned) || 0),
      0
    );
    const spent = budget.categories.reduce(
      (s, c) => s + (Number(c.spent) || 0),
      0
    );
    return { planned, spent, remaining: planned - spent };
  }, [budget]);

  const goOnboarding = useCallback(() => {
    router.push("/(onboarding)");
  }, [router]);

  const startEdit = useCallback(() => setEditing(true), []);
  const cancelEdit = useCallback(() => {
    if (!budget) return;
    const reset: Record<string, string> = {};
    budget.categories.forEach((c) => (reset[c.id] = String(c.planned ?? 0)));
    setDrafts(reset);
    setEditing(false);
  }, [budget]);

  const saveEdits = useCallback(() => {
    if (!budget) return;
    const updatedCats: Category[] = budget.categories.map((c) => ({
      ...c,
      planned: Number(drafts[c.id]) || 0,
    }));
    setBudget({ ...budget, categories: updatedCats });
    setEditing(false);
  }, [budget, drafts, setBudget]);

  // --- Render ---

  if (!budget) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Budget</Text>
        <Text style={styles.subtitle}>No budget yet</Text>
        <Pressable onPress={goOnboarding} style={styles.button}>
          <Text style={styles.buttonText}>Start Onboarding</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Budget — {budget.month}</Text>

      {/* Totals */}
      <View style={styles.totals}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Planned</Text>
          <Text style={styles.totalValue}>{fmt(totals.planned)}</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Spent</Text>
          <Text style={styles.totalValue}>{fmt(totals.spent)}</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Remaining</Text>
          <Text
            style={[
              styles.totalValue,
              totals.remaining < 0 && { color: "#dc2626" },
            ]}
          >
            {fmt(totals.remaining)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
        {!editing ? (
          <Pressable onPress={startEdit} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Edit Planned</Text>
          </Pressable>
        ) : (
          <>
            <Pressable onPress={saveEdits} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Save</Text>
            </Pressable>
            <Pressable onPress={cancelEdit} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Categories */}
      <FlatList
        data={budget.categories}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={{ flex: 1 }}>{item.name}</Text>

            {editing ? (
              <TextInput
                style={[styles.input, { width: 90, textAlign: "right" }]}
                keyboardType="numeric"
                value={drafts[item.id] ?? ""}
                onChangeText={(v) =>
                  setDrafts((d) => ({ ...d, [item.id]: v }))
                }
              />
            ) : (
              <Text style={{ width: 140, textAlign: "right" }}>
                {fmt(item.spent)} / {fmt(item.planned)}
              </Text>
            )}
          </View>
        )}
        ItemSeparatorComponent={() => (
          <View style={{ height: 1, backgroundColor: "#e5e7eb" }} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  subtitle: { marginBottom: 16, color: "#334155" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  totals: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  totalBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
  },
  totalLabel: { color: "#64748b", fontSize: 12 },
  totalValue: { fontWeight: "800", marginTop: 2 },

  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },

  primaryBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  secondaryBtnText: { color: "#0f172a", fontWeight: "700" },

  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: 180,
  },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "600" },
});
