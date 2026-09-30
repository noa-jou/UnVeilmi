# Database Setup

UnVeilmi uses SQLite for its local Proof-of-Concept database.

## 1. Install SQLite

On Debian-based Linux:

```bash
sudo apt update
sudo apt install sqlite3
```

Check the installation:

```bash
sqlite3 --version
```

---

## 2. Review the Schema

The database structure is defined in:

```text
backend/schema.sql
```

You can inspect it before initialization:

```bash
cat backend/schema.sql
```

---

## 3. Initialize the Database

From the project directory:

```bash
cd backend
sqlite3 unveilmi.db < schema.sql
```

This creates:

```text
unveilmi.db
```

---

## 4. Open the Database

```bash
sqlite3 unveilmi.db
```

You should see:

```text
sqlite>
```

---

## 5. Insert a Database-Only Test Post

This step tests the SQLite database and its trigger directly.

It does **not** send the post through `main.py`, so backend validation such as Veilmi message validation and price recalculation is intentionally bypassed.

Use a temporary Article Name that will not conflict with other data:

```sql
INSERT INTO posts (
    article_name,
    ciphertext,
    storage_hours,
    price
)
VALUES (
    'temporary-database-test',
    'VEILMI1:test-ciphertext',
    1,
    0
);
```

The ciphertext above is only placeholder text for testing the database.

It is not expected to pass the real UnVeilmi API's Veilmi ciphertext validation.

The purpose of this step is only to confirm that SQLite can insert the record and that the database trigger generates runtime values correctly.


## 6. Check the Result

For easier output:

```sql
.headers on
```
`.headers on` displays the column names at the top of query results.  

```sql
.mode column
```
`.mode column` formats the output into aligned columns so it is easier to read.

Then run:

```sql
SELECT * FROM posts;
```

You should see the test record, including automatically generated values such as:

- `ciphertext_size`
- `created_at`
- `expires_at`

If the record appears correctly, the database has been initialized successfully.

This confirms that the database layer is working correctly. Backend API validation is tested separately by `backend_availability_and_security_test.py`.

---

## 7. Remove the Test Record

```sql
DELETE FROM posts
WHERE article_name = 'temporary-database-test';
```

---

## 8. Exit SQLite

```sql
.quit
```

## 9. Interested in what happened next in my demo video?

See [Easter Egg Guide](Easter_Egg_Guide.md)

