-- Migration: user_sync_packages
-- One-record-per-user snapshot that bundles all user state (SRS cards + custom content).
-- Version-based optimistic concurrency: higher version always wins.

CREATE TABLE IF NOT EXISTS public.user_sync_packages (
  user_id    uuid         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version    bigint       NOT NULL DEFAULT 0,
  device_id  text         NOT NULL DEFAULT '',
  updated_at timestamptz  NOT NULL DEFAULT now(),
  payload    jsonb        NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.user_sync_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_package_owner"
  ON public.user_sync_packages FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------
-- RPC: upload_sync_package
-- Conditionally updates the package only if the incoming version
-- is strictly greater than the stored version (last-write-wins
-- by version number, not timestamp).
-- Returns the version currently stored after the attempt.
-- If returned value != p_version, upload was rejected — caller
-- should download the remote package and retry next cycle.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION upload_sync_package(
  p_device_id text,
  p_version   bigint,
  p_payload   jsonb
) RETURNS bigint
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id        uuid   := auth.uid();
  v_stored_version bigint;
BEGIN
  INSERT INTO public.user_sync_packages (user_id, device_id, version, payload, updated_at)
  VALUES (v_user_id, p_device_id, p_version, p_payload, now())
  ON CONFLICT (user_id) DO UPDATE
    SET device_id  = EXCLUDED.device_id,
        version    = EXCLUDED.version,
        payload    = EXCLUDED.payload,
        updated_at = now()
    WHERE user_sync_packages.version < EXCLUDED.version;

  SELECT version INTO v_stored_version
  FROM public.user_sync_packages
  WHERE user_id = v_user_id;

  RETURN COALESCE(v_stored_version, 0);
END;
$$;

GRANT SELECT, INSERT, UPDATE ON public.user_sync_packages TO authenticated;
GRANT EXECUTE ON FUNCTION upload_sync_package TO authenticated;
