import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBreakpoint } from "@/hooks/useBreakpoint";

/**
 * Header bar height below the status bar, on phones and tablets. The default (64 dp on Android, 44 pt
 * on iPhone, 50 pt on iPad) left an empty white strip between the status bar and the title.
 */
const HEADER_BAR = 40;

export const unstable_settings = {
  initialRouteName: "chat",
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // The header's full height (status bar + bar). The rail's white top uses it too, so the two line up
  // as one band instead of the rail turning dark right below the status bar.
  const headerHeight = insets.top + HEADER_BAR;
  // Tablets and wide windows get a navigation rail on the left; phones keep the bottom bar.
  const { isWide } = useBreakpoint();
  const tabIcon = (name: React.ComponentProps<typeof Ionicons>["name"], focused: boolean) =>
    <Ionicons name={name} size={20} color={focused ? "#60a5fa" : "#9ca3af"} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarHideOnKeyboard: !isWide,
        headerStyle: { backgroundColor: "#ffffff", height: headerHeight },
        headerTintColor: "#111827",
        headerTitleStyle: { fontWeight: "700" },
        // iOS centres titles by default, which pushed "Chat" against the New and Chats buttons on iPhone.
        // Left-aligned on both platforms, as Android already showed it.
        headerTitleAlign: "left",
        tabBarActiveTintColor: "#60a5fa",
        tabBarInactiveTintColor: "#9ca3af",
        ...(isWide
          ? {
              tabBarPosition: "left" as const,
              tabBarVariant: "material" as const,
              tabBarLabelPosition: "below-icon" as const,
              // Items start below the white band so none sits half on white, half on the dark rail.
              // The right border is drawn by the dark part below, so it doesn't cut through the white band.
              tabBarStyle: { borderRightWidth: 0, width: 96, paddingTop: headerHeight + 8 },
              // The status bar uses dark icons over the white header, so the rail's top is white for the
              // header's full height: one even band across the top.
              tabBarBackground: () => (
                <View style={StyleSheet.absoluteFill}>
                  <View style={{ height: headerHeight, backgroundColor: "#ffffff" }} />
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#0b1020",
                      borderRightWidth: StyleSheet.hairlineWidth,
                      borderRightColor: "#1f2937",
                    }}
                  />
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
          // The route stays "tools" so existing links keep working; it's the Help tab now.
          title: "Help",
          tabBarIcon: ({ focused }) => tabIcon("help-circle-outline", focused),
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

