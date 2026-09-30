# Design Decisions

This document explains **why UnVeilmi is designed this way**.

It intentionally avoids repeating implementation details. For exact system behaviour, setup steps, security rules, pricing, and testing, follow the linked documents in each section.

---

## 1. Why Keep Veilmi and UnVeilmi Separate?

### Decision

Veilmi handles local encryption and decryption. UnVeilmi remains a separate service for temporary ciphertext storage and retrieval.

### Why

Keeping them separate preserves an important property of Veilmi: it does not need a network connection to encrypt or decrypt.

It also means Veilmi can continue to work even if UnVeilmi changes, fails, or is never publicly deployed.

### Trade-off

Users must move ciphertext between two tools, but the boundary between secret handling and network storage stays clearer.

See:

- [Architecture — §1 Main Components](Architecture.md#1-main-components)
- [Security Model — §1 Why This Design Is Safer](Security_Model.md#1-why-this-design-is-safer)

---

## 2. Why Is the Article Name a Locator Instead of a Secret?

### Decision

The Article Name is used to find ciphertext. It is not a password or decryption secret.

### Why

A locator and a secret have different jobs. Keeping those jobs separate makes the system easier to understand and avoids treating the Article Name as part of the confidentiality model.

For the same reason, the current PoC stores Article Names directly rather than hashing them.

### Trade-off

Someone who knows or guesses an active Article Name may retrieve its ciphertext. Protecting the plaintext still depends on the Veilmi secret.

See:

- [Architecture — §4 Article Names](Architecture.md#4-article-names)
- [Security Model — §3 Article Name Is a Locator, Not a Password](Security_Model.md#3-article-name-is-a-locator-not-a-password)

---

## 3. Why Are There No Accounts?

### Decision

The current PoC does not use user accounts, profiles, email registration, password recovery, or personal post history.

### Why

Those features would introduce identity data, authentication, recovery flows, and authorization rules that are not required to demonstrate the core idea.

UnVeilmi only needs to show that Veilmi ciphertext can be stored temporarily and retrieved later without giving the storage service the plaintext or Veilmi passphrase.

### Trade-off

There is no account-based history or recovery system. Users must keep track of the Article Names they choose to share.

See:

- [Architecture — §10 What UnVeilmi Does Not Need](Architecture.md#10-what-unveilmi-does-not-need)
- [Security Model — §2 What UnVeilmi Knows](Security_Model.md#2-what-unveilmi-knows)

---

## 4. Why Temporary Storage Instead of Permanent Storage?

### Decision

Posts expire instead of becoming permanent cloud storage. The current PoC also does not provide manual deletion.

### Why

Temporary storage fits the intended purpose of UnVeilmi: store ciphertext long enough for retrieval, then let it leave the active database.

A manual-delete feature would also require some way to decide who is allowed to delete a post. Without accounts, that would introduce another ownership mechanism that the current PoC does not need.

### Trade-off

The current design uses lazy cleanup, so an expired record may remain until relevant backend activity triggers its removal rather than disappearing exactly at the expiry second.

See:

- [Pricing and Storage — §6 Temporary Storage Lifecycle](Pricing_and_Storage.md#6-temporary-storage-lifecycle)
- [Pricing and Storage — §7 How Expired Data Is Removed](Pricing_and_Storage.md#7-how-expired-data-is-removed)

---

## 5. Why Does the Backend Recheck the Frontend?

### Decision

The frontend provides validation and price feedback, but the backend checks important rules again before accepting a request.

### Why

The browser is controlled by the user. Frontend JavaScript and form values can be modified, and the API can be called without using the normal interface.

Frontend validation therefore improves user experience, but it cannot be the final authority for server-side rules.

### Trade-off

Some validation logic exists in both frontend and backend. That duplication is intentional because the two layers have different responsibilities.

See:

- [Security Model — §4 Where the System Stops Trusting Input](Security_Model.md#4-where-the-system-stops-trusting-input)
- [Pricing and Storage — §4 Frontend Quote and Backend Verification](Pricing_and_Storage.md#4-frontend-quote-and-backend-verification)
- [Auto Testing — §2 What the Backend Checks Do](Auto_Testing.md#2-what-the-backend-checks-do)

---

## 6. Why Simulate Payment Instead of Processing Real Money?

### Decision

The PoC calculates a demonstration price but does not process real payments.

### Why

Pricing is included to demonstrate a possible storage model based on ciphertext size and storage duration.

Real payment processing would add billing accounts, refunds, financial records, tax handling, and payment-provider integration. None of those are required to demonstrate the storage design.

### Trade-off

The current project can demonstrate pricing behaviour, but not a real commercial transaction.

See:

- [Pricing and Storage — §3 Pricing Formula](Pricing_and_Storage.md#3-pricing-formula)
- [Pricing and Storage — §5 Payment Simulation](Pricing_and_Storage.md#5-payment-simulation)

---

## 7. Why Is the Current PoC Local?

### Decision

The current UnVeilmi backend and frontend run locally on the developer's computer.

### Why

The first goal is to prove that the architecture and workflow work together.

A local environment is enough to demonstrate the frontend, backend, database, validation, storage, retrieval, and expiry behaviour without first adding production infrastructure.

### Trade-off

The project demonstrates the design, not production readiness. A real public deployment would require additional infrastructure and security work.

See:

- [Architecture — §9 Local Development Environment](Architecture.md#9-local-development-environment)
- [Security Model — §9 Current PoC Limits](Security_Model.md#9-current-poc-limits)
- [README.md — § Current Limitations](../README.md#current-limitations)

---

## 8. Why Keep the Project Small?

### Decision

UnVeilmi focuses on one job:

> **Temporarily store and retrieve Veilmi ciphertext.**

### Why

Every additional feature creates something else that must be designed, secured, tested, and maintained.

Keeping the PoC small makes it easier to evaluate the core questions: whether ciphertext can be stored without plaintext, retrieved by Article Name, protected by backend-enforced rules, and removed from the active database after expiry.

### Trade-off

UnVeilmi intentionally does less than a full messaging or social platform. That narrower scope is part of the design.

See:

- [Architecture — §10 What UnVeilmi Does Not Need](Architecture.md#10-what-unveilmi-does-not-need)
- [README.md — § Current Limitations](../README.md#current-limitations)

---

## 9. Why AGPL-3.0?

### Decision

UnVeilmi uses the GNU Affero General Public License v3.0.

### Why

UnVeilmi is network-oriented software. AGPL-3.0 fits the project's goal of allowing people to study, modify, and deploy it while requiring source availability in situations covered by the license, including certain modified network-hosted versions.

### Trade-off

Anyone adapting or deploying the project needs to understand and follow the license obligations that apply to their use.

See:

- [LICENSE](../LICENSE)
