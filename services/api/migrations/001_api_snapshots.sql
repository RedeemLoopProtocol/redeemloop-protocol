CREATE TABLE IF NOT EXISTS redeemloop_api_snapshots (
  id text PRIMARY KEY,
  snapshot_version integer NOT NULL,
  snapshot jsonb NOT NULL,
  saved_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
