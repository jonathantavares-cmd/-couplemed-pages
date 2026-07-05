-- ============================================================================
-- CoupleMed QBank — D1 Schema (SQLite dialect)
-- Cobre: Parte 1 (modelo de dados), Parte 15.1 (SmartCards) e Parte 16.2 (import_batches).
--
-- REGRAS DE OURO (Partes 4, 11, 16.4):
--   * `attempts` NUNCA é sobrescrita ou deletada — é o histórico imutável.
--   * pass_number NUNCA é coluna de `questions`; é sempre calculado por usuário via attempts.
--   * Contagens sempre por query real, nunca hardcoded.
--
-- Como aplicar:
--   npx wrangler d1 create qbank-db
--   npx wrangler d1 execute qbank-db --file ./schema.sql --local   (ambiente local)
--   npx wrangler d1 execute qbank-db --file ./schema.sql            (produção)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- SYSTEMS (enum fixo — lista oficial UWorld/USMLE, Parte 1)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS systems (
  id   TEXT PRIMARY KEY,          -- slug estável, ex: 'cardiovascular_system'
  name TEXT NOT NULL UNIQUE,      -- rótulo oficial
  sort INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- DISCIPLINES (enum fixo, Parte 1)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disciplines (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort INTEGER NOT NULL DEFAULT 0
);

-- ----------------------------------------------------------------------------
-- CATEGORIES (subtópicos por sistema — accordion no frontend, Parte 1)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id        TEXT PRIMARY KEY,
  system_id TEXT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  UNIQUE (system_id, name)
);

-- ----------------------------------------------------------------------------
-- QUESTIONS (Parte 1). pass_number NÃO existe aqui (Parte 16.4).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
  id                    TEXT PRIMARY KEY,          -- uuid
  question_text         TEXT NOT NULL,
  vignette_image_url    TEXT,
  options               TEXT NOT NULL,             -- jsonb: [{label,text}]
  correct_option        TEXT NOT NULL,
  explanation_correct   TEXT NOT NULL,
  explanation_incorrect TEXT,                      -- jsonb: [{option,explanation}]
  educational_objective TEXT,
  system_id             TEXT NOT NULL REFERENCES systems(id),
  discipline_id         TEXT NOT NULL REFERENCES disciplines(id),
  category_id           TEXT REFERENCES categories(id),
  difficulty_level      TEXT NOT NULL DEFAULT 'medium'
                          CHECK (difficulty_level IN ('easy','medium','hard')),
  media_urls            TEXT,                      -- jsonb: [{url,context,alt_text}]
  references_text       TEXT,
  version               INTEGER NOT NULL DEFAULT 1,-- Parte 16.6: reenvio versionado
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_questions_system     ON questions(system_id);
CREATE INDEX IF NOT EXISTS idx_questions_discipline ON questions(discipline_id);
CREATE INDEX IF NOT EXISTS idx_questions_category   ON questions(category_id);

