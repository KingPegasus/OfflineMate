import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActivityIndicator, StyleSheet } from "react-native";
import { useSettingsStore } from "@/stores/settings-store";
import { getInitialRoute } from "@/navigation/initial-route";

export default function Index() {
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);
  const [hasHydrated, setHasHydrated] = useState(() => useSettingsStore.persist.hasHydrated());

  useEffect(() => {
    const unsubscribeHydrate = useSettingsStore.persist.onHydrate(() => {
      setHasHydrated(false);
    });
    const unsubscribeFinishHydration = useSettingsStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });

    setHasHydrated(useSettingsStore.persist.hasHydrated());

    return () => {
      unsubscribeHydrate();
      unsubscribeFinishHydration();
    };
  }, []);

  const route = getInitialRoute(hasHydrated, hasCompletedOnboarding);

  if (!route) {
    return (
      <SafeAreaView style={styles.root}>
        <ActivityIndicator color="#60a5fa" />
      </SafeAreaView>
    );
  }

  return <Redirect href={route} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020", alignItems: "center", justifyContent: "center" },
});
