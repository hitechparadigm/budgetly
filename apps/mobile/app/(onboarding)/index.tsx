import { useRouter } from "expo-router";
import React, { useState, useContext } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { BudgetCtx } from "../_layout";

export default function Onboarding() {
  const router = useRouter();
  const { setBudget } = useContext(BudgetCtx);

  const [incomePrimary, setIncomePrimary] = useState("");
  const [incomeOther, setIncomeOther] = useState("");
  const [rent, setRent] = useState("");
  const [mortgage, setMortgage] = useState("");
  const [utilities, setUtilities] = useState("");

  function sampleBudget() {
    const ip = Number(incomePrimary || 0);
    const io = Number(incomeOther || 0);
    const r  = Number(rent || 0);
    const m  = Number(mortgage || 0);
    const u  = Number(utilities || 0);
    const income = ip + io;
    const fixed = r + m + u;
    const remainder = Math.max(income - fixed, 0);
    const needs = remainder * 0.5;
    const wants = remainder * 0.3;
    const savings = remainder * 0.2;

    const cats = [
      ["Housing", r + m],
      ["Utilities", u],
      ["Groceries", Math.round(needs * 0.55)],
      ["Transport", Math.round(needs * 0.25)],
      ["Health", Math.round(needs * 0.12)],
      ["Insurance", Math.round(needs * 0.08)],
      ["Lifestyle", Math.round(wants * 0.7)],
      ["Personal", Math.round(wants * 0.3)],
      ["Savings/Goals", Math.round(savings)],
    ].map(([name, planned], i) => ({ id: `c${i}`, name: String(name), planned: Number(planned), spent: 0 }));

    setBudget({ month: "2025-09", categories: cats });
    router.replace("/(tabs)/budget");
  }

  function diyBudget() {
    const cats = ["Housing","Utilities","Groceries","Transport","Health","Insurance","Lifestyle","Personal","Savings/Goals"]
      .map((name, i) => ({ id:`c${i}`, name, planned: 0, spent: 0 }));
    setBudget({ month: "2025-09", categories: cats });
    router.replace("/(tabs)/budget");
  }

  return (
    <View className="flex-1 bg-white p-6">
      <Text className="text-2xl font-bold mb-2">Quick Start</Text>
      <Text className="text-slate-600 mb-4">Enter income & fixed costs. Choose Sample or DIY.</Text>

      <Text className="mt-2">Primary income</Text>
      <TextInput className="border rounded p-2" keyboardType="numeric" value={incomePrimary} onChangeText={setIncomePrimary} />
      <Text className="mt-2">Other income</Text>
      <TextInput className="border rounded p-2" keyboardType="numeric" value={incomeOther} onChangeText={setIncomeOther} />

      <Text className="mt-4 font-semibold">Fixed costs</Text>
      <Text className="mt-2">Rent</Text>
      <TextInput className="border rounded p-2" keyboardType="numeric" value={rent} onChangeText={setRent} />
      <Text className="mt-2">Mortgage</Text>
      <TextInput className="border rounded p-2" keyboardType="numeric" value={mortgage} onChangeText={setMortgage} />
      <Text className="mt-2">Utilities</Text>
      <TextInput className="border rounded p-2" keyboardType="numeric" value={utilities} onChangeText={setUtilities} />

      <View className="flex-row gap-3 mt-6">
        <Pressable onPress={sampleBudget} className="bg-blue-600 px-4 py-2 rounded"><Text className="text-white">Use Suggested Sample</Text></Pressable>
        <Pressable onPress={diyBudget} className="border px-4 py-2 rounded"><Text>Start DIY</Text></Pressable>
      </View>
    </View>
  );
}
