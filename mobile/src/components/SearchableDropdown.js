import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal,
  StyleSheet, SafeAreaView,
} from 'react-native';

// Fuzzy scoring: ranks matches by quality (exact > words > prefix > char sequence)
const fuzzyScore = (text, query) => {
  if (!query.trim()) return { match: true, score: 1000 };
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();

  // 1. Exact substring match (best)
  if (t.includes(q)) return { match: true, score: 300 };

  // 2. All words present (good)
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every(w => t.includes(w))) return { match: true, score: 200 };

  // 3. Each query word starts-with any word in text (medium)
  const textWords = t.split(/\s+/);
  if (words.every(qw => textWords.some(tw => tw.startsWith(qw)))) return { match: true, score: 150 };

  // 4. Char sequence match (fuzzy - all chars appear in order)
  let ti = 0;
  let score = 0;
  let lastPos = -1;
  for (let qi = 0; qi < q.length; qi++) {
    const pos = t.indexOf(q[qi], ti);
    if (pos === -1) return { match: false, score: 0 };
    score += (pos === lastPos + 1) ? 3 : 1; // consecutive bonus
    lastPos = pos;
    ti = pos + 1;
  }
  return { match: true, score };
};

// Highlights the first exact substring match in yellow
const HighlightedText = ({ text, query, style }) => {
  if (!query || !text) return <Text style={style}>{text}</Text>;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  const idx = t.indexOf(q);
  if (idx === -1) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {text.slice(0, idx)}
      <Text style={{ backgroundColor: '#fff176', color: '#000', fontWeight: '700' }}>
        {text.slice(idx, idx + q.length)}
      </Text>
      {text.slice(idx + q.length)}
    </Text>
  );
};

const SearchableDropdown = ({
  label,
  items = [],
  selectedValue,
  onSelect,
  labelKey = 'name',
  valueKey = 'id',
  subLabelKey = null,
  placeholder = 'Select...',
  renderItem: customRenderItem,
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const selectedLabel = useMemo(() => {
    if (!selectedValue) return '';
    const found = items.find((it) => String(it[valueKey]) === String(selectedValue));
    return found ? found[labelKey] : '';
  }, [selectedValue, items, labelKey, valueKey]);

  // Score, filter, and sort items by fuzzy match quality
  const filtered = useMemo(() => {
    const scored = items.map((item) => {
      const result = fuzzyScore(item[labelKey] || '', search);
      return { item, ...result };
    });
    return scored
      .filter((s) => s.match)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.item);
  }, [items, search, labelKey]);

  const handleSelect = (item) => {
    onSelect(item);
    setVisible(false);
    setSearch('');
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => { if (!disabled) setVisible(true); }}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text
          style={[styles.triggerText, !selectedLabel && { color: '#999' }, disabled && { color: '#aaa' }]}
          numberOfLines={1}
        >
          {selectedLabel || placeholder}
        </Text>
        <Text style={styles.arrow}>{'\u25BC'}</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label || 'Select'}</Text>
            <TouchableOpacity onPress={() => { setVisible(false); setSearch(''); }}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />

          <Text style={styles.resultCount}>{filtered.length} results</Text>

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item[valueKey])}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.option,
                  String(item[valueKey]) === String(selectedValue) && styles.optionSelected,
                ]}
                onPress={() => handleSelect(item)}
              >
                {customRenderItem ? (
                  customRenderItem(item)
                ) : (
                  <View>
                    <HighlightedText
                      text={item[labelKey]}
                      query={search}
                      style={styles.optionText}
                    />
                    {subLabelKey && item[subLabelKey] ? (
                      <Text style={styles.subLabelText}>
                        {String(item[subLabelKey])}
                      </Text>
                    ) : null}
                  </View>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>No results found</Text>
            }
            keyboardShouldPersistTaps="handled"
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  triggerDisabled: { backgroundColor: '#f5f5f5', borderColor: '#e0e0e0' },
  triggerText: { flex: 1, fontSize: 14, color: '#333' },
  arrow: { fontSize: 10, color: '#999', marginLeft: 8 },
  modal: { flex: 1, backgroundColor: '#f5f5f5' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a237e',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  closeBtn: { color: '#fff', fontSize: 14, fontWeight: '600' },
  searchInput: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  resultCount: { fontSize: 12, color: '#888', paddingHorizontal: 16, paddingBottom: 8 },
  option: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionSelected: { backgroundColor: '#e8eaf6' },
  optionText: { fontSize: 14, color: '#333' },
  subLabelText: { fontSize: 12, color: '#888', marginTop: 2 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 14 },
});

export default SearchableDropdown;
