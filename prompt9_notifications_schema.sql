-- ============================================================================
-- 17. NOTIFICATION ENGINE (STAGE 0 — PROMPT #9)
-- Provider-agnostic: SMS + WhatsApp + App Push (FCM) + Offline-Scan Auto-Sync Fallback
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 17.1 CORE ENUMS
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('sms', 'whatsapp', 'push', 'email', 'in_app');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('queued', 'sending', 'sent', 'delivered', 'failed', 'read', 'opted_out');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM ('critical', 'high', 'normal', 'low');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE provider_type AS ENUM (
      'twilio', 'msg91', 'textlocal',              -- SMS providers
      'gupshup', 'interakt', 'whatsapp_cloud_api',  -- WhatsApp providers
      'fcm',                                        -- Push provider
      'smtp', 'sendgrid'                             -- Email providers
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------------------------
-- 17.2 PROVIDER CONFIG (Platform-level default + Merchant-level override)
-- ---------------------------------------------------------------------------
-- tenant_id = NULL  → this is a PLATFORM-LEVEL default config (managed by Super Admin)
-- tenant_id = <uuid> → this merchant has brought their own provider/keys (white-label / BYO)

CREATE TABLE IF NOT EXISTS notification_provider_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = platform default
  channel notification_channel NOT NULL,
  provider provider_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_default_for_channel BOOLEAN DEFAULT false, -- only one default per (tenant_id, channel)
  -- secrets stored via Supabase Vault / encrypted column in real deployment;
  -- here we keep a JSONB placeholder — DO NOT expose via any SELECT policy to non-admins
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb, -- {api_key, sender_id, account_sid, from_number, etc.}
  monthly_quota INT,          -- optional cap (platform can throttle a merchant)
  used_this_month INT DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_notif_provider_updated_at ON notification_provider_config;
CREATE TRIGGER update_notif_provider_updated_at BEFORE UPDATE ON notification_provider_config
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- only one default provider per tenant+channel (partial unique index; tenant_id NULL handled separately)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_default_provider_per_tenant_channel
  ON notification_provider_config (tenant_id, channel)
  WHERE is_default_for_channel = true AND tenant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_default_provider_platform_channel
  ON notification_provider_config (channel)
  WHERE is_default_for_channel = true AND tenant_id IS NULL;

-- ---------------------------------------------------------------------------
-- 17.3 TEMPLATES (per tenant, per channel, per event)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = platform-wide system template
  event_code TEXT NOT NULL,        -- 'order_placed','payment_success','emi_due','otp','low_stock', etc.
  channel notification_channel NOT NULL,
  template_name TEXT NOT NULL,
  template_body TEXT NOT NULL,     -- supports {{variable}} placeholders
  whatsapp_template_id TEXT,       -- Meta/Gupshup pre-approved template ID (WhatsApp needs pre-approval)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, event_code, channel)
);

DROP TRIGGER IF EXISTS update_notif_template_updated_at ON notification_templates;
CREATE TRIGGER update_notif_template_updated_at BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 17.4 RECIPIENT PREFERENCES / OPT-OUT (TRAI + WhatsApp policy compliance)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL,   -- 'customer','staff','driver','merchant_admin'
  recipient_id UUID NOT NULL,
  channel notification_channel NOT NULL,
  is_opted_in BOOLEAN DEFAULT true,
  opted_out_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, recipient_type, recipient_id, channel)
);

-- ---------------------------------------------------------------------------
-- 17.5 NOTIFICATION QUEUE + LOGS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = platform-level broadcast
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  channel notification_channel NOT NULL,
  event_code TEXT NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'normal',
  recipient_type TEXT NOT NULL,
  recipient_id UUID,                  -- NULL allowed for ad-hoc/manual sends
  recipient_address TEXT NOT NULL,    -- phone number / email / device token
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  rendered_body TEXT NOT NULL,        -- final message after placeholder substitution
  reference_type TEXT,                -- 'invoice','emi_reminder','broadcast','otp', etc.
  reference_id UUID,
  status notification_status NOT NULL DEFAULT 'queued',
  attempt_count INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  provider_used provider_type,
  provider_message_id TEXT,           -- ID returned by SMS/WhatsApp/FCM provider for tracking
  failure_reason TEXT,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(), -- allows future-dated sends (EMI reminders etc.)
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_queue_pending ON notification_queue (status, scheduled_for)
  WHERE status IN ('queued', 'failed');
