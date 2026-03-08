-- Migration 018: Add 'accepted' status to delivery_notes.
-- When a delivery note is accepted (invoiced), its status changes to 'accepted'.

ALTER TABLE delivery_notes DROP CONSTRAINT IF EXISTS delivery_notes_status_check;
ALTER TABLE delivery_notes ADD CONSTRAINT delivery_notes_status_check
  CHECK (status IN ('draft','ready_to_ship','shipped','in_transit','delivered','accepted','cancelled'));
