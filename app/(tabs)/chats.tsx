import { useRouter } from "expo-router";
import { useMemo } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useChatStore } from "@/stores/chat-store";

export default function ChatsScreen() {
  const router = useRouter();
  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const renameConversation = useChatStore((s) => s.renameConversation);
  const createConversation = useChatStore((s) => s.createConversation);

  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );
  const confirmDeleteConversation = (conversationId: string) => {
    Alert.alert("Delete conversation", "Delete this chat permanently?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteConversation(conversationId) },
    ]);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <Pressable
          style={styles.newBtn}
          onPress={() => {
            createConversation("New chat");
            router.push("/chat");
          }}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
      </View>

      <Text style={styles.helper}>Use Delete on each row to remove a chat.</Text>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {sortedConversations.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptyBody}>Start a new chat to create your first conversation.</Text>
          </View>
        ) : (
          sortedConversations.map((conversation) => (
            <Swipeable
              key={conversation.id}
              overshootRight={false}
              renderRightActions={() => (
                <View style={styles.swipeActionWrap}>
                  <Pressable
                    style={styles.swipeDeleteBtn}
                    onPress={() => confirmDeleteConversation(conversation.id)}
                  >
                    <Text style={styles.swipeDeleteText}>Delete</Text>
                  </Pressable>
                </View>
              )}
            >
              <Pressable
                style={[styles.row, conversation.id === activeConversationId && styles.rowActive]}
                onPress={() => {
                  selectConversation(conversation.id);
                  router.push("/chat");
                }}
              >
                <View style={styles.rowMain}>
                  <Text
                    style={[styles.rowTitle, conversation.id === activeConversationId && styles.rowTitleActive]}
                    numberOfLines={1}
                  >
                    {conversation.title || "Untitled chat"}
                  </Text>
                  <Text style={styles.rowTime}>{new Date(conversation.updatedAt).toLocaleString()}</Text>
                </View>
                <TextInput
                  style={styles.renameInput}
                  defaultValue={conversation.title}
                  placeholder="Chat title"
                  placeholderTextColor="#6b7280"
                  onSubmitEditing={(event) => renameConversation(conversation.id, event.nativeEvent.text)}
                />
                <View style={styles.rowActions}>
                  <Text style={styles.swipeHint}>Swipe left or tap Delete.</Text>
                  <Pressable
                    style={styles.inlineDeleteBtn}
                    onPress={() => confirmDeleteConversation(conversation.id)}
                  >
                    <Text style={styles.inlineDeleteText}>Delete</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Swipeable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020", paddingHorizontal: 16, paddingTop: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#e5e7eb", fontSize: 24, fontWeight: "800" },
  newBtn: {
    backgroundColor: "#1d4ed8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: { color: "#e5e7eb", fontWeight: "700" },
  helper: { color: "#9ca3af", fontSize: 12, marginTop: 10, marginBottom: 12 },
  list: { gap: 10, paddingBottom: 24 },
  swipeActionWrap: {
    justifyContent: "center",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  swipeDeleteBtn: {
    height: "100%",
    minWidth: 94,
    borderRadius: 10,
    backgroundColor: "#7f1d1d",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  swipeDeleteText: { color: "#fecaca", fontWeight: "700", fontSize: 12 },
  row: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  rowActive: { borderColor: "#60a5fa" },
  rowMain: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  rowTitle: { color: "#e5e7eb", fontSize: 14, fontWeight: "700", flex: 1 },
  rowTitleActive: { color: "#bfdbfe" },
  rowTime: { color: "#9ca3af", fontSize: 11 },
  renameInput: {
    color: "#e5e7eb",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  rowActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  swipeHint: { color: "#6b7280", fontSize: 11 },
  inlineDeleteBtn: {
    backgroundColor: "#7f1d1d",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineDeleteText: { color: "#fecaca", fontWeight: "700", fontSize: 12 },
  empty: {
    marginTop: 28,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  emptyTitle: { color: "#e5e7eb", fontWeight: "700" },
  emptyBody: { color: "#9ca3af" },
});
