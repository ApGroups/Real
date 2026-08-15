-- Notifications are issued by admins, while recipients only read and mark their own items.

DROP TRIGGER IF EXISTS notify_available_chefs_about_request_trigger ON food_requests;
DROP TRIGGER IF EXISTS notify_customer_about_bid_trigger ON bids;
DROP TRIGGER IF EXISTS notify_chef_about_bid_status_trigger ON bids;
DROP TRIGGER IF EXISTS notify_chef_about_new_order_trigger ON orders;
DROP TRIGGER IF EXISTS notify_participants_about_order_status_trigger ON orders;
DROP TRIGGER IF EXISTS notify_recipient_about_message_trigger ON messages;
DROP TRIGGER IF EXISTS notify_chef_about_review_trigger ON reviews;
DROP TRIGGER IF EXISTS notify_chef_about_approval_trigger ON chef_profiles;

DROP FUNCTION IF EXISTS notify_available_chefs_about_request();
DROP FUNCTION IF EXISTS notify_customer_about_bid();
DROP FUNCTION IF EXISTS notify_chef_about_bid_status();
DROP FUNCTION IF EXISTS notify_chef_about_new_order();
DROP FUNCTION IF EXISTS notify_participants_about_order_status();
DROP FUNCTION IF EXISTS notify_recipient_about_message();
DROP FUNCTION IF EXISTS notify_chef_about_review();
DROP FUNCTION IF EXISTS notify_chef_about_approval();
DROP FUNCTION IF EXISTS notification_status_label(text);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);

UPDATE notifications
SET created_by = user_id
WHERE created_by IS NULL;

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can read all notifications" ON notifications;

CREATE POLICY "Admins can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role = 'admin' AND is_active = true
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY "Admins can read all notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role = 'admin' AND is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_created_by
  ON notifications(created_by, created_at DESC);
