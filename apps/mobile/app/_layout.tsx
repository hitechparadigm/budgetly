import { Stack } from "expo-router";
import React, { createContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

export type Category = { id: string; name: string; planned: number; spent: number };
type Budget = { month: string; categories: Category[] };

type Ctx = { budget: Budget | null; setBudget: (b: Budget) => void; addTxn: (catId: string, amount: number) => void };
export const BudgetCtx = createContext<Ctx>({ budget: null, setBudget: () => {}, addTxn: () => {} });

export default function RootLayout() {
  const [budget, setBudgetState] = useState<Budget | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      const raw = localStorage.getItem("budget");
      if (raw) setBudgetState(JSON.parse(raw));
    }
  }, []);

  const setBudget = (b: Budget) => {
    setBudgetState(b);
    if (Platform.OS === "web") localStorage.setItem("budget", JSON.stringify(b));
  };

  const addTxn = (catId: string, amount: number) => {
  setBudgetState(prev => {
    if (!prev) return prev;
    const categories = prev.categories.map(c =>
      c.id === catId ? { ...c, spent: (c.spent || 0) + amount } : c
    );
    const next = { ...prev, categories };
    if (Platform.OS === "web") localStorage.setItem("budget", JSON.stringify(next));
    return next;
  });
};


  const value = useMemo(() => ({ budget, setBudget, addTxn }), [budget]);

  return (
    <BudgetCtx.Provider value={value}>
      <Stack screenOptions={{ headerShown: false }} />
    </BudgetCtx.Provider>
  );
}
