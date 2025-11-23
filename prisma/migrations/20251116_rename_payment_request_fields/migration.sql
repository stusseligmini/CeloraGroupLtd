-- PaymentRequest Schema Migration
-- Rename columns to match new schema design
-- BREAKING CHANGE: This renames from_user_id → sender_id and to_user_id → receiver_id

BEGIN;

-- Rename columns in payment_requests table
ALTER TABLE "payment_requests" 
  RENAME COLUMN "from_user_id" TO "sender_id";

ALTER TABLE "payment_requests" 
  RENAME COLUMN "to_user_id" TO "receiver_id";

-- Update foreign key constraint names if they exist
-- Note: Foreign keys are already defined in schema.prisma and will be recreated on next deploy

COMMIT;
