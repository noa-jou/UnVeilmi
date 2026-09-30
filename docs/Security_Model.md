# Security Model

> **Veilmi handles the secret.  
> UnVeilmi handles the ciphertext.**

UnVeilmi follows one simple security idea:

> **The server should not need the information required to read the message.**

Veilmi handles encryption and decryption locally. UnVeilmi receives the encrypted text, stores it temporarily, and returns it when the correct Article Name is requested.

For the complete system flow, see:

- [Architecture — §2 Publish Flow](Architecture.md#2-publish-flow)
- [Architecture — §3 Find Flow](Architecture.md#3-find-flow)

---

## 1. Why This Design Is Safer

Suppose someone copies or steals the UnVeilmi SQLite database.

They might obtain something like:

```text
Article Name: coffee-after-rain
Ciphertext:   VEILMI1:AJ83kd92...
Size:         5529 bytes
Expires at:   ...
```

**Ciphertext** simply means encrypted text.

The database is not designed to contain the original message:

```text
Meet me tomorrow at 7 PM.
```

and it is not designed to contain the Veilmi passphrase.

So the database alone should not directly reveal what the stored messages say.

```text
If plaintext were stored:

Database stolen
      ↓
Message content exposed


UnVeilmi:

Database stolen
      ↓
Ciphertext + metadata exposed
      ↓
Plaintext still requires the Veilmi secret
```

This reduces the damage of a database leak because the encrypted message and the secret needed to read it are kept in different places.

However, stolen ciphertext is **not harmless**.

For example, a weak or exposed passphrase could still put the message at risk.

The security goal is therefore not:

> “A stolen database can never be decrypted.”

The more accurate goal is:

> **Stealing the UnVeilmi database should not, by itself, provide the plaintext or Veilmi passphrase.**

The database fields used by the current architecture are described in [Architecture — §6 Database Role](Architecture.md#6-database-role).

---

## 2. What UnVeilmi Knows

UnVeilmi needs enough information to store and retrieve a temporary post.

It can know things such as:

```text
Article Name
ciphertext
ciphertext size
storage duration
price
creation time
expiry time
```

It does not need:

```text
plaintext
Veilmi passphrase
user account
recipient identity
```

This is an example of **data minimisation**: do not collect information the service does not need for its job.

The wider division of responsibility between Veilmi, the frontend, backend, and database is listed in [Architecture — §1 Main Components](Architecture.md#1-main-components).

---

## 3. Article Name Is a Locator, Not a Password

The Article Name tells UnVeilmi **which ciphertext to return**.

It is not intended to protect the message.

```text
Article Name
     ↓
finds ciphertext


Veilmi passphrase
     ↓
protects plaintext
```

Someone who knows or guesses an active Article Name may be able to retrieve its ciphertext.

That is expected behaviour.

They should still need the Veilmi secret to turn that ciphertext back into meaningful plaintext.

For the exact retrieval flow and Article Name rules, see:

- [Architecture — §3 Find Flow](Architecture.md#3-find-flow)
- [Architecture — §4 Article Names](Architecture.md#4-article-names)

---

## 4. Where the System Stops Trusting Input

A **trust boundary** is simply a point where information moves from one part of the system to another and should not automatically be trusted.

UnVeilmi has three important boundaries:

```text
Veilmi
   ↓ ciphertext

Frontend
   ↓ browser request

Backend
   ↓ database query

SQLite
```

The detailed architecture for these three boundaries is already documented in [Architecture — §7 Trust Boundaries](Architecture.md#7-trust-boundaries).

From a security point of view, the most important rule is:

> **The frontend is not the final authority.**

A user controls their own browser. They can change JavaScript, edit form values, or skip the frontend and call the API directly.

That is why important rules are checked again by the backend.

One concrete example is pricing: the frontend shows the user a quote, but the backend calculates the price again before accepting the post.

See [Pricing and Storage — §4 Frontend Quote and Backend Verification](Pricing_and_Storage.md#4-frontend-quote-and-backend-verification).

---

## 5. Validation, SQL Safety, and CORS

These terms sound more complicated than the ideas behind them.

### Validation

**Validation** means checking whether incoming data follows the rules expected by the application.

For example, the backend checks Article Names, storage values, prices, and whether a submitted `VEILMI1` value has the expected structure.

The exact cases are already documented and tested in:

- [Auto Testing — §2 What the Backend Checks Do](Auto_Testing.md#2-what-the-backend-checks-do)
- [Auto Testing — §7 What the Frontend Checks Do](Auto_Testing.md#7-what-the-frontend-checks-do)

There is no need to repeat the individual validation rules here.

### Parameterized SQL

**Parameterized SQL** means user text is passed to the database as **data**, instead of being pasted directly into an SQL command.

This matters because an Article Name could contain suspicious-looking text such as:

```text
' OR 1=1 --
```

UnVeilmi should treat that as an Article Name, not as a database instruction.


### CORS

**CORS** is a browser permission rule.

For the local PoC, it helps control which browser origins are allowed to call the backend.

It does **not** mean the API is authenticated.

A non-browser program can still send requests directly to the backend, which is another reason server-side validation is necessary.

---

## 6. Temporary Storage Also Limits Exposure

UnVeilmi is designed for temporary storage rather than permanent message history.

This does not make stored ciphertext secret, but it reduces how long old records are intended to remain in the active database.

The complete lifecycle is already documented in:

- [Pricing and Storage — §6 Temporary Storage Lifecycle](Pricing_and_Storage.md#6-temporary-storage-lifecycle)
- [Pricing and Storage — §7 How Expired Data Is Removed](Pricing_and_Storage.md#7-how-expired-data-is-removed)

The current PoC uses **lazy cleanup**, meaning expired records are removed during relevant backend activity instead of by a continuously running cleanup service.

After cleanup, an Article Name can be used again as described in [Pricing and Storage — §8 Article Name Reuse](Pricing_and_Storage.md#8-article-name-reuse).

This is a retention rule, not a claim of forensic secure deletion.

---

## 7. Threat Model

A **threat model** is a short list of things that could go wrong and how the design responds.

| What could happen? | What UnVeilmi currently does |
|---|---|
| The database is copied or stolen | The database contains ciphertext and metadata, but is not designed to contain the plaintext or Veilmi passphrase. |
| A modified client sends the wrong price | The backend recalculates the price. |
| A client sends malformed `VEILMI1` data | The backend validates the expected format before storage. |
| An Article Name contains SQL-like text | Parameterized SQL keeps the value as data rather than executable SQL. |
| Someone guesses an Article Name | They may retrieve the ciphertext, but the Article Name is not the decryption secret. |
| An expired post is requested | Expired records are cleaned during relevant backend operations. |
| An unrelated website tries to use the local API through a browser | CORS restricts which browser origins receive permission. |

The automated evidence for these behaviours is documented in [Auto Testing — §2 What the 39 Backend Checks Do](Auto_Testing.md#2-what-the-39-backend-checks-do).

---

## 8. What Encryption Does Not Hide

Encryption protects the **content** of the message.

It does not automatically hide all information surrounding the message.

For example, a future public service could still expose **metadata**.

**Metadata** means information about the communication rather than the plaintext itself, such as:

```text
IP address
request time
ciphertext size
storage duration
Article Name
access pattern
```

Because of this, UnVeilmi does **not** claim to be:

```text
anonymous
untraceable
metadata-free
impossible to monitor
```

A more accurate claim is:

> **UnVeilmi is designed so the storage service does not need the plaintext or Veilmi passphrase.**

That is a smaller claim, but it matches the architecture much better.

---

## 9. Current PoC Limits

The current project is a local Proof of Concept, not a production internet service.

Its current environment is documented in [Architecture — §9 Local Development Environment](Architecture.md#9-local-development-environment).

The frontend and backend currently run locally on:

```text
127.0.0.1
```

The two local services and ports are explained for beginners in [Frontend Setup — §1 Why Are There Two Ports?](Set_Up_Frontend.md#1-why-are-there-two-ports).

The PoC does not currently claim to provide production protections such as:

```text
public HTTPS deployment
authentication
rate limiting
abuse detection
production monitoring
complete anonymity
```

Its automated tests are also development tests, not a professional security or cryptographic audit.

For the specific limits of the browser test, see [Auto Testing — §6 Frontend Test Results → What This Frontend Test Does Not Check](Auto_Testing.md#what-this-frontend-test-does-not-check).

Security still depends on things outside UnVeilmi, especially:

```text
the strength of the Veilmi passphrase
how that passphrase is shared
the security of the user's device
the security of any future public server
```

---

The central rules remain:

> **The Article Name locates the ciphertext.  
> The Veilmi passphrase protects the plaintext.**

> **Veilmi handles the secret.  
> UnVeilmi handles the ciphertext.**
