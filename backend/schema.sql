CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    article_name TEXT NOT NULL UNIQUE,
    ciphertext TEXT NOT NULL,

    storage_hours INTEGER NOT NULL CHECK (storage_hours > 0),
    price INTEGER NOT NULL CHECK (price >= 0),

    ciphertext_size INTEGER,

    created_at TEXT NOT NULL
        DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),

    expires_at TEXT
);

CREATE TRIGGER set_post_runtime_values
AFTER INSERT ON posts
FOR EACH ROW
BEGIN
    UPDATE posts
    SET
        ciphertext_size = length(CAST(NEW.ciphertext AS BLOB)),
        expires_at = strftime(
            '%Y-%m-%dT%H:%M:%SZ',
            NEW.created_at,
            '+' || NEW.storage_hours || ' hours'
        )
    WHERE id = NEW.id;
END;