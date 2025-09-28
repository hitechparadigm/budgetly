import { Stack } from "expo-router";
import React, { createContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

/** ─────────────────────────────────────────────────────────────
 *  Domain types
 *  ────────────────────────────────────────────────────────────*/
export type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  planned: number;
  group?: string; // <-- used to group expense items (e.g., "Housing")
};

export type Budget = {
  month: string; // YYYY-MM
  categories: Category[];
};

type Totals = {
  incomePlanned: number;
  incomeReceived: number; // from transactions
  expensePlanned: number;
  expenseSpent: number; // from transactions
  leftoverPlanned: number; // incomePlanned - expensePlanned
  leftoverActual: number; // incomeReceived - expenseSpent
};

type Ctx = {
  budget: Budget | null;
  setBudget: (b: Budget) => void;

  /** Category helpers */
  addCategory: (name: string, type: "income" | "expense", group?: string) => void;
  setPlanned: (categoryId: string, planned: number) => void;

  /** Month ops */
  resetMonth: () => void;

  /** Read-only computed helpers used by UI */
  getSpentByCategory: (categoryId: string) => number;
  getTotals: () => Totals;

  /** Legacy no-op kept for compatibility */
  addTxn: (catId: string, amount: number) => void;
};

export const BudgetCtx = createContext<Ctx>({
  budget: null,
  setBudget: () => {},
  addCategory: () => {},
  setPlanned: () => {},
  resetMonth: () => {},
  getSpentByCategory: () => 0,
  getTotals: () => ({
    incomePlanned: 0,
    incomeReceived: 0,
    expensePlanned: 0,
    expenseSpent: 0,
    leftoverPlanned: 0,
    leftoverActual: 0,
  }),
  addTxn: () => {},
});

/** LocalStorage helpers (web only) */
const loadJSON = <T,>(key: string): T | null => {
  if (Platform.OS !== "web") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const saveJSON = (key: string, value: unknown) => {
  if (Platform.OS !== "web") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const monthKey = (month: string) => `txns-${month}`;

/** ─────────────────────────────────────────────────────────────
 *  Root Layout + Provider
 *  ────────────────────────────────────────────────────────────*/
export default function RootLayout() {
  const [budget, setBudgetState] = useState<Budget | null>(null);

  /** Load budget (web) */
  useEffect(() => {
    if (Platform.OS === "web") {
      const saved = loadJSON<Budget>("budget");
      if (saved) setBudgetState(saved);
    }
  }, []);

  const setBudget = (b: Budget) => {
    setBudgetState(b);
    saveJSON("budget", b);
  };

  /** Category/Planned mutators */
  const addCategory: Ctx["addCategory"] = (name, type, group) => {
    setBudgetState(prev => {
      if (!prev) return prev;
      const next: Budget = {
        ...prev,
        categories: [
          ...prev.categories,
          {
            id: String(Date.now()),
            name: name.trim(),
            type,
            planned: 0,
            ...(group ? { group } : {}),
          },
        ],
      };
      saveJSON("budget", next);
      return next;
    });
  };

  const setPlanned: Ctx["setPlanned"] = (categoryId, planned) => {
    setBudgetState(prev => {
      if (!prev) return prev;
      const next: Budget = {
        ...prev,
        categories: prev.categories.map(c =>
          c.id === categoryId ? { ...c, planned } : c
        ),
      };
      saveJSON("budget", next);
      return next;
    });
  };

  /** Reset month: clears transactions for this month and zeroes planned */
  const resetMonth: Ctx["resetMonth"] = () => {
    setBudgetState(prev => {
      if (!prev) return prev;
      // Clear transactions for the current month
      if (Platform.OS === "web") {
        try {
          localStorage.removeItem(monthKey(prev.month));
        } catch {}
      }
      // Optionally set planned to 0; keep categories
      const next: Budget = {
        ...prev,
        categories: prev.categories.map(c => ({ ...c, planned: 0 })),
      };
      saveJSON("budget", next);
      return next;
    });
  };

  /** Read-only: sum transactions for a category from localStorage */
  const getSpentByCategory: Ctx["getSpentByCategory"] = (categoryId) => {
    if (!budget) return 0;
    if (Platform.OS !== "web") return 0;
    const txns = loadJSON<Array<{ amount: number; categoryId: string }>>(
      monthKey(budget.month)
    );
    if (!txns) return 0;
    return txns
      .filter(t => t.categoryId === categoryId)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  };

  /** Read-only: totals for header */
  const getTotals: Ctx["getTotals"] = () => {
    if (!budget)
      return {
        incomePlanned: 0,
        incomeReceived: 0,
        expensePlanned: 0,
        expenseSpent: 0,
        leftoverPlanned: 0,
        leftoverActual: 0,
      };

    const incomePlanned = budget.categories
      .filter(c => c.type === "income")
      .reduce((s, c) => s + (c.planned || 0), 0);

    const expensePlanned = budget.categories
      .filter(c => c.type === "expense")
      .reduce((s, c) => s + (c.planned || 0), 0);

    // Transactions (web)
    let incomeReceived = 0;
    let expenseSpent = 0;
    if (Platform.OS === "web") {
      const txns = loadJSON<Array<{ amount: number; categoryId: string }>>(
        monthKey(budget.month)
      ) || [];
      const incomeIds = new Set(
        budget.categories.filter(c => c.type === "income").map(c => c.id)
      );
      for (const t of txns) {
        const amt = Number(t.amount) || 0;
        if (incomeIds.has(t.categoryId)) incomeReceived += amt;
        else expenseSpent += amt;
      }
    }

    return {
      incomePlanned,
      incomeReceived,
      expensePlanned,
      expenseSpent,
      leftoverPlanned: incomePlanned - expensePlanned,
      leftoverActual: incomeReceived - expenseSpent,
    };
  };

  /** Legacy compatibility: transactions are owned by Transactions screen */
  const addTxn: Ctx["addTxn"] = () => {
    // no-op on purpose; Transactions screen persists to localStorage.
  };

  const value = useMemo(
    () => ({
      budget,
      setBudget,
      addCategory,
      setPlanned,
      resetMonth,
      getSpentByCategory,
      getTotals,
      addTxn,
    }),
    [budget]
  );

  return (
    <BudgetCtx.Provider value={value}>
      <Stack screenOptions={{ headerShown: false }} />
    </BudgetCtx.Provider>
  );
}
