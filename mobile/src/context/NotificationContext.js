import React, { createContext, useContext } from 'react';
import useNotifications from '../hooks/useNotifications';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

/**
 * Wraps the useNotifications hook in a context so unread count
 * is accessible everywhere (tab bar badge, header, etc.).
 */
export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const notifs = useNotifications(isAuthenticated);

  return (
    <NotificationContext.Provider value={notifs}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
};

export default NotificationContext;
