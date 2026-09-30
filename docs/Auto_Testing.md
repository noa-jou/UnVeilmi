# Automated Testing

UnVeilmi uses two automated development-test layers:

```text
Backend availability and security test
                +
Frontend availability and validation test
```

The backend suite checks API, validation, database, pricing, expiry, and security-related behaviour.

The frontend suite loads the real `index.html` and `app.js` in the browser, then checks UI availability, frontend validation, pricing state, and the Publish → Find integration flow.

> These are development tests for the Proof of Concept.  
> They are not a professional security audit or cryptographic audit.

---

## 1. Automated Backend Test

The backend test file is:

```text
backend/backend_availability_and_security_test.py
```

It is self-contained and does **not** require `demo_seed.sql`.

The script:

- creates its own temporary test records;
- gives each run a unique Suite ID;
- continues after individual failures when possible;
- removes its own temporary records after testing.

Existing demo or user data should not be intentionally modified.

### Run the Test

Start the backend first.

For full setup instructions, see:

- [Backend Setup](Set_Up_Backend.md)

Then, in a second terminal:

```bash
cd backend
python3 backend_availability_and_security_test.py
```

A run starts with information similar to:

```text
UnVeilmi Backend Availability and Security Test
========================================================================
Backend: http://127.0.0.1:8000
Database: .../backend/unveilmi.db
Suite ID: 10c35d4e1d
```

**Suite ID** is a unique ID created for each test run. It helps the script identify its own temporary data and remove only those records after testing.

---

## 2. What the Backend Checks Do

| # | Check | Purpose |
|---:|---|---|
| 1 | Database schema | Confirms the required `posts` fields exist. |
| 2 | Backend health | Confirms FastAPI is responding. |
| 3 | Allowed CORS origin | Confirms the approved frontend may call the backend. |
| 4 | Disallowed CORS origin | Confirms an unrelated origin is not approved. |
| 5 | CORS POST preflight | Confirms the browser can prepare an approved JSON POST request. |
| 6 | Unsupported DELETE | Confirms no unintended DELETE API is exposed. |
| 7 | Unused Article Name | Confirms a new name is reported as available. |
| 8 | Empty Article Name | Confirms an empty name is rejected. |
| 9 | Article Name over 50 characters | Confirms the length limit is enforced. |
| 10 | Free-tier POST + DB trigger + response privacy | Confirms a valid free post is stored, runtime fields are generated, and ciphertext is not unnecessarily returned by POST. |
| 11 | Existing Article Name | Confirms an active name becomes unavailable. |
| 12 | Retrieve existing post | Confirms stored ciphertext is returned exactly. |
| 13 | Duplicate Article Name | Confirms a duplicate active name is rejected with `409`. |
| 14 | Incorrect client price | Confirms the backend recalculates price and rejects a wrong value without inserting a row. |
| 15 | Small ciphertext after 24 hours | Confirms it becomes billable when storage exceeds the free duration. |
| 16 | Ciphertext over 1 KB | Confirms it becomes billable even within 24 hours. |
| 17 | 8760-hour maximum | Confirms the maximum allowed duration is accepted. |
| 18 | 1-hour minimum | Confirms the minimum allowed duration is accepted. |
| 19 | Zero-hour storage | Confirms `0` hours is rejected. |
| 20 | More than 8760 hours | Confirms excessive storage duration is rejected. |
| 21 | Negative price | Confirms a negative price is rejected. |
| 22 | Long Article Name on POST | Confirms the POST endpoint also enforces the 50-character limit. |
| 23 | Missing POST field | Confirms incomplete requests are rejected. |
| 24 | Malformed JSON | Confirms invalid JSON cannot be processed as a normal request. |
| 25 | SQL-injection-style Article Name | Confirms dangerous-looking text is treated as data, not SQL code. |
| 26 | Unicode Article Name | Confirms Unicode text can be stored and retrieved correctly. |
| 27 | Supported PBKDF2 iterations | Confirms supported Veilmi iteration counts remain accepted. |
| 28 | Malformed `VEILMI1` payload | Confirms the prefix alone is not enough to pass validation. |
| 29 | Wrong Veilmi prefix | Confirms unsupported message prefixes are rejected. |
| 30 | Unsupported Veilmi version | Confirms the expected version is enforced. |
| 31 | Unsupported KDF | Confirms an unexpected key-derivation format is rejected. |
| 32 | Unsupported PBKDF2 iteration count | Confirms arbitrary iteration values are rejected. |
| 33 | Invalid salt length | Confirms the Veilmi salt size is validated. |
| 34 | Invalid nonce length | Confirms the Veilmi nonce size is validated. |
| 35 | Invalid MAC length | Confirms malformed authentication data is rejected. |
| 36 | Empty Veilmi ciphertext field | Confirms an empty encrypted payload is rejected. |
| 37 | Expired post cleanup during GET | Confirms an expired row is deleted instead of returned. |
| 38 | Expired post cleanup during name check | Confirms expiry cleanup makes the Article Name available again. |
| 39 | Reuse expired Article Name | Confirms a new post can reuse a name after the old record expires. |