CREATE INDEX IF NOT EXISTS idx_notif_queue_tenant ON notification_queue (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_queue_recipient ON notification_queue (recipient_type, recipient_id);

-- Append-only delivery event log (webhook callbacks from providers land here)
CREATE TABLE IF NOT EXISTS notification_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_queue_id UUID NOT NULL REFERENCES notification_queue(id) ON DELETE CASCADE,
  event_status notification_status NOT NULL,
  provider_payload JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 17.6 OFFLINE-SCAN AUTO-SYNC FALLBACK
-- (For POS/billing devices that go offline — actions queue locally, then this
--  table holds the server-side mirror once connectivity resumes & app syncs)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE offline_sync_status AS ENUM ('pending_sync', 'synced', 'conflict', 'discarded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS offline_action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  device_id TEXT NOT NULL,             -- local device/session identifier
  action_type TEXT NOT NULL,           -- 'invoice_created','stock_scan','notification_trigger', etc.
  local_uuid UUID NOT NULL,            -- client-generated idempotency key (prevents duplicate on re-sync)
  payload JSONB NOT NULL,
  created_offline_at TIMESTAMPTZ NOT NULL, -- device local timestamp
  sync_status offline_sync_status NOT NULL DEFAULT 'pending_sync',
  synced_at TIMESTAMPTZ,
  server_reference_id UUID,            -- ID of the row created once processed (e.g. invoice id)
  conflict_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, device_id, local_uuid)  -- idempotent re-sync safe
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_pending ON offline_action_queue (tenant_id, sync_status)
  WHERE sync_status = 'pending_sync';

-- ---------------------------------------------------------------------------
-- 17.7 GLOBAL BROADCAST (Super Admin → all merchants / all consumers)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE broadcast_audience AS ENUM ('all_merchants', 'all_consumers', 'specific_module', 'specific_tenant_list');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS platform_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message_body TEXT NOT NULL,
  audience broadcast_audience NOT NULL,
  target_module_code TEXT,            -- used when audience = 'specific_module'
  target_tenant_ids UUID[],           -- used when audience = 'specific_tenant_list'
  channels notification_channel[] NOT NULL DEFAULT ARRAY['in_app']::notification_channel[],
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft','queued','sent'
  created_by UUID NOT NULL REFERENCES platform_admins(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE notification_provider_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_action_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_broadcasts ENABLE ROW LEVEL SECURITY;

-- Merchant users see only their tenant's rows; platform default rows (tenant_id NULL)
-- are visible to everyone for read (so app knows a fallback provider exists) but
-- credentials JSONB should be masked at the application layer for non-admins.
DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own or platform provider config" ON notification_provider_config; END $$;
CREATE POLICY "Tenant sees own or platform provider config" ON notification_provider_config
  FOR SELECT USING (
    tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())
  );

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own or platform templates" ON notification_templates; END $$;
CREATE POLICY "Tenant sees own or platform templates" ON notification_templates
  FOR SELECT USING (
    tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())
  );

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own queue" ON notification_queue; END $$;
CREATE POLICY "Tenant sees own queue" ON notification_queue
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())
  );

DO $$ BEGIN DROP POLICY IF EXISTS "Tenant sees own offline queue" ON offline_action_queue; END $$;
CREATE POLICY "Tenant sees own offline queue" ON offline_action_queue
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())
  );

DO $$ BEGIN DROP POLICY IF EXISTS "Platform admins manage broadcasts" ON platform_broadcasts; END $$;
CREATE POLICY "Platform admins manage broadcasts" ON platform_broadcasts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid())
  );

-- ============================================================================
-- CORE FUNCTIONS
-- ============================================================================

-- 17.A Enqueue a notification (renders template, checks opt-out, respects priority)
CREATE OR REPLACE FUNCTION enqueue_notification(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_channel notification_channel,
  p_event_code TEXT,
  p_recipient_type TEXT,
  p_recipient_id UUID,
  p_recipient_address TEXT,
  p_variables JSONB,          -- {"customer_name": "Rahul", "amount": "500"}
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_priority notification_priority DEFAULT 'normal',
  p_scheduled_for TIMESTAMPTZ DEFAULT NOW()
) RETURNS UUID AS $$
DECLARE
  v_template notification_templates%ROWTYPE;
  v_body TEXT;
  v_key TEXT;
  v_val TEXT;
  v_is_opted_in BOOLEAN := true;
  v_queue_id UUID;
