import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabIcon = (name: React.ComponentProps<typeof Ionicons>["name"], focused: boolean) =>
    <Ionicons name={name} size={20} color={focused ? "#60a5fa" : "#9ca3af"} />;

  return (
    <Tabs
      initialRouteName="chat"
      screenOptions={{
        headerShown: true,
        tabBarHideOnKeyboard: true,
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#111827",
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: "#60a5fa",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#0b1020",
          borderTopColor: "#1f2937",
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ focused }) => tabIcon("chatbubble-ellipses-outline", focused),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarIcon: ({ focused }) => tabIcon("document-text-outline", focused),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: "Tools",
          tabBarIcon: ({ focused }) => tabIcon("construct-outline", focused),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => tabIcon("settings-outline", focused),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

