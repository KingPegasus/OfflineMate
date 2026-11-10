import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export const unstable_settings = {
  initialRouteName: "chat",
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Tablets and wide windows get a navigation rail on the left; phones keep the bottom bar.
  const { isWide } = useBreakpoint();
  const tabIcon = (name: React.ComponentProps<typeof Ionicons>["name"], focused: boolean) =>
    <Ionicons name={name} size={20} color={focused ? "#60a5fa" : "#9ca3af"} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarHideOnKeyboard: !isWide,
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#111827",
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: "#60a5fa",
        tabBarInactiveTintColor: "#9ca3af",
        ...(isWide
          ? {
              tabBarPosition: "left" as const,
              tabBarVariant: "material" as const,
              tabBarLabelPosition: "below-icon" as const,
              tabBarStyle: { borderRightColor: "#1f2937", width: 96 },
              // The status bar uses dark icons (white headers), so keep the rail's top inset white too.
              tabBarBackground: () => (
                <View style={StyleSheet.absoluteFill}>
                  <View style={{ height: insets.top, backgroundColor: "#ffffff" }} />
                  <View style={{ flex: 1, backgroundColor: "#0b1020" }} />
                </View>
              ),
            }
          : {
              tabBarStyle: {
                backgroundColor: "#0b1020",
                borderTopColor: "#1f2937",
                height: 62 + insets.bottom,
                paddingTop: 6,
                paddingBottom: insets.bottom,
              },
            }),
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
        name="chats"
        options={{
          // Hide only the tab button: since SDK 58, `href: null` marks the route hidden and
          // redirects away from it, which breaks `router.push("/chats")`.
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
          title: "Chats",
          tabBarIcon: ({ focused }) => tabIcon("chatbubbles-outline", focused),
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

