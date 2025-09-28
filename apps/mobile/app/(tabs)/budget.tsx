import React, { useContext, useMemo, useState } from "react";
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

export default function BudgetScreen() {
  const { budget, setBudget } = useContext(BudgetCtx);
  const router = useRouter();

  // If no budget yet → show CTA to onboarding
  if (!budget) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Budget</Text>
        <Text style={styles.subtitle}>No budget yet</Text>
        <Pressable
          onPress={() => router.push("/(onboarding)")}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Start Onboarding</Text>
        </Pressable>
      </View>
    );
  }

  const b = budget;
  const totals = useMemo(() => {
    const planned = b.categories.reduce((s, c) => s + (c.planned || 0), 0);
    const spent = b.categories.reduce((s, c) => s + (c.spent || 0), 0);
    const leftover = planned - spent;
    return { planned, spent, leftover };
  }, [b]);

  // Inline edit state
  const [editId, setEditId] = useState<string>("");
  const [editVal, setEditVal] = useState<string>("");

  const startEdit = (id: string, currentPlanned: number) => {
    setEditId(id);
    setEditVal(String(currentPlanned ?? 0));
  };
  const cancelEdit = () => {
    setEditId("");
    setEditVal("");
  };
  const saveEdit = () => {
    const val = Number(editVal);
    if (isNaN(val) || val < 0) return;
    const next = {
      ...b,
      categories: b.categories.map((c) =>
        c.id === editId ? { ...c, planned: val } : c
      ),
    };
    setBudget(next);
    cancelEdit();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Budget — {b.month}</Text>

      {/* Summary header */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Planned</Text>
          <Text style={styles.summaryValue}>{fmt(totals.planned)}</Text>
        </View>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Spent</Text>
          <Text style={styles.summaryValue}>{fmt(totals.spent)}</Text>
        </View>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryLabel}>Leftover</Text>
          <Text
            style={[
              styles.summaryValue,
              totals.leftover < 0 && { color: "#ef4444" },
            ]}
          >
            {fmt(totals.leftover)}
          </Text>
        </View>
      </View>

      <FlatList
        data={b.categories}
        keyExtractor={(c) => c.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => {
          const pct =
            item.planned > 0 ? Math.min(100, (item.spent / item.planned) * 100) : 0;
          const over = item.spent > item.planned && item.planned > 0;

          const isEditing = editId === item.id;

          return (
            <View style={styles.catRow}>
              {!isEditing ? (
                <>
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowTop}>
                      <Text style={styles.catName}>{item.name}</Text>
                      <Text style={styles.catAmt}>
                        {fmt(item.spent)} / {fmt(item.planned)}
                      </Text>
                    </View>

                    {/* Progress */}
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${pct}%` },
                          over && styles.barFillOver,
                        ]}
                      />
                    </View>

                    {/* Edit link */}
                    <View style={styles.rowBottom}>
                      <Pressable
                        onPress={() => startEdit(item.id, item.planned)}
                        style={styles.linkBtn}
                      >
                        <Text style={styles.linkText}>Edit planned</Text>
                      </Pressable>
                      {over && (
                        <Text style={styles.overText}>Over by {fmt(item.spent - item.planned)}</Text>
                      )}
                    </View>
                  </View>
                </>
              ) : (
                <View style={{ flex: 1 }}>
                  <Text style={styles.editLabel}>
                    {item.name} — new planned amount
                  </Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editVal}
                    onChangeText={setEditVal}
                    placeholder="0.00"
                  />
                  <View style={styles.editActions}>
                    <Pressable onPress={saveEdit} style={[styles.button, styles.buttonPrimary]}>
                      <Text style={styles.buttonText}>Save</Text>
                    </Pressable>
                    <Pressable onPress={cancelEdit} style={[styles.button, styles.buttonGhost]}>
                      <Text style={[styles.buttonText, { color: "#0f172a" }]}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  subtitle: { marginBottom: 16, color: "#334155" },

  // empty state CTA
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: 180,
    alignItems: "center",
  },
  buttonPrimary: { backgroundColor: "#2563eb" },
  buttonGhost: { backgroundColor: "#e5e7eb" },
  buttonText: { color: "#fff", fontWeight: "600" },

  // summary
  summaryCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  summaryCol: { flex: 1, alignItems: "center" },
  summaryLabel: { color: "#64748b", fontSize: 12, marginBottom: 4 },
  summaryValue: { fontWeight: "700" },

  // categories
  sep: { height: 1, backgroundColor: "#e5e7eb" },
  catRow: { paddingVertical: 10 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  catName: { fontWeight: "600" },
  catAmt: { color: "#0f172a", fontWeight: "600" },

  barTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#2563eb",
  },
  barFillOver: { backgroundColor: "#ef4444" },

  rowBottom: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkBtn: { paddingVertical: 4, paddingHorizontal: 0 },
  linkText: { color: "#2563eb", fontWeight: "600" },
  overText: { color: "#ef4444", fontSize: 12 },

  // edit UI
  editLabel: { marginBottom: 6, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  editActions: { flexDirection: "row", gap: 10, marginTop: 10 },
});