BEGIN
  -- opt-out check (default true if no explicit preference row exists)
  SELECT is_opted_in INTO v_is_opted_in FROM notification_preferences
    WHERE tenant_id = p_tenant_id AND recipient_type = p_recipient_type
      AND recipient_id = p_recipient_id AND channel = p_channel;

  IF v_is_opted_in IS FALSE THEN
    RAISE NOTICE 'Recipient has opted out of % notifications — skipping', p_channel;
    RETURN NULL;
  END IF;

  -- fetch tenant-specific template, fallback to platform-wide template
  SELECT * INTO v_template FROM notification_templates
    WHERE tenant_id = p_tenant_id AND event_code = p_event_code AND channel = p_channel AND is_active = true;
  IF NOT FOUND THEN
    SELECT * INTO v_template FROM notification_templates
      WHERE tenant_id IS NULL AND event_code = p_event_code AND channel = p_channel AND is_active = true;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active template found for event % on channel %', p_event_code, p_channel;
  END IF;

  v_body := v_template.template_body;
  FOR v_key, v_val IN SELECT * FROM jsonb_each_text(COALESCE(p_variables, '{}'::jsonb))
  LOOP
    v_body := replace(v_body, '{{' || v_key || '}}', v_val);
  END LOOP;

  INSERT INTO notification_queue (
    tenant_id, branch_id, channel, event_code, priority, recipient_type, recipient_id,
    recipient_address, template_id, rendered_body, reference_type, reference_id, scheduled_for
  ) VALUES (
    p_tenant_id, p_branch_id, p_channel, p_event_code, p_priority, p_recipient_type, p_recipient_id,
    p_recipient_address, v_template.id, v_body, p_reference_type, p_reference_id, p_scheduled_for
  ) RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17.B Fetch the next batch of due, unsent notifications (called by an Edge
-- Function / cron worker every ~30s, which then calls the actual SMS/WhatsApp/FCM API)
CREATE OR REPLACE FUNCTION fetch_pending_notifications(p_limit INT DEFAULT 50)
RETURNS SETOF notification_queue AS $$
BEGIN
  RETURN QUERY
    UPDATE notification_queue
    SET status = 'sending', attempt_count = attempt_count + 1
    WHERE id IN (
      SELECT id FROM notification_queue
      WHERE status IN ('queued', 'failed')
        AND scheduled_for <= NOW()
        AND attempt_count < max_attempts
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY priority = 'critical' DESC, priority = 'high' DESC, scheduled_for ASC
      LIMIT p_limit
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- 17.C Mark result after the worker actually calls the provider API
CREATE OR REPLACE FUNCTION update_notification_result(
  p_notification_id UUID,
  p_status notification_status,
  p_provider_used provider_type DEFAULT NULL,
  p_provider_message_id TEXT DEFAULT NULL,
  p_failure_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_row notification_queue%ROWTYPE;
  v_backoff_minutes INT;
BEGIN
  SELECT * INTO v_row FROM notification_queue WHERE id = p_notification_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;

  IF p_status = 'failed' AND v_row.attempt_count < v_row.max_attempts THEN
    v_backoff_minutes := POWER(2, v_row.attempt_count) * 2; -- exponential backoff: 2,4,8 min
    UPDATE notification_queue SET
      status = 'failed', failure_reason = p_failure_reason,
      next_retry_at = NOW() + (v_backoff_minutes || ' minutes')::INTERVAL
    WHERE id = p_notification_id;
  ELSE
    UPDATE notification_queue SET
      status = p_status,
      provider_used = COALESCE(p_provider_used, provider_used),
      provider_message_id = COALESCE(p_provider_message_id, provider_message_id),
      failure_reason = p_failure_reason,
      sent_at = CASE WHEN p_status IN ('sent','delivered') THEN NOW() ELSE sent_at END,
      delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END
    WHERE id = p_notification_id;
  END IF;

  INSERT INTO notification_delivery_events (notification_queue_id, event_status, provider_payload)
    VALUES (p_notification_id, p_status, jsonb_build_object('provider_message_id', p_provider_message_id, 'failure_reason', p_failure_reason));
END;
$$ LANGUAGE plpgsql;

-- 17.D Sync an offline-queued action once device reconnects (idempotent)
CREATE OR REPLACE FUNCTION sync_offline_action(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_device_id TEXT,
  p_action_type TEXT,
  p_local_uuid UUID,
  p_payload JSONB,
  p_created_offline_at TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  v_existing offline_action_queue%ROWTYPE;
  v_id UUID;
BEGIN
  SELECT * INTO v_existing FROM offline_action_queue
    WHERE tenant_id = p_tenant_id AND device_id = p_device_id AND local_uuid = p_local_uuid;

  IF FOUND THEN
    -- already synced earlier — return existing result, do NOT reprocess (idempotency)
    RETURN jsonb_build_object('already_synced', true, 'sync_status', v_existing.sync_status, 'id', v_existing.id);
  END IF;

  INSERT INTO offline_action_queue (
    tenant_id, branch_id, device_id, action_type, local_uuid, payload, created_offline_at, sync_status
  ) VALUES (
    p_tenant_id, p_branch_id, p_device_id, p_action_type, p_local_uuid, p_payload, p_created_offline_at, 'pending_sync'
  ) RETURNING id INTO v_id;

  -- NOTE: actual processing (e.g. creating the invoice from payload) is done by the
  -- application layer / edge function immediately after this insert, which then calls
  -- mark_offline_action_synced() below.

  RETURN jsonb_build_object('already_synced', false, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_offline_action_synced(
  p_offline_action_id UUID,
  p_server_reference_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE offline_action_queue
  SET sync_status = 'synced', synced_at = NOW(), server_reference_id = p_server_reference_id
  WHERE id = p_offline_action_id;
END;
$$ LANGUAGE plpgsql;

-- 17.E Queue a platform-wide broadcast to all recipients of the chosen audience
CREATE OR REPLACE FUNCTION dispatch_platform_broadcast(p_broadcast_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_broadcast platform_broadcasts%ROWTYPE;
  v_channel notification_channel;
  v_count INT := 0;
BEGIN
  SELECT * INTO v_broadcast FROM platform_broadcasts WHERE id = p_broadcast_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Broadcast not found'; END IF;
  IF v_broadcast.status <> 'draft' THEN RAISE EXCEPTION 'Broadcast already queued or sent'; END IF;

  FOREACH v_channel IN ARRAY v_broadcast.channels LOOP
    IF v_broadcast.audience = 'all_merchants' THEN
      INSERT INTO notification_queue (tenant_id, channel, event_code, priority, recipient_type, recipient_id, recipient_address, rendered_body, reference_type, reference_id)
        SELECT t.id, v_channel, 'platform_broadcast', 'high', 'merchant_admin', u.id, COALESCE(u.phone, u.email, ''), v_broadcast.message_body, 'broadcast', p_broadcast_id
        FROM tenants t JOIN user_tenant_roles utr ON utr.tenant_id = t.id JOIN users u ON u.id = utr.user_id
        WHERE utr.role_id IN (SELECT id FROM roles_master WHERE role_name = 'Admin');
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_broadcast.audience = 'all_consumers' THEN
      INSERT INTO notification_queue (tenant_id, channel, event_code, priority, recipient_type, recipient_id, recipient_address, rendered_body, reference_type, reference_id)
        SELECT NULL, v_channel, 'platform_broadcast', 'normal', 'consumer', cp.id, COALESCE(cp.phone, cp.email, ''), v_broadcast.message_body, 'broadcast', p_broadcast_id
        FROM consumer_profiles cp;
      GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF v_broadcast.audience = 'specific_tenant_list' THEN
      INSERT INTO notification_queue (tenant_id, channel, event_code, priority, recipient_type, recipient_id, recipient_address, rendered_body, reference_type, reference_id)
        SELECT t.id, v_channel, 'platform_broadcast', 'high', 'merchant_admin', u.id, COALESCE(u.phone, u.email, ''), v_broadcast.message_body, 'broadcast', p_broadcast_id
        FROM tenants t JOIN user_tenant_roles utr ON utr.tenant_id = t.id JOIN users u ON u.id = utr.user_id
        WHERE t.id = ANY(v_broadcast.target_tenant_ids) AND utr.role_id IN (SELECT id FROM roles_master WHERE role_name = 'Admin');
      GET DIAGNOSTICS v_count = ROW_COUNT;
    END IF;
  END LOOP;

  UPDATE platform_broadcasts SET status = 'queued', sent_count = v_count, sent_at = NOW() WHERE id = p_broadcast_id;
  RETURN jsonb_build_object('queued_count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED: a few essential platform-wide system templates so the engine works out-of-the-box
-- ============================================================================
INSERT INTO notification_templates (tenant_id, event_code, channel, template_name, template_body)
VALUES
  (NULL, 'otp', 'sms', 'OTP - SMS', 'Your BahiBox OTP is {{otp}}. Valid for 5 minutes. Do not share.'),
  (NULL, 'order_placed', 'whatsapp', 'Order Confirmation - WhatsApp', 'Hi {{customer_name}}, your order #{{order_id}} of ₹{{amount}} has been placed successfully.'),
  (NULL, 'payment_success', 'sms', 'Payment Success - SMS', 'Payment of ₹{{amount}} received for invoice {{invoice_number}}. Thank you!'),
  (NULL, 'emi_due', 'whatsapp', 'EMI Reminder - WhatsApp', 'Hi {{customer_name}}, your EMI of ₹{{amount}} is due on {{due_date}}. Pay now to avoid late fees.'),
  (NULL, 'low_stock', 'push', 'Low Stock Alert - Push', 'Stock alert: {{product_name}} is running low ({{quantity}} left).'),
  (NULL, 'platform_broadcast', 'in_app', 'Platform Broadcast - In App', '{{message}}')
ON CONFLICT (tenant_id, event_code, channel) DO NOTHING;
