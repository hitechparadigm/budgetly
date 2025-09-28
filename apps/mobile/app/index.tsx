// app/index.tsx
import { Redirect } from "expo-router";
import { useContext } from "react";
import { BudgetCtx } from "./_layout";

export default function Index() {
  const { budget } = useContext(BudgetCtx);
  return budget
    ? <Redirect href="/(tabs)/budget" />
    : <Redirect href="/(onboarding)" />;
}
