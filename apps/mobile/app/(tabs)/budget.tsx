import React, { useContext, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { BudgetCtx, Category } from "../_layout";

const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

// Quick add lists
const COMMON_INCOME = [
  "Primary Income",
  "Other Income",
  "Bonus",
  "Interest / Dividends",
  "Side Hustle",
];

const DEFAULT_EXPENSE_GROUPS = [
  "Housing",
  "Transportation",
  "Groceries",
  "Utilities",
  "Health",
  "Insurance",
  "Lifestyle",
  "Personal",
  "Savings/Goals",
  "Dining Out",
  "Debt Payments",
  "Childcare",
  "Entertainment",
  "Clothing",
  "Gifts/Donations",
  "Phone/Internet",
  "Subscriptions",
  "Pets",
  "Education",
  "Taxes",
  "Miscellaneous",
];

export default function BudgetScreen() {
  const router = useRouter();
  const {
    budget,
    getTotals,
    getSpentByCategory,
    setPlanned,
    resetMonth,
    addCategory,
  } = useContext(BudgetCtx);

  // inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // add category (free form)
  const [addingType, setAddingType] =
    useState<"income" | "expense" | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatGroup, setNewCatGroup] = useState<string>("");

  if (!budget) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Budget</Text>
        <Text>No budget yet. Start from the Onboarding screen.</Text>
      </View>
    );
  }

  const totals = getTotals();

  const incomeCats = useMemo(
    () => budget.categories.filter((c) => c.type === "income"),
    [budget]
  );
  const expenseCats = useMemo(
    () => budget.categories.filter((c) => c.type === "expense"),
    [budget]
  );

  // group expenses by group name
  const groupedExpenses = useMemo(() => {
    const map = new Map<string, Category[]>();
    // ensure default groups appear even if empty:
    DEFAULT_EXPENSE_GROUPS.forEach((g) => map.set(g, []));
    for (const c of expenseCats) {
      const key = c.group || "Miscellaneous";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [expenseCats]);

  // sets for duplicate prevention
  const incomeNameSet = useMemo(() => {
    const s = new Set<string>();
    incomeCats.forEach((c) => s.add(c.name.trim().toLowerCase()));
    return s;
  }, [incomeCats]);

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditingValue(String(c.planned ?? 0));
  };

  const saveEdit = () => {
    if (!editingId) return;
    const num = Number(editingValue);
    setPlanned(editingId, isNaN(num) ? 0 : num);
    setEditingId(null);
    setEditingValue("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const quickAddIncome = (name: string) => {
    const key = name.trim().toLowerCase();
    if (!incomeNameSet.has(key)) addCategory(name.trim(), "income");
  };

  const addExpenseInGroup = (groupName: string) => {
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim(), "expense", groupName);
    setNewCatName("");
    setNewCatGroup("");
  };

  const renderCatRow = (c: Category) => {
    const used = getSpentByCategory(c.id);
    const planned = c.planned || 0;
    const over = used - planned;
    const pct = planned > 0 ? Math.min(1, used / planned) : 0;
    const barBg = "#e5e7eb";
    const barFill = over > 0 ? "#ef4444" : "#60a5fa";

    return (
      <View key={c.id} style={styles.itemRow}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600" }}>{c.name}</Text>
          <View style={[styles.bar, { backgroundColor: barBg }]}>
            <View
              style={{
                width: `${pct * 100}%`,
                backgroundColor: barFill,
                height: 6,
                borderRadius: 999,
              }}
            />
          </View>
          <Text style={{ color: over > 0 ? "#ef4444" : "#64748b", fontSize: 12 }}>
            {fmt(used)} / {fmt(planned)} {over > 0 ? `• Over by ${fmt(over)}` : ""}
          </Text>
        </View>

        {/* Edit planned */}
        {editingId === c.id ? (
          <View style={styles.editInline}>
            <TextInput
              value={editingValue}
              onChangeText={setEditingValue}
              keyboardType="numeric"
              style={[styles.input, { width: 100 }]}
              placeholder="0.00"
            />
            <Pressable style={styles.primaryBtn} onPress={saveEdit}>
              <Text style={styles.primaryBtnText}>Save</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={cancelEdit}>
              <Text>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actionsInline}>
            <Pressable style={styles.linkBtn} onPress={() => startEdit(c)}>
              <Text style={styles.link}>Edit</Text>
            </Pressable>
            {/* One-tap add transaction → opens Transactions with this category */}
            <Pressable
              style={styles.outlineSmall}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/transactions",
                  params: { catId: c.id },
                })
              }
            >
              <Text style={styles.outlineSmallText}>Add Txn</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Budget — {budget.month}</Text>

      {/* header stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Income (Planned / Received)</Text>
          <Text style={styles.statValue}>
            {fmt(totals.incomePlanned)} / {fmt(totals.incomeReceived)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Expenses (Planned / Spent)</Text>
          <Text style={styles.statValue}>
            {fmt(totals.expensePlanned)} / {fmt(totals.expenseSpent)}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Leftover (Planned / Actual)</Text>
          <Text
            style={[
              styles.statValue,
              { color: totals.leftoverActual < 0 ? "#ef4444" : "#111827" },
            ]}
          >
            {fmt(totals.leftoverPlanned)} / {fmt(totals.leftoverActual)}
          </Text>
        </View>
      </View>

      {/* Quick add income */}
      <View style={[styles.card, { marginBottom: 12 }]}>
        <Text style={{ fontWeight: "700", marginBottom: 8 }}>
          Quick add common income
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {COMMON_INCOME.map((name) => {
              const exists = incomeNameSet.has(name.trim().toLowerCase());
              return (
                <Pressable
                  key={name}
                  onPress={() => quickAddIncome(name)}
                  disabled={exists}
                  style={[
                    styles.chip,
                    exists && { opacity: 0.5, borderStyle: "dashed" as const },
                  ]}
                >
                  <Text>{name}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
        <Text style={styles.helperNote}>
          Greyed items already exist in your income list.
        </Text>
      </View>

      {/* Add category buttons */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => {
            setAddingType("income");
            setNewCatName("");
            setNewCatGroup("");
          }}
        >
          <Text style={styles.secondaryBtnText}>Add Income Category</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => {
            setAddingType("expense");
            setNewCatName("");
            setNewCatGroup("");
          }}
        >
          <Text style={styles.secondaryBtnText}>Add Expense Item</Text>
        </Pressable>
        <Pressable style={styles.outlineBtn} onPress={resetMonth}>
          <Text style={styles.outlineBtnText}>Reset Month</Text>
        </Pressable>
      </View>

      {/* Inline add form */}
      {addingType && (
        <View style={[styles.card, { marginBottom: 12 }]}>
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>
            New {addingType === "income" ? "Income" : "Expense"} {addingType === "expense" ? "Item" : "Category"}
          </Text>
          <View style={{ gap: 8 }}>
            <TextInput
              placeholder="Name"
              value={newCatName}
              onChangeText={setNewCatName}
              style={styles.input}
            />
            {addingType === "expense" && (
              <TextInput
                placeholder="Group (e.g., Housing, Utilities)"
                value={newCatGroup}
                onChangeText={setNewCatGroup}
                style={styles.input}
              />
            )}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                style={styles.primaryBtn}
                onPress={() => {
                  if (!newCatName.trim()) return;
                  if (addingType === "income") {
                    addCategory(newCatName.trim(), "income");
                  } else {
                    addCategory(
                      newCatName.trim(),
                      "expense",
                      newCatGroup.trim() || "Miscellaneous"
                    );
                  }
                  setAddingType(null);
                  setNewCatName("");
                  setNewCatGroup("");
                }}
              >
                <Text style={styles.primaryBtnText}>Add</Text>
              </Pressable>
              <Pressable style={styles.chip} onPress={() => setAddingType(null)}>
                <Text>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* INCOME */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Income</Text>
        {incomeCats.length === 0 ? (
          <Text style={styles.subtitle}>No income yet.</Text>
        ) : (
          incomeCats.map((c) => (
            <View key={c.id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600" }}>{c.name}</Text>
                <Text style={{ color: "#64748b", fontSize: 12 }}>
                  Planned: {fmt(c.planned || 0)}
                </Text>
              </View>
              {editingId === c.id ? (
                <View style={styles.editInline}>
                  <TextInput
                    value={editingValue}
                    onChangeText={setEditingValue}
                    keyboardType="numeric"
                    style={[styles.input, { width: 100 }]}
                    placeholder="0.00"
                  />
                  <Pressable style={styles.primaryBtn} onPress={saveEdit}>
                    <Text style={styles.primaryBtnText}>Save</Text>
                  </Pressable>
                  <Pressable style={styles.chip} onPress={cancelEdit}>
                    <Text>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.linkBtn} onPress={() => startEdit(c)}>
                  <Text style={styles.link}>Edit</Text>
                </Pressable>
              )}
            </View>
          ))
        )}
      </View>

      {/* EXPENSES by group */}
      {[...groupedExpenses.entries()].map(([groupName, items]) => (
        <View key={groupName} style={[styles.card, { marginTop: 12 }]}>
          <Text style={styles.sectionTitle}>{groupName}</Text>

          {items.length === 0 ? (
            <Text style={styles.subtitle}>No items yet.</Text>
          ) : (
            items.map(renderCatRow)
          )}

          {/* Add item to this group inline */}
          <View style={{ marginTop: 6, flexDirection: "row", gap: 8 }}>
            {newCatGroup === groupName ? (
              <>
                <TextInput
                  placeholder="New item name"
                  value={newCatName}
                  onChangeText={setNewCatName}
                  style={[styles.input, { flex: 1 }]}
                />
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => addExpenseInGroup(groupName)}
                >
                  <Text style={styles.primaryBtnText}>Add</Text>
                </Pressable>
                <Pressable style={styles.chip} onPress={() => { setNewCatGroup(""); setNewCatName(""); }}>
                  <Text>Cancel</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.linkBtn} onPress={() => setNewCatGroup(groupName)}>
                <Text style={styles.link}>Add Item</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },

  stats: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  statLabel: { color: "#64748b", fontSize: 12 },
  statValue: { fontWeight: "700" },

  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
  },
  sectionTitle: { fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#334155" },

  itemRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
    paddingVertical: 10,
    gap: 6,
  },

  bar: { height: 6, borderRadius: 999, overflow: "hidden", marginVertical: 4 },

  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },

  link: { color: "#2563eb", fontWeight: "600" },
  linkBtn: { paddingHorizontal: 8, paddingVertical: 6, alignSelf: "flex-start" },

  primaryBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700" },

  secondaryBtn: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryBtnText: { color: "#1e3a8a", fontWeight: "600" },

  outlineBtn: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  outlineBtnText: { color: "#0f172a", fontWeight: "600" },

  chip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },

  helperNote: { marginTop: 6, color: "#64748b", fontSize: 12 },

  editInline: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 4,
  },
  actionsInline: { flexDirection: "row", gap: 8, alignItems: "center" },

  outlineSmall: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  outlineSmallText: { color: "#0f172a", fontWeight: "600", fontSize: 12 },
});
