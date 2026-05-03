import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: Section[];
}

interface Section {
  heading?: string;
  body: string;
}

export default function LegalScreen({ visible, onClose, title, content }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {content.map((section, i) => (
            <View key={i} style={styles.section}>
              {section.heading && (
                <Text style={styles.heading}>{section.heading}</Text>
              )}
              <Text style={styles.body}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  content: { padding: 24, gap: 20, paddingBottom: 48 },
  section: { gap: 6 },
  heading: { fontSize: 14, fontWeight: '700', color: '#111827' },
  body: { fontSize: 14, color: '#374151', lineHeight: 22 },
});
