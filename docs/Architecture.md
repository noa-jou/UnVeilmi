# Architecture

> **Veilmi handles the secret.  
> UnVeilmi handles the ciphertext.**

UnVeilmi is a local Proof of Concept for temporarily storing and retrieving ciphertext created by Veilmi.

Its current architecture is intentionally small:

```text
             VEILMI
     Local encryption/decryption
                  │
                  │ VEILMI1 ciphertext
                  ▼
        ┌───────────────────┐
        │ UnVeilmi Frontend │
        │ HTML / CSS / JS   │
        │ 127.0.0.1:5500    │
        └─────────┬─────────┘
                  │ HTTP
                  ▼
        ┌───────────────────┐
        │ FastAPI Backend   │
        │ 127.0.0.1:8000    │
        └─────────┬─────────┘
                  │ parameterized SQL
                  ▼
        ┌───────────────────┐
        │ SQLite Database   │
        │ unveilmi.db       │
        └───────────────────┘
```

The passphrase and plaintext stay with Veilmi.  
UnVeilmi receives only the ciphertext and the metadata needed to store it temporarily.

---

## 1. Main Components

| Component | Responsibility |
|---|---|
| **Veilmi** | Encrypts and decrypts text locally |
| **Frontend** | Collects Article Name, ciphertext, storage duration, and displays results |
| **FastAPI backend** | Validates requests, recalculates price, checks availability, retrieves posts, and removes expired data |
| **SQLite** | Stores active ciphertext records and runtime metadata |

The frontend does not access SQLite directly.

The backend does not decrypt ciphertext.

---

## 2. Publish Flow

```text
Veilmi
  ↓
Create VEILMI1 ciphertext
  ↓
Paste into UnVeilmi
  ↓
Choose Article Name
  ↓
Choose storage duration
  ↓
Frontend checks and calculates quote
  ↓
POST /posts
  ↓
Backend validates again
  ↓
SQLite stores the post
```

The frontend provides immediate feedback, but the backend remains the final authority.

For example, the frontend may calculate a storage price, but the backend recalculates it independently before accepting the post.

This prevents a modified client from simply sending an incorrect price.

---

## 3. Find Flow

```text
Article Name
  ↓
GET /posts/{article_name}
  ↓
Backend checks active data
  ↓
SQLite lookup
  ↓
Ciphertext returned
  ↓
Copy into Veilmi
  ↓
Decrypt locally
```

The **Article Name is a locator, not a secret**.

The Veilmi passphrase is shared separately and is never sent to UnVeilmi.

---

## 4. Article Names

The poster chooses the Article Name.

Examples:

```text
coffee-after-rain
did you get home
project-night-42
```

Only one active post may use the same Article Name at a time.

When that post expires and is removed, the Article Name becomes available again.

The current PoC stores Article Names directly rather than hashing them because they are designed to be searchable locators.

---

## 5. Backend API

The current backend exposes a small API:

```text
GET  /health
GET  /posts/check-name
GET  /posts/{article_name}
POST /posts
```

Its responsibilities include:

- validating request fields;
- validating the VEILMI1 envelope structure;
- recalculating storage price;
- rejecting incorrect client prices;
- checking Article Name availability;
- preventing duplicate active Article Names;
- cleaning expired records;
- reading from and writing to SQLite.

For installation and startup instructions, see:

- [Backend Setup](Set_Up_Backend.md)
- [Database Setup](Set_Up_DB.md)

---

## 6. Database Role

SQLite stores fields such as:

```text
id
article_name
ciphertext
storage_hours
price
ciphertext_size
created_at
expires_at
```

The database schema and trigger generate runtime values such as:

- `ciphertext_size`;
- `created_at`;
- `expires_at`.

The database also provides a `UNIQUE` constraint for Article Names.

Detailed database setup is documented in:

- [Database Setup](Set_Up_DB.md)

---

## 7. Trust Boundaries

### Veilmi → UnVeilmi

```text
Plaintext + passphrase
       stay in Veilmi
            │
            │ ciphertext only
            ▼
         UnVeilmi
```

### Frontend → Backend

The backend does not assume that browser-supplied values are trustworthy.

Important rules are checked again server-side.

### Backend → SQLite

The backend uses parameterized SQL queries so Article Names are treated as data rather than executable SQL.

Security details belong in:

- `Security_Model.md`
- `Auto_Testing.md`

---

## 8. Temporary Storage

UnVeilmi is designed for temporary storage only.

```text
Publish
  ↓
Active post
  ↓
Retrieve
  ↓
Expire
  ↓
Cleanup
  ↓
Article Name becomes reusable
```

The current PoC uses lazy cleanup instead of a continuously running background worker.

Expired records are removed during relevant backend operations.

Detailed pricing, storage duration, expiry, and cleanup behaviour belongs in:

- `Pricing_and_Storage.md`

---

## 9. Local Development Environment

The current Proof of Concept runs entirely on the developer's Chromebook:

```text
Frontend  → http://127.0.0.1:5500
Backend   → http://127.0.0.1:8000
Database  → backend/unveilmi.db
```

The two ports represent two separate local services:

```text
Browser
  ↓
Frontend :5500
  ↓
app.js
  ↓
Backend :8000
  ↓
SQLite
```

For setup instructions, see:

- [Frontend Setup](Set_Up_Frontend.md)
- [Backend Setup](Set_Up_Backend.md)
- [Database Setup](Set_Up_DB.md)

---

## 10. What UnVeilmi Does Not Need

The current PoC does not need:

- user accounts;
- email registration;
- password recovery;
- user profiles;
- followers or likes;
- read receipts;
- online status;
- a real payment system;
- a manual deletion API.

It is intentionally not a social network or full messaging platform.

Its purpose is narrower:

> **Temporarily store and retrieve Veilmi ciphertext.**

---

## 11. Related Documentation

| Document | Purpose |
|---|---|
| [Database Setup](Set_Up_DB.md) | Create and inspect the SQLite database |
| [Backend Setup](Set_Up_Backend.md) | Install, run, and test the FastAPI backend |
| [Frontend Setup](Set_Up_Frontend.md) | Run the local web frontend |
| [Pricing_and_Storage.md](Pricing_and_Storage.md) | Pricing, free tier, storage duration, expiry, and cleanup |
| [Security_Model.md](Security_Model.md) | Security boundaries, assumptions, limitations, and metadata concerns |
| [Auto_Testing.md]() | Availability, validation, database, pricing, and security-related tests |
| [Easter_Egg_Guide.md](Easter_Egg_Guide.md) | To continue the story of the demo video |
| [Design_Decisions.md](Design_Decisions.md) | Why the project intentionally uses this architecture |

---

## 12. Summary

The architecture is intentionally small:

```text
Veilmi
  ↓ ciphertext
UnVeilmi Frontend
  ↓ HTTP
FastAPI Backend
  ↓ SQL
SQLite
```

The central rule remains:

> **Veilmi handles the secret.  
> UnVeilmi handles the ciphertext.**
