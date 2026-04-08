import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { notificationsAPI } from '../services/api';

const POLL_INTERVAL = 30000; // 30 seconds

/**
 * Global notification polling hook.
 * Returns notifications list, unread count, and actions to mark read.
 * Polls every 30s while the app is in the foreground.
 */
const useNotifications = (isAuthenticated) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationsAPI.getAll(30);
      const data = res.data || res;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      // Silently fail on polling — don't interrupt UX
      console.log('Notification poll error:', err.message);
    }
  }, [isAuthenticated]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchNotifications();
    setLoading(false);
  }, [fetchNotifications]);

  const markRead = useCallback(async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.log('Mark read error:', err.message);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.log('Mark all read error:', err.message);
    }
  }, []);

  // Start/stop polling based on auth state and app foreground
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Initial fetch
    fetchNotifications();

    // Set up polling
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);

    // Pause polling when app goes to background, resume on foreground
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground — fetch immediately and restart interval
        fetchNotifications();
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
      } else if (nextState.match(/inactive|background/)) {
        // App went to background — stop polling
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      appStateRef.current = nextState;
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, [isAuthenticated, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
  };
};

export default useNotifications;
