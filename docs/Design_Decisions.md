# Design Decisions

This document explains **why UnVeilmi is designed this way**.

The main README should stay easy to scan. Detailed setup, architecture, testing, and security explanations live in their own documents.

---

## 1. Why Keep Veilmi and UnVeilmi Separate?

### Decision

Veilmi stays focused on local encryption and decryption.

UnVeilmi is a separate service for temporary ciphertext storage and retrieval.

```text
Veilmi
handles the secret

UnVeilmi
handles the ciphertext
```

### Why

Keeping the two responsibilities separate preserves an important property of Veilmi:

> Veilmi does not need a network connection to encrypt or decrypt.

UnVeilmi can change, fail, or never be publicly deployed, while Veilmi still works on its own.

### Trade-off

The user has to move ciphertext between two tools, but the security boundary stays much clearer.

See:

- [Architecture — §1 Main Components](Architecture.md#1-main-components)
- [Security Model — §1 Why This Design Is Safer](Security_Model.md#1-why-this-design-is-safer)

---

## 2. Why Is the Article Name a Locator Instead of a Secret?

### Decision

The Article Name is only used to find ciphertext.

It is **not a password**.

```text
Article Name
     ↓
find ciphertext

Passphrase
     ↓
unlock plaintext
```

### Why

This keeps the system easy to understand and avoids mixing two different jobs.

Because the Article Name is not part of the confidentiality model, the current PoC stores it directly instead of hashing it.

### Trade-off

Someone who guesses an active Article Name may be able to retrieve its ciphertext.

That is acceptable because the ciphertext should still require the Veilmi secret before it becomes readable plaintext.

See:

- [Architecture — §4 Article Names](Architecture.md#4-article-names)
- [Security Model — §3 Article Name Is a Locator, Not a Password](Security_Model.md#3-article-name-is-a-locator-not-a-password)

---

## 3. Why Are There No Accounts?

### Decision

The current PoC has no:

```text
accounts
email registration
profiles
password recovery
personal post history
```

### Why

UnVeilmi is not trying to become a social network or full messaging platform.

Accounts would add identity data, password handling, recovery flows, and authorization rules that are not needed for the core idea.

The project only needs to prove that ciphertext can be stored temporarily and retrieved later without giving the server the plaintext or Veilmi passphrase.

### Trade-off

There is no account-based history or recovery system.

Users must keep track of the Article Names they choose to share.

See:

- [Architecture — §10 What UnVeilmi Does Not Need](Architecture.md#10-what-unveilmi-does-not-need)
- [Security Model — §2 What UnVeilmi Knows](Security_Model.md#2-what-unveilmi-knows)

---

## 4. Why Temporary Storage?

### Decision

Posts expire instead of becoming permanent cloud storage.

### Why

The intended flow is small:

```text
publish
   ↓
retrieve
   ↓
expire
```

Temporary storage limits how long old ciphertext and metadata are intended to remain active.

The current PoC uses **lazy cleanup**, so expired records are removed during normal backend activity rather than by a separate background service.

### Why No Manual Delete?

A manual-delete feature would create another question:

> Who is allowed to delete the post?

Without accounts, that would require another ownership mechanism such as a deletion token.

For this PoC, automatic expiry keeps the design simpler.

### Trade-off

Expired records are cleaned during relevant backend activity, not exactly at the expiry second.

See:

- [Pricing and Storage — §6 Temporary Storage Lifecycle](Pricing_and_Storage.md#6-temporary-storage-lifecycle)
- [Pricing and Storage — §7 How Expired Data Is Removed](Pricing_and_Storage.md#7-how-expired-data-is-removed)

---

## 5. Why Does the Backend Recheck the Frontend?

### Decision

The frontend can validate inputs and calculate a quote, but the backend checks important rules again.

### Why

The browser belongs to the user.

A user can:

```text
edit JavaScript
change form values
use developer tools
call the API directly
```

So frontend checks are useful for user experience, but they cannot be the final authority.

For example:

```text
Frontend calculates price
        ↓
Backend recalculates price
        ↓
Mismatch?
        ↓
Reject
```

### Trade-off

Some validation logic exists in both frontend and backend.

That duplication is intentional because the two layers have different responsibilities.

See:

- [Pricing and Storage — §4 Frontend Quote and Backend Verification](Pricing_and_Storage.md#4-frontend-quote-and-backend-verification)
- [Security Model — §4 Where the System Stops Trusting Input](Security_Model.md#4-where-the-system-stops-trusting-input)
- [Auto Testing — §2 What the 39 Backend Checks Do](Auto_Testing.md#2-what-the-39-backend-checks-do)

---

## 6. Why Simulate Payment?

### Decision

The PoC calculates a demonstration price but does not process real money.

### Why

The goal is to demonstrate a resource-based storage model:

```text
ciphertext size
      ×
storage duration
      ↓
estimated price
```

Real payments would add unrelated work such as billing accounts, refunds, financial records, tax handling, and payment-provider integration.

None of that is required to prove the storage idea.

### Trade-off

The PoC demonstrates pricing behaviour, not a real commercial transaction.

See:

- [Pricing and Storage — §3 Pricing Formula](Pricing_and_Storage.md#3-pricing-formula)
- [Pricing and Storage — §5 Payment Simulation](Pricing_and_Storage.md#5-payment-simulation)

---

## 7. Why Is the Current PoC Local?

### Decision

The current backend runs locally on the developer's computer.

### Why

The first goal is to prove the architecture, not to operate a public service.

A local environment is enough to demonstrate:

```text
Browser
   ↓
Frontend
   ↓
FastAPI
   ↓
SQLite
```

without immediately adding cloud hosting, domains, HTTPS certificates, monitoring, or public abuse handling.

### Trade-off

The project demonstrates architecture and security design, not production readiness.

See:

- [Architecture — §9 Local Development Environment](Architecture.md#9-local-development-environment)
- [Security Model — §9 Current PoC Limits](Security_Model.md#9-current-poc-limits)

---

## 8. Why Keep the Project Small?

### Decision

UnVeilmi focuses on one job:

> **Temporarily store and retrieve Veilmi ciphertext.**

### Why

Every extra feature creates another thing that must be designed, secured, tested, and maintained.

Features such as accounts, files, comments, permanent history, and real payments would expand the project far beyond the core experiment.

A small PoC keeps the important questions visible:

```text
Can the server store ciphertext without needing plaintext?
Can another user retrieve it by Article Name?
Can the backend enforce its own rules?
Can expired data leave the active database?
```

### Trade-off

UnVeilmi intentionally does less than a full messaging service.

That is part of the design, not a missing social platform.

See:

- [Architecture — §10 What UnVeilmi Does Not Need](Architecture.md#10-what-unveilmi-does-not-need)
- [README.md - Current Limitations](## ./README.md#Current Limitations !!!)

---

## 9. Why AGPL-3.0?

### Decision

UnVeilmi uses the GNU Affero General Public License v3.0.

### Why

UnVeilmi is network-oriented software.

AGPL-3.0 fits the goal of allowing people to study, modify, and deploy the project while encouraging modified network-hosted versions to keep their source available to the community.

---

## 10. Overall Design Principle

Most decisions in UnVeilmi come from the same rule:

> **Do the smallest thing necessary to demonstrate the idea clearly.**

That leads to:

```text
local encryption
      ↓
temporary ciphertext storage
      ↓
simple Article Name lookup
      ↓
no account system
      ↓
backend-enforced rules
      ↓
automatic expiry
```

For implementation details:

| Question | Document |
|---|---|
| How is the system connected? | [Architecture](Architecture.md) |
| Why is the security model safer? | [Security Model](Security_Model.md) |
| How do pricing and expiry work? | [Pricing and Storage](Pricing_and_Storage.md) |
| How is the system tested? | [Auto_Testing](Auto_Testing.md) |
| How do I run the project? | [DB Setup](Set_Up_DB.md) / [Backend Setup](Set_Up_Backend.md) / [Frontend Setup](Set_Up_Frontend.md) |
| How do I recreate the demo Easter Egg? | [Easter Egg Guide](Easter_Egg_Guide.md) |
