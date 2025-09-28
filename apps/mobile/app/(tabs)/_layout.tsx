import { Tabs } from "expo-router";
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="budget" options={{ title: "Budget" }} />
      <Tabs.Screen name="transactions" options={{ title: "Transactions" }} />
    </Tabs>
  );
}