For why these tests matter, see [Security Model — §5. Validation, SQL Safety, and CORS](Security_Model.md#5-validation-sql-safety-and-cors)


## 3. Backend Test Results

Each check produces:

```text
[PASS]
```

or:

```text
[FAIL]
```

An unexpected test-side problem may appear as:

```text
[ERROR]
```

### Successful Run

A successful run ends with a summary similar to:

```text
========================================================================
UnVeilmi Backend Availability and Security Test Summary
========================================================================
Total:  39
Passed: 39
Failed: 0

All checks passed.
The tested backend/API/database behaviors are working correctly.
```

### Unsuccessful Run

If a check fails, the script shows the failed test name and an explanation near that test.

For example:

```text
[PASS] Maximum 8760-hour storage duration is accepted
[FAIL] Minimum 1-hour storage contract is accepted
       storage_hours=1 should be accepted by the product contract.

[PASS] Zero-hour storage is rejected
```

The suite normally continues running the remaining checks.

An unsuccessful run ends with a summary similar to:

```text
========================================================================
UnVeilmi Backend Availability and Security Test Summary
========================================================================
Total:  39
Passed: 38
Failed: 1

One or more checks failed.
Review the failed test names and messages above.
```

The summary tells you **how many** tests failed.

The earlier `[FAIL]` or `[ERROR]` output tells you **which test** failed and why.

> Passing all checks means the behaviours covered by this suite are working as expected.  
> It does not prove that UnVeilmi is completely secure.

---

## 4. Automated Frontend Availability and Validation Test

### Run the Test

Start both the backend and frontend first.

For setup instructions, see:

- [Backend Setup](Set_Up_Backend.md)
- [Frontend Setup](Set_Up_Frontend.md)

Then open:

```text
http://127.0.0.1:5500/frontend_availability_and_validation_test.html
```

The test starts automatically.

Press:

```text
Run Test Again
```

to run it again.

Each run creates a unique Suite ID so its temporary Article Name does not normally collide with another run.

### Test Data

Most frontend checks only change browser state.

The Publish → Find integration test creates one real temporary post in SQLite. It:

- uses an Article Name beginning with `frontend-e2e-`;
- uses `1` hour of storage;
- remains until normal expiry cleanup removes it.

The test also creates synthetic, structurally valid `VEILMI1` envelopes. These are useful for checking format rules, but they are not real messages encrypted by the Veilmi Android app.

### Optional: Remove Frontend Test Data from SQLite

You normally do not need to delete the test posts manually.

If you run the frontend test many times and want to clean the database, open SQLite:

```bash
cd backend
sqlite3 unveilmi.db
```

You can first inspect all frontend automated-test records:

```sql
.headers on
.mode column

SELECT id, article_name, expires_at
FROM posts
WHERE article_name LIKE 'frontend-e2e-%';
```

If you want to remove all of them:

```sql
DELETE FROM posts
WHERE article_name LIKE 'frontend-e2e-%';
```

Check how many rows were deleted:

```sql
SELECT changes();
```

Then leave SQLite:

```sql
.quit
```

This only removes records whose Article Names begin with `frontend-e2e-`. It does not add a DELETE feature to the UnVeilmi API.

### Why Can Another HTML File Test `index.html`?

The test page does not copy the UnVeilmi interface.

Instead, it opens the real `index.html` inside itself using an **iframe**:

```text
frontend_availability_and_validation_test.html
                    ↓
                 iframe
                    ↓
               index.html
                    ↓
                  app.js
```

You can think of an iframe as one web page displayed inside another web page.

Because both pages are running from the same local website, the test page can interact directly with the real UnVeilmi page.

It can enter values, click buttons, read messages, and check whether controls are enabled, disabled, visible, or hidden.

So the test is exercising the real `index.html` and `app.js`, not a copied version of them.

---

## 5. Frontend Test Results

Each frontend check produces:

```text
[PASS]
```

or:

```text
[FAIL]
```

A successful run ends with:

```text
All 50 frontend availability and validation checks passed.
```

If a check fails, the page shows which check failed and why, then normally continues with the remaining checks.


## 6. What the Frontend Checks Do

| Group | Checks | Purpose |
|---|---:|---|
| Environment and page availability | 7 | Confirms the backend is reachable, the real frontend loads, required controls exist, navigation works, safe initial states are used, and HTML limits match the product rules. |
| Article Name validation | 5 | Checks blank input, Unicode character counting, the 50-character boundary, rejection at 51 characters, and invalidation after editing a verified name. |
| `VEILMI1` ciphertext validation | 13 | Checks malformed prefixes/payloads, JSON and required fields, version/KDF/iteration rules, salt/nonce/MAC lengths, empty ciphertext, valid envelopes, and Clear Ciphertext behaviour. |
| Storage, pricing, and state invalidation | 15 | Checks storage limits, free-tier boundaries, byte-size display, billable cases, payment confirmation, and whether editing inputs correctly invalidates old state. |
| Publish and Find integration | 10 | Publishes a real temporary post, checks duplicate-name behaviour, retrieves ciphertext by exact Article Name, checks Copy-button state, and confirms stale results are cleared after a failed search. |

The 50 checks focus on repeatable behaviour that the browser can verify automatically.


---

## 7. What to Test Manually

After the automated tests pass, manual testing is most useful for the things automation does **not** fully cover.

### What This Frontend Test Does Not Check

The automated browser test does not:

- prove that a test ciphertext can really be decrypted by Veilmi;
- fully test the system clipboard, because browser clipboard access depends on real user actions and permissions;
- judge visual quality, readability, or how natural the interface feels to a person;
- replace the backend security test, a professional security audit, or a cryptographic audit.

For Copy actions, the automated test checks that the button becomes enabled and contains the correct value to copy.

### Real Copy and Paste

Use the actual:

```text
Copy Article Name
Copy Ciphertext
```

buttons and paste their values into the next step.

The automated test can check whether those buttons contain the correct value, but browser permissions make real clipboard behaviour better suited to manual testing.

### Visual and Human Experience

Use the page normally and check things an automated assertion cannot judge well:

- whether instructions are easy to understand;
- whether validation messages are easy to notice and read;
- whether the layout still works on a smaller screen;
- whether the Publish and Find flow feels clear without reading the source code.

Automated testing is best for repeatable rules.

Manual testing is most valuable where a real person, a real clipboard, or a real Veilmi encryption/decryption step is required.

### Real Veilmi Round Trip

Use a real message encrypted by the Veilmi Android app:

```text
Veilmi encrypt
      ↓
UnVeilmi Publish
      ↓
UnVeilmi Find
      ↓
Copy Ciphertext
      ↓
Veilmi decrypt
```

Confirm that the original plaintext returns when the same passphrase is used.

This tests the real Veilmi → UnVeilmi → Veilmi workflow rather than a synthetic test envelope.


---

## 8. Testing Summary

```text
Backend test
    ↓
API + backend rules + database

Frontend test
    ↓
Real index.html + app.js
+ validation + Publish → Find
```

The two suites cover different parts of the same local workflow.

Passing them means the behaviours covered by the tests are working as expected. It does not prove that the whole system is production-ready or completely secure.


