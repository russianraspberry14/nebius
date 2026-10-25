-- Kindred data model. Facts always point back to the note they came from,
-- which is what makes plan citations possible.

CREATE TABLE IF NOT EXISTS person (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    relationship TEXT NOT NULL,
    home_city   TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS key_date (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id   INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
    label       TEXT NOT NULL,
    date        TEXT NOT NULL,
    recurring   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS note (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id   INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fact (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id   INTEGER NOT NULL REFERENCES person(id) ON DELETE CASCADE,
    note_id     INTEGER NOT NULL REFERENCES note(id) ON DELETE CASCADE,
    category    TEXT NOT NULL CHECK (category IN
                    ('like', 'dislike', 'wishlist', 'dietary', 'constraint', 'past_experience')),
    value       TEXT NOT NULL,
    sentiment   TEXT,
    confidence  REAL,
    confirmed   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plan (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    person_ids  TEXT NOT NULL,          -- JSON array of person.id
    occasion    TEXT NOT NULL,
    date        TEXT NOT NULL,
    budget      TEXT,
    area        TEXT,
    stops       TEXT NOT NULL,          -- JSON array: {name, time, url, cost_estimate, cited_fact_ids}
    status      TEXT NOT NULL DEFAULT 'draft',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_key_date_person ON key_date(person_id);
CREATE INDEX IF NOT EXISTS idx_note_person ON note(person_id);
CREATE INDEX IF NOT EXISTS idx_fact_person ON fact(person_id);
CREATE INDEX IF NOT EXISTS idx_fact_note ON fact(note_id);
