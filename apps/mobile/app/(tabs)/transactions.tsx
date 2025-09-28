import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { BudgetCtx } from "../_layout";

type Txn = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  merchant?: string;
  categoryId: string;
  notes?: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

export default function TransactionsScreen() {
  const { budget, addTxn } = useContext(BudgetCtx);
  const [amount, setAmount] = useState<string>("");
  const [merchant, setMerchant] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [date] = useState<string>(todayISO());
  const [catId, setCatId] = useState<string>("");
  const [txns, setTxns] = useState<Txn[]>([]);

  // Undo state
  const [lastDeleted, setLastDeleted] = useState<Txn | null>(null);
  const [undoVisible, setUndoVisible] = useState<boolean>(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist key (web)
  const storageKey = useMemo(
    () => (budget ? `txns-${budget.month}` : "txns"),
    [budget]
  );

  // Helper to reload from storage
  const reloadFromStorage = useCallback(() => {
    if (Platform.OS !== "web") return;
    try {
      const raw = localStorage.getItem(storageKey);
      setTxns(raw ? JSON.parse(raw) : []);
    } catch {}
  }, [storageKey]);

  // Load from localStorage when key changes
  useEffect(() => {
    reloadFromStorage();
  }, [reloadFromStorage]);

  // Refresh when this screen/tab gains focus
  useFocusEffect(
    useCallback(() => {
      reloadFromStorage();
    }, [reloadFromStorage])
  );

  // Cross-tab reloading (fires when another tab changes localStorage)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onStorage = (e: StorageEvent) => {
      if (e?.key && e.key !== storageKey) return;
      reloadFromStorage();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey, reloadFromStorage]);

  // Same-tab custom event from Budget/Transactions ("txns-updated")
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onCustom = () => reloadFromStorage();
    window.addEventListener("txns-updated", onCustom as EventListener);
    return () =>
      window.removeEventListener("txns-updated", onCustom as EventListener);
  }, [reloadFromStorage]);

  // Default category once budget/categories are available
  useEffect(() => {
    if (!budget?.categories?.[0]) return;
    if (!catId) setCatId(budget.categories[0].id);
  }, [budget, catId]);

  // Persist txns on change (Web)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(txns));
    } catch {}
  }, [txns, storageKey]);

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  if (!budget) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>
          No budget yet. Start from the Budget tab.
        </Text>
      </View>
    );
  }

  const b = budget;

  const onAdd = () => {
    const amt = Number(amount);
    if (!catId || isNaN(amt) || amt <= 0) return;

    const t: Txn = {
      id: String(Date.now()),
      date,
      amount: amt,
      merchant: merchant.trim() || undefined,
      categoryId: catId,
      notes: notes.trim() || undefined,
    };

    // Update list + write storage immediately, then notify
    setTxns((prev) => {
      const next = [t, ...prev].slice(0, 50);
      if (Platform.OS === "web") {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    // Update budget totals
    addTxn(catId, amt);

    // Broadcast after storage is written
    if (Platform.OS === "web") {
      window.dispatchEvent(new Event("txns-updated"));
    }

    // Reset fields
    setAmount("");
    setMerchant("");
    setNotes("");
  };

  const performDelete = (txn: Txn) => {
    // remove from list + write storage
    setTxns((prev) => {
      const next = prev.filter((t) => t.id !== txn.id);
      if (Platform.OS === "web") {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    // reverse spent
    addTxn(txn.categoryId, -txn.amount);

    // notify
    if (Platform.OS === "web") {
      window.dispatchEvent(new Event("txns-updated"));
    }

    // show undo
    setLastDeleted(txn);
    setUndoVisible(true);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoVisible(false);
      setLastDeleted(null);
    }, 5000);
  };

  const handleLongPress = (txn: Txn) => {
    if (Platform.OS === "web") {
      const ok = window.confirm("Delete this transaction?");
      if (ok) performDelete(txn);
    } else {
      Alert.alert(
        "Delete transaction?",
        "This will remove it and subtract the amount from the category.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => performDelete(txn) },
        ]
      );
    }
  };

  const onUndo = () => {
    if (!lastDeleted) return;

    // put back + write storage
    setTxns((prev) => {
      const next = [lastDeleted!, ...prev];
      if (Platform.OS === "web") {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    // restore budget
    addTxn(lastDeleted.categoryId, lastDeleted.amount);

    // notify
    if (Platform.OS === "web") {
      window.dispatchEvent(new Event("txns-updated"));
    }

    setLastDeleted(null);
    setUndoVisible(false);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const selectedCategory = b.categories.find((c) => c.id === catId);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Transactions</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Transaction</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            placeholder="0.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            style={styles.input}
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Date</Text>
            <View style={[styles.input, styles.inputMuted]}>
              <Text>{date} (Today)</Text>
            </View>
          </View>
          <View style={{ width: 12 }} />
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Merchant (optional)</Text>
            <TextInput
              placeholder="e.g., Costco"
              value={merchant}
              onChangeText={setMerchant}
              style={styles.input}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Select Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 6 }}
          >
            {b.categories.map((c) => {
              const active = c.id === catId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCatId(c.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {selectedCategory && (
            <Text style={styles.helper}>
              {selectedCategory.name}: {fmt(selectedCategory.spent)} /{" "}
              {fmt(selectedCategory.planned)}
            </Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            placeholder="Add a note"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={[styles.input, { height: 72, textAlignVertical: "top" }]}
          />
        </View>

        <Pressable
          onPress={onAdd}
          disabled={!catId || !amount || Number(amount) <= 0}
          style={[
            styles.primaryBtn,
            (!catId || !amount || Number(amount) <= 0) &&
              styles.primaryBtnDisabled,
          ]}
        >
          <Text style={styles.primaryBtnText}>Add</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.cardTitle}>This month</Text>
        {txns.length === 0 ? (
          <Text style={styles.subtitle}>No transactions yet.</Text>
        ) : (
          <FlatList
            data={txns}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => {
              const cat = b.categories.find((c) => c.id === item.categoryId);
              return (
                <Pressable onLongPress={() => handleLongPress(item)}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "600" }}>
                        {item.merchant || cat?.name || "Transaction"}
                      </Text>
                      <Text style={{ color: "#64748b", fontSize: 12 }}>
                        {item.date} • {cat?.name ?? "Uncategorized"}
                        {item.notes ? ` • ${item.notes}` : ""}
                      </Text>
                    </View>
                    <Text style={{ fontWeight: "700" }}>{fmt(item.amount)}</Text>
                  </View>
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

      {/* Undo banner */}
      {undoVisible && lastDeleted && (
        <View style={styles.undoBar}>
          <Text style={styles.undoText}>Transaction deleted</Text>
          <Pressable onPress={onUndo} style={styles.undoBtn}>
            <Text style={styles.undoBtnText}>Undo</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  subtitle: { color: "#334155" },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: { fontWeight: "700", marginBottom: 10 },

  field: { marginTop: 10 },
  fieldRow: { flexDirection: "row", marginTop: 10 },
  label: { color: "#334155", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  inputMuted: { backgroundColor: "#f8fafc" },

  chip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#0f172a" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  helper: { marginTop: 6, color: "#64748b", fontSize: 12 },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#fff", fontWeight: "700" },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  separator: { height: 1, backgroundColor: "#e5e7eb" },

  // Undo banner
  undoBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  undoText: { color: "#fff", fontWeight: "600" },
  undoBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  undoBtnText: { color: "#60a5fa", fontWeight: "700" },
});
