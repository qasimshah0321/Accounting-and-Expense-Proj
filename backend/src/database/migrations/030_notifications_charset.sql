-- Migration 030: Fix notifications table charset to support emoji / full Unicode
ALTER TABLE notifications
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
