import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createNote, deleteNote, listNotes, type NoteRow } from "@/db/notes-repository";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { LIST_PANE_WIDTH, READABLE_MAX_WIDTH } from "@/utils/layout";

export default function NotesScreen() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { isWide, isTwoPane } = useBreakpoint();
  const notes = listNotes(20);
  // Two-pane: show the tapped note, or the newest one until the user picks another.
  const selectedNote = notes.find((n) => n.id === selectedId) ?? notes[0] ?? null;

  const confirmDelete = (note: NoteRow) => {
    Alert.alert(
      "Delete note",
      "Remove this note from your device? It will also be removed from semantic search.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteNote(note.id);
            if (note.id === selectedId) setSelectedId(null);
            setRefreshKey((k) => k + 1);
          },
        },
      ],
    );
  };

  const deleteButton = (note: NoteRow) => (
    <TouchableOpacity
      accessibilityLabel={`Delete note ${note.title}`}
      onPress={() => confirmDelete(note)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.deleteLabel}>Delete</Text>
    </TouchableOpacity>
  );

  const composer = (
    <View style={styles.card}>
      <Text style={styles.title}>Notes</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor="#6b7280"
        style={styles.input}
      />
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Write note..."
        placeholderTextColor="#6b7280"
        style={[styles.input, styles.multiline]}
        multiline
      />
      <Text
        style={styles.save}
        onPress={() => {
          if (!title.trim() || !content.trim()) return;
          const id = createNote(title.trim(), content.trim());
          setTitle("");
          setContent("");
          setSelectedId(id);
          setRefreshKey((k) => k + 1);
        }}
      >
        Save Note
      </Text>
    </View>
  );

  if (isTwoPane) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.panes}>
          <View style={styles.listPane}>
            {composer}
            <ScrollView style={styles.list}>
              {notes.map((note) => {
                const active = note.id === selectedNote?.id;
                return (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.note, active && styles.noteActive]}
                    onPress={() => setSelectedId(note.id)}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={styles.noteTitle} numberOfLines={1}>
                      {note.title}
                    </Text>
                    <Text style={styles.body} numberOfLines={2}>
                      {note.content}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          <View style={styles.detailPane}>
            {selectedNote ? (
              <ScrollView contentContainerStyle={styles.detailContent}>
                <View style={styles.noteHeader}>
                  <Text style={styles.detailTitle}>{selectedNote.title}</Text>
                  {deleteButton(selectedNote)}
                </View>
                <Text style={styles.detailMeta}>{new Date(selectedNote.created_at).toLocaleString()}</Text>
                <Text style={styles.detailBody}>{selectedNote.content}</Text>
              </ScrollView>
            ) : (
              <View style={styles.detailEmpty}>
                <Text style={styles.detailEmptyTitle}>No notes yet</Text>
                <Text style={styles.body}>Write one on the left. Notes stay on this device.</Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={[styles.column, isWide && styles.columnWide]}>
        {composer}
        <ScrollView style={styles.list}>
          {notes.map((note) => (
            <View key={note.id} style={styles.note}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteTitle} numberOfLines={2}>
                  {note.title}
                </Text>
                {deleteButton(note)}
              </View>
              <Text style={styles.body}>{note.content}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020", padding: 16 },
  column: { flex: 1 },
  columnWide: { width: "100%", maxWidth: READABLE_MAX_WIDTH, alignSelf: "center" },
  card: { backgroundColor: "#111827", borderRadius: 14, padding: 16, marginBottom: 12 },
  title: { color: "#e5e7eb", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  input: {
    backgroundColor: "#0b1020",
    color: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  save: { color: "#60a5fa", fontWeight: "700" },
  list: { flex: 1 },
  note: { backgroundColor: "#111827", borderRadius: 10, padding: 12, marginBottom: 8 },
  noteActive: { borderWidth: 1, borderColor: "#60a5fa", backgroundColor: "#0f1b33" },
  noteHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  noteTitle: { color: "#e5e7eb", fontWeight: "700", flex: 1 },
  deleteLabel: { color: "#f87171", fontWeight: "600", fontSize: 15 },
  body: { color: "#9ca3af" },
  panes: { flex: 1, flexDirection: "row", gap: 16 },
  listPane: { width: LIST_PANE_WIDTH + 40 },
  detailPane: { flex: 1, minWidth: 0, backgroundColor: "#111827", borderRadius: 14 },
  detailContent: { padding: 24, maxWidth: READABLE_MAX_WIDTH },
  detailTitle: { color: "#e5e7eb", fontSize: 22, fontWeight: "800", flex: 1 },
  detailMeta: { color: "#6b7280", fontSize: 12, marginBottom: 16 },
  detailBody: { color: "#d1d5db", fontSize: 16, lineHeight: 24 },
  detailEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, padding: 24 },
  detailEmptyTitle: { color: "#e5e7eb", fontWeight: "700", fontSize: 16 },
});
