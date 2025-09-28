import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { BudgetCtx } from "../_layout";

type TxnLite = { categoryId: string; amount: number };

export default function BudgetScreen() {
  const { budget, setBudget } = useContext(BudgetCtx);
  const router = useRouter();

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
  const storageKey = `txns-${b.month}`;

  const totals = useMemo(() => {
    const planned = b.categories.reduce((s, c) => s + (c.planned || 0), 0);
    const spent = b.categories.reduce((s, c) => s + (c.spent || 0), 0);
    const leftover = planned - spent;
    return { planned, spent, leftover };
  }, [b]);

  // --- Reconcile 'spent' from localStorage txns (Web) ---
  const reconcileFromStorage = useCallback(() => {
    if (Platform.OS !== "web" || !budget) return;
    try {
      const raw = localStorage.getItem(`txns-${budget.month}`);
      const txns: TxnLite[] = raw ? JSON.parse(raw) : [];
      const sums: Record<string, number> = {};
      for (const t of txns) {
        const amt = Number(t.amount) || 0;
        sums[t.categoryId] = (sums[t.categoryId] || 0) + amt;
      }
      const next = {
        ...budget,
        categories: budget.categories.map((c) => ({
          ...c,
          spent: sums[c.id] || 0,
        })),
      };
      setBudget(next);
    } catch {}
  }, [budget, setBudget]);

  // Listen to same-tab event + cross-tab storage changes
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const onCustom = () => {
      // tiny delay so writers finish updating localStorage first
      setTimeout(reconcileFromStorage, 50);
    };
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key !== storageKey) return;
      reconcileFromStorage();
    };

    window.addEventListener("txns-updated", onCustom as EventListener);
    window.addEventListener("storage", onStorage);

    // Also run once on mount/when month changes
    reconcileFromStorage();

    return () => {
      window.removeEventListener("txns-updated", onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey, reconcileFromStorage]);

  // ----- Inline edit planned -----
  const [editId, setEditId] = useState<string>("");
  const [editVal, setEditVal] = useState<string>("");

  const startEdit = (id: string, currentPlanned: number) => {
    setRenameId("");
    setMoveId("");
    setMoveTargetId("");
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

  // ----- Rename category -----
  const [renameId, setRenameId] = useState<string>("");
  const [renameVal, setRenameVal] = useState<string>("");

  const startRename = (id: string, currentName: string) => {
    setEditId("");
    setMoveId("");
    setMoveTargetId("");
    setRenameId(id);
    setRenameVal(currentName);
  };
  const cancelRename = () => {
    setRenameId("");
    setRenameVal("");
  };
  const saveRename = () => {
    const name = renameVal.trim();
    if (!name) return;
    const next = {
      ...b,
      categories: b.categories.map((c) =>
        c.id === renameId ? { ...c, name } : c
      ),
    };
    setBudget(next);
    cancelRename();
  };

  // ----- Add category -----
  const [newName, setNewName] = useState<string>("");
  const [newPlanned, setNewPlanned] = useState<string>("");

  const addCategory = () => {
    const name = newName.trim();
    if (!name) return;
    const planned = Number(newPlanned || "0");
    if (isNaN(planned) || planned < 0) return;

    const id = `${Date.now().toString(36)}-${Math.round(Math.random() * 1e6)}`;
    const next = {
      ...b,
      categories: [...b.categories, { id, name, planned, spent: 0 }],
    };
    setBudget(next);
    setNewName("");
    setNewPlanned("");
  };

  // ----- Delete category (guard if spent > 0) -----
  const confirmDelete = (catId: string, catName: string, spent: number) => {
    if (spent > 0) {
      const msg = `Category "${catName}" has ${fmt(spent)} spent.\nMove or delete its transactions first.`;
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Can't delete", msg);
      return;
    }
    const doDelete = () => {
      const next = { ...b, categories: b.categories.filter((c) => c.id !== catId) };
      setBudget(next);
    };
    if (Platform.OS === "web") {
      const ok = window.confirm(`Delete category "${catName}"?`);
      if (ok) doDelete();
    } else {
      Alert.alert(`Delete "${catName}"?`, "This category will be removed.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  // ----- Move transactions from one category to another (Web) -----
  const [moveId, setMoveId] = useState<string>("");
  const [moveTargetId, setMoveTargetId] = useState<string>("");

  const startMove = (sourceId: string) => {
    setEditId("");
    setRenameId("");
    setMoveId(sourceId);
    const firstOther = b.categories.find((c) => c.id !== sourceId);
    setMoveTargetId(firstOther?.id ?? "");
  };
  const cancelMove = () => {
    setMoveId("");
    setMoveTargetId("");
  };

  const confirmMove = () => {
    if (!moveId || !moveTargetId || moveId === moveTargetId) return;

    if (Platform.OS !== "web") {
      Alert.alert(
        "Move on Web",
        "Moving transactions is supported on Web for this MVP. Re-enter them on mobile if needed."
      );
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      const txns: TxnLite[] = raw ? JSON.parse(raw) : [];

      const moved = txns.filter((t) => t.categoryId === moveId);
      if (moved.length === 0) {
        window.alert("No transactions to move in this category for this month.");
        cancelMove();
        return;
      }
      const movedSum = moved.reduce((s, t) => s + (Number(t.amount) || 0), 0);

      // reassign category in storage
      const updated = txns.map((t) =>
        t.categoryId === moveId ? { ...t, categoryId: moveTargetId } : t
      );
      localStorage.setItem(storageKey, JSON.stringify(updated));

      // update budget totals (subtract from source, add to target)
      const next = {
        ...b,
        categories: b.categories.map((c) => {
          if (c.id === moveId) return { ...c, spent: Math.max(0, (c.spent || 0) - movedSum) };
          if (c.id === moveTargetId) return { ...c, spent: (c.spent || 0) + movedSum };
          return c;
        }),
      };
      setBudget(next);

      // notify transactions view(s)
      if (Platform.OS === "web") {
        window.dispatchEvent(new Event("txns-updated"));
      }

      cancelMove();
      window.alert(`Moved ${moved.length} transaction(s) totaling ${fmt(movedSum)}.`);
    } catch (e) {
      console.error(e);
      if (Platform.OS === "web") window.alert("Failed to move transactions.");
      else Alert.alert("Error", "Failed to move transactions.");
    }
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

      {/* Add Category */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Category</Text>
        <View style={styles.fieldRow}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              placeholder="e.g., Dining Out"
              value={newName}
              onChangeText={setNewName}
              style={styles.input}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={[styles.field, { width: 140 }]}>
            <Text style={styles.label}>Planned</Text>
            <TextInput
              placeholder="0.00"
              keyboardType="numeric"
              value={newPlanned}
              onChangeText={setNewPlanned}
              style={styles.input}
            />
          </View>
        </View>
        <Pressable
          onPress={addCategory}
          disabled={!newName.trim() || isNaN(Number(newPlanned || "0"))}
          style={[
            styles.button,
            styles.buttonPrimary,
            (!newName.trim() || isNaN(Number(newPlanned || "0"))) && {
              opacity: 0.6,
            },
          ]}
        >
          <Text style={styles.buttonText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={b.categories}
        keyExtractor={(c) => c.id}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => {
          const pct =
            item.planned > 0 ? Math.min(100, (item.spent / item.planned) * 100) : 0;
          const over = item.spent > item.planned && item.planned > 0;

          const isEditingPlanned = editId === item.id;
          const isRenaming = renameId === item.id;
          const isMoving = moveId === item.id;

          return (
            <View style={styles.catRow}>
              {isEditingPlanned ? (
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
              ) : isRenaming ? (
                <View style={{ flex: 1 }}>
                  <Text style={styles.editLabel}>Rename category</Text>
                  <TextInput
                    style={styles.input}
                    value={renameVal}
                    onChangeText={setRenameVal}
                    placeholder="Category name"
                  />
                  <View style={styles.editActions}>
                    <Pressable onPress={saveRename} style={[styles.button, styles.buttonPrimary]}>
                      <Text style={styles.buttonText}>Save</Text>
                    </Pressable>
                    <Pressable onPress={cancelRename} style={[styles.button, styles.buttonGhost]}>
                      <Text style={[styles.buttonText, { color: "#0f172a" }]}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : isMoving ? (
                <View style={{ flex: 1 }}>
                  <Text style={styles.editLabel}>Move transactions from “{item.name}” to:</Text>
                  {b.categories.filter((c) => c.id !== item.id).length === 0 ? (
                    <Text style={styles.subtitle}>
                      No other categories available. Create one first.
                    </Text>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {b.categories
                        .filter((c) => c.id !== item.id)
                        .map((c) => {
                          const active = c.id === moveTargetId;
                          return (
                            <Pressable
                              key={c.id}
                              onPress={() => setMoveTargetId(c.id)}
                              style={[
                                styles.chip,
                                active && styles.chipActive,
                              ]}
                            >
                              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                {c.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                    </View>
                  )}

                  <View style={styles.editActions}>
                    <Pressable
                      onPress={confirmMove}
                      disabled={!moveTargetId}
                      style={[
                        styles.button,
                        styles.buttonPrimary,
                        !moveTargetId && { opacity: 0.6 },
                      ]}
                    >
                      <Text style={styles.buttonText}>Move</Text>
                    </Pressable>
                    <Pressable onPress={cancelMove} style={[styles.button, styles.buttonGhost]}>
                      <Text style={[styles.buttonText, { color: "#0f172a" }]}>Cancel</Text>
                    </Pressable>
                  </View>

                  {Platform.OS !== "web" && (
                    <Text style={[styles.subtitle, { marginTop: 8 }]}>
                      Tip: Moving is supported on Web for the MVP. On mobile, re-enter the
                      transactions under the new category.
                    </Text>
                  )}
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.catName}>{item.name}</Text>
                    <Text style={styles.catAmt}>
                      {fmt(item.spent)} / {fmt(item.planned)}
                    </Text>
                  </View>

                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${pct}%` },
                        over && styles.barFillOver,
                      ]}
                    />
                  </View>

                  <View style={styles.rowBottom}>
                    <View style={{ flexDirection: "row", gap: 14, flexWrap: "wrap" }}>
                      <Pressable onPress={() => startEdit(item.id, item.planned)} style={styles.linkBtn}>
                        <Text style={styles.linkText}>Edit planned</Text>
                      </Pressable>
                      <Pressable onPress={() => startRename(item.id, item.name)} style={styles.linkBtn}>
                        <Text style={styles.linkText}>Rename</Text>
                      </Pressable>
                      <Pressable onPress={() => startMove(item.id)} style={styles.linkBtn}>
                        <Text style={styles.linkText}>Move txns…</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => confirmDelete(item.id, item.name, item.spent || 0)}
                        style={styles.linkBtn}
                      >
                        <Text style={[styles.linkText, { color: "#ef4444" }]}>Delete</Text>
                      </Pressable>
                    </View>
                    {over && (
                      <Text style={styles.overText}>
                        Over by {fmt(item.spent - item.planned)}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: 16 }}
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
  subtitle: { marginBottom: 8, color: "#334155" },

  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  buttonPrimary: { backgroundColor: "#2563eb" },
  buttonGhost: { backgroundColor: "#e5e7eb" },
  buttonText: { color: "#fff", fontWeight: "600" },

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

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontWeight: "700", marginBottom: 10 },

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

  editLabel: { marginBottom: 6, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  field: { marginTop: 10 },
  fieldRow: { flexDirection: "row", marginTop: 10 },
  editActions: { flexDirection: "row", gap: 10, marginTop: 10 },

  chip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#0f172a" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
});
