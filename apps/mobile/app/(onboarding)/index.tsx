import { useRouter } from "expo-router";
import React, { useState, useContext } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
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
    ].map(([name, planned], i) => ({
      id: `c${i}`, name: String(name), planned: Number(planned), spent: 0
    }));

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
    <View style={styles.container}>
      <Text style={styles.title}>Quick Start</Text>
      <Text style={styles.subtitle}>Enter your income & fixed costs. Choose Sample or DIY.</Text>

      <Text style={styles.label}>Primary income</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={incomePrimary} onChangeText={setIncomePrimary} />

      <Text style={styles.label}>Other income</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={incomeOther} onChangeText={setIncomeOther} />

      <Text style={[styles.label, styles.sectionHeading]}>Fixed costs</Text>

      <Text style={styles.label}>Rent</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={rent} onChangeText={setRent} />

      <Text style={styles.label}>Mortgage</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={mortgage} onChangeText={setMortgage} />

      <Text style={styles.label}>Utilities</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={utilities} onChangeText={setUtilities} />

      <View style={styles.actions}>
        <Pressable onPress={sampleBudget} style={[styles.btn, styles.btnPrimary]}>
          <Text style={styles.btnPrimaryText}>Use Suggested Sample</Text>
        </Pressable>
        <Pressable onPress={diyBudget} style={[styles.btn, styles.btnOutline]}>
          <Text style={styles.btnOutlineText}>Start DIY</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#475569", marginBottom: 12 },
  sectionHeading: { marginTop: 12, fontWeight: "700" },
  label: { marginTop: 8 },
  input: {
    borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff"
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 16, flexWrap: "wrap" },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  btnPrimary: { backgroundColor: "#2563eb" },
  btnPrimaryText: { color: "#fff", fontWeight: "600" },
  btnOutline: { borderWidth: 1, borderColor: "#cbd5e1" },
  btnOutlineText: { color: "#0f172a", fontWeight: "600" }
});
