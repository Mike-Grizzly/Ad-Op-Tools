CREATE TABLE utm_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  source      text,
  medium      text,
  campaign    text,
  content     text,
  term        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE utm_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own utm_templates"
  ON utm_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX utm_templates_user_id_idx ON utm_templates (user_id);

---

CREATE TABLE utm_history (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id   uuid        REFERENCES utm_templates(id) ON DELETE SET NULL,
  base_url      text        NOT NULL,
  source        text        NOT NULL,
  medium        text        NOT NULL,
  campaign      text        NOT NULL,
  content       text,
  term          text,
  generated_url text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE utm_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own utm_history"
  ON utm_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX utm_history_user_id_idx     ON utm_history (user_id);
CREATE INDEX utm_history_created_at_idx  ON utm_history (user_id, created_at DESC);
