import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { BudgetCtx } from "../_layout";

type Txn = {
  id: string;
  date: string;        // YYYY-MM-DD
  amount: number;
  merchant?: string;
  categoryId: string;
  notes?: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function TransactionsScreen() {
  const { budget } = useContext(BudgetCtx);
  const { catId: catFromRoute } = useLocalSearchParams<{ catId?: string }>();
  const initialCatId = typeof catFromRoute === "string" ? catFromRoute : "";

  // ---- hooks (always the same order & count) ----
  const [amount, setAmount] = useState<string>("");
  const [merchant, setMerchant] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [date] = useState<string>(todayISO());
  const [catId, setCatId] = useState<string>(initialCatId);
  const [txns, setTxns] = useState<Txn[]>([]);

  const storageKey = useMemo(() => (budget ? `txns-${budget.month}` : "txns"), [budget]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    try {
      const raw = localStorage.getItem(storageKey);
      setTxns(raw ? JSON.parse(raw) : []);
    } catch {
      setTxns([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!budget) return;
    if (!catId) {
      const firstExpense = budget.categories.find((c) => c.type === "expense");
      if (firstExpense) setCatId(firstExpense.id);
    }
  }, [budget, catId]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(txns));
    } catch {}
  }, [txns, storageKey]);

  // ---- render (no hooks below this line) ----
  if (!budget) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Transactions</Text>
        <Text>No budget found. Complete onboarding first.</Text>
      </View>
    );
  }

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
    setTxns((prev) => [t, ...prev].slice(0, 200));
    setAmount("");
    setMerchant("");
    setNotes("");
  };

  const selectedCategory = budget.categories.find((c) => c.id === catId);
  const expenseCategories = useMemo(
    () => budget.categories.filter((c) => c.type === "expense"),
    [budget]
  );

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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {expenseCategories.map((c) => {
              const active = c.id === catId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCatId(c.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {c.group ? `${c.group} • ${c.name}` : c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {selectedCategory && (
            <Text style={styles.helper}>
              {selectedCategory.group ? `${selectedCategory.group} • ${selectedCategory.name}` : selectedCategory.name}
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
          style={[styles.primaryBtn, (!catId || !amount || Number(amount) <= 0) && styles.primaryBtnDisabled]}
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
              const cat = budget.categories.find((c) => c.id === item.categoryId);
              return (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "600" }}>{item.merchant || cat?.name || "Transaction"}</Text>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>
                      {item.date} • {cat ? (cat.group ? `${cat.group} • ${cat.name}` : cat.name) : "Uncategorized"}
                      {item.notes ? ` • ${item.notes}` : ""}
                    </Text>
                  </View>
                  <Text style={{ fontWeight: "700" }}>{fmt(item.amount)}</Text>
                </View>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  subtitle: { color: "#334155" },
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 16 },
  cardTitle: { fontWeight: "700", marginBottom: 10 },
  field: { marginTop: 10 },
  fieldRow: { flexDirection: "row", marginTop: 10 },
  label: { color: "#334155", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff" },
  inputMuted: { backgroundColor: "#f8fafc" },
  chip: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, backgroundColor: "#fff" },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { color: "#0f172a" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  helper: { marginTop: 6, color: "#64748b", fontSize: 12 },
  primaryBtn: { marginTop: 14, backgroundColor: "#2563eb", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "#fff", fontWeight: "700" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  separator: { height: 1, backgroundColor: "#e5e7eb" },
});