-- ----------------------------------------------------------------------------
-- ATTEMPTS (Parte 4) — HISTÓRICO IMUTÁVEL. Só INSERT, jamais UPDATE/DELETE.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attempts (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  question_id         TEXT NOT NULL REFERENCES questions(id),
  test_id             TEXT REFERENCES tests(id),
  pass_number         INTEGER NOT NULL,            -- 1,2,3,99 (Pass Dirigido) — calculado
  selected_option     TEXT,
  is_correct          INTEGER,                     -- 0/1/NULL(omitida)
  status              TEXT NOT NULL CHECK (status IN ('correct','incorrect','omitted')),
  time_spent_seconds  INTEGER NOT NULL DEFAULT 0,
  mode                TEXT NOT NULL CHECK (mode IN ('tutor','timed','exam','surgical_review')),
  flagged             INTEGER NOT NULL DEFAULT 0,
  strikethrough_options TEXT,                      -- jsonb
  root_cause_tag      TEXT,                        -- Parte 5
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_user_q ON attempts(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_test   ON attempts(test_id);

-- ----------------------------------------------------------------------------
-- TESTS (Parte 2/8)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tests (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  test_type       TEXT NOT NULL CHECK (test_type IN ('custom','exam_simulation','surgical_review','self_assessment')),
  filters_applied TEXT,                            -- jsonb
  total_count     INTEGER NOT NULL DEFAULT 0,
  correct_count   INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  omitted_count   INTEGER NOT NULL DEFAULT 0,
  mode            TEXT NOT NULL,
  started_at      TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT,
  status          TEXT NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress','suspended','completed'))
);
CREATE INDEX IF NOT EXISTS idx_tests_user ON tests(user_id);

-- ----------------------------------------------------------------------------
-- FLASHCARDS (Parte 6 + 15.1 SmartCards)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flashcards (
  id                        TEXT PRIMARY KEY,
  user_id                   TEXT NOT NULL,
  question_id               TEXT REFERENCES questions(id),
  deck_type                 TEXT NOT NULL DEFAULT 'smartcard'
                              CHECK (deck_type IN ('readydeck','smartcard')),
  front_content             TEXT NOT NULL,
  back_content              TEXT NOT NULL,
  srs_interval_days         REAL NOT NULL DEFAULT 0,
  srs_ease_factor           REAL NOT NULL DEFAULT 2.5,
  next_review_date          TEXT,
  review_count              INTEGER NOT NULL DEFAULT 0,
  -- Parte 15.1
  source_question_id        TEXT REFERENCES questions(id),
  source_attempt_id         TEXT REFERENCES attempts(id),
  auto_generated            INTEGER NOT NULL DEFAULT 0,
  link_status               TEXT NOT NULL DEFAULT 'active'
                              CHECK (link_status IN ('active','archived')),
  source_type               TEXT NOT NULL DEFAULT 'own_qbank'
                              CHECK (source_type IN ('own_qbank','readydeck','imported')),
  origin_status_at_creation TEXT,
  priority_level            TEXT NOT NULL DEFAULT 'normal'
                              CHECK (priority_level IN ('high','normal')),
  content_type              TEXT NOT NULL DEFAULT 'basic'
                              CHECK (content_type IN ('basic','cloze')),
  cloze_map                 TEXT,                  -- jsonb
  created_at                TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_flashcards_user   ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_source ON flashcards(source_question_id);

-- Parte 15.1 — vínculo bidirecional questão <-> flashcard
CREATE TABLE IF NOT EXISTS question_flashcard_links (
  id           TEXT PRIMARY KEY,
  question_id  TEXT NOT NULL REFERENCES questions(id),
  flashcard_id TEXT NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  link_type    TEXT NOT NULL DEFAULT 'primary_source'
                 CHECK (link_type IN ('primary_source','related_reinforcement')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_qfl_question  ON question_flashcard_links(question_id);
CREATE INDEX IF NOT EXISTS idx_qfl_flashcard ON question_flashcard_links(flashcard_id);

-- ----------------------------------------------------------------------------
-- NOTEBOOK (Parte 6)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notebook_entries (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  question_id TEXT REFERENCES questions(id),
  content     TEXT NOT NULL,
  tags        TEXT,                                -- jsonb array
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notebook_user ON notebook_entries(user_id);

-- ----------------------------------------------------------------------------
-- STUDY PLANS (Parte 9)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_plans (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  exam_date             TEXT,
  daily_hours_available REAL,
  generated_schedule    TEXT,                      -- jsonb
  auto_adjusted         INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ----------------------------------------------------------------------------
-- QUESTION PEER STATS (Parte 7) — estatística global agregada por alternativa
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS question_peer_stats (
  question_id          TEXT NOT NULL REFERENCES questions(id),
  option_label         TEXT NOT NULL,
  selection_percentage REAL NOT NULL DEFAULT 0,
  avg_time_spent       REAL NOT NULL DEFAULT 0,
  total_attempts_global INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (question_id, option_label)
);

-- ----------------------------------------------------------------------------
-- CONDITION COMPARISONS (Parte 5.4 — confusão de diagnósticos semelhantes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS condition_comparisons (
  id            TEXT PRIMARY KEY,
  question_id   TEXT NOT NULL REFERENCES questions(id),
  condition_a   TEXT NOT NULL,
  condition_b   TEXT NOT NULL,
  distinguishing TEXT NOT NULL                     -- jsonb: [{feature,a_value,b_value}]
);

-- ----------------------------------------------------------------------------
-- IMPORT BATCHES (Parte 16.2/16.5 — auditoria de importação)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_batches (
  id              TEXT PRIMARY KEY,
  uploaded_by     TEXT NOT NULL,
  batch_type      TEXT NOT NULL CHECK (batch_type IN ('by_unit','by_block','by_theme')),
  source_filename TEXT,
  total_questions INTEGER NOT NULL DEFAULT 0,
  success_count   INTEGER NOT NULL DEFAULT 0,
  error_count     INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- SEED — enums fixos (Parte 1). Idempotente via INSERT OR IGNORE.
-- ============================================================================
INSERT OR IGNORE INTO systems (id,name,sort) VALUES
 ('allergy_immunology','Allergy & Immunology',1),
 ('biostat_epi','Biostatistics & Epidemiology',2),
 ('cardiovascular_system','Cardiovascular System',3),
 ('dermatology','Dermatology',4),
 ('ent','ENT',5),
 ('endocrine','Endocrine, Diabetes & Metabolism',6),
 ('female_repro_breast','Female Reproductive System & Breast',7),
 ('male_repro','Male Reproductive System',8),
 ('gi_nutrition','Gastrointestinal & Nutrition',9),
 ('general_principles','General Principles',10),
 ('heme_onc','Hematology & Oncology',11),
 ('infectious_disease','Infectious Disease',12),
 ('musculoskeletal','Musculoskeletal System',13),
 ('nervous_special_senses','Nervous System & Special Senses',14),
 ('poisoning_environmental','Poisoning & Environmental Exposure',15),
 ('pregnancy_childbirth','Pregnancy, Childbirth & Puerperium',16),
 ('psych_behavioral','Psychiatric/Behavioral & Substance Use Disorder',17),
 ('renal_urinary','Renal/Urinary System',18),
 ('respiratory_system','Respiratory System',19),
 ('rheum_ortho','Rheumatology/Orthopedics',20),
 ('social_sciences','Social Sciences',21),
 ('multisystem','Multisystem Processes & Disorders',22);

INSERT OR IGNORE INTO disciplines (id,name,sort) VALUES
 ('anatomy','Anatomy',1),
 ('behavioral_science','Behavioral Science',2),
 ('biochem','Biochemistry & Molecular Biology',3),
 ('biostat_epi_d','Biostatistics & Epidemiology',4),
 ('embryology','Embryology',5),
 ('genetics','Genetics',6),
 ('histology','Histology & Cell Biology',7),
 ('immunology','Immunology',8),
 ('microbiology','Microbiology',9),
 ('pathology','Pathology',10),
 ('pathophysiology','Pathophysiology',11),
 ('pharmacology','Pharmacology',12),
 ('physiology','Physiology',13);

-- Fim do schema.
