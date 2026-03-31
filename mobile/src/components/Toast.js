import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';

// Global toast ref for imperative usage
let globalShowToast = null;

export const showToast = (message, type = 'success', duration = 3000) => {
  if (globalShowToast) globalShowToast(message, type, duration);
};

const TOAST_COLORS = {
  success: { bg: '#2e7d32', icon: 'check' },
  error: { bg: '#c62828', icon: 'x' },
  warning: { bg: '#f57f17', icon: '!' },
  info: { bg: '#1565c0', icon: 'i' },
};

const TOAST_ICONS = {
  success: '\u2713',
  error: '\u2717',
  warning: '\u0021',
  info: '\u0069',
};

const Toast = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState('success');
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [translateY, opacity]);

  const show = useCallback((msg, toastType = 'success', duration = 3000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    setType(toastType);
    setVisible(true);
    translateY.setValue(-100);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    timerRef.current = setTimeout(hide, duration);
  }, [translateY, opacity, hide]);

  useEffect(() => {
    globalShowToast = show;
    return () => {
      globalShowToast = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show]);

  if (!visible) return null;

  const colors = TOAST_COLORS[type] || TOAST_COLORS.info;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.bg, transform: [{ translateY }], opacity },
      ]}
    >
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>{TOAST_ICONS[type] || 'i'}</Text>
      </View>
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
      <TouchableOpacity onPress={hide} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.closeText}>{'\u2715'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    zIndex: 9999,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  closeBtn: {
    marginLeft: 12,
    padding: 4,
  },
  closeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Toast;
