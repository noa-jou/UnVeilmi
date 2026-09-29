# Testing

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

## 2. What the 39 Backend Checks Do

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

---

## 3. A Few Security Tests in Plain English

### CORS

CORS controls which browser origins are allowed to call the backend.

For the local PoC, the intended frontend is allowed while unrelated origins should not receive that permission.

### SQL-Injection-Style Input

The test uses an Article Name containing text similar to:

```text
' OR 1=1 --
```

The goal is not to damage the database.

It confirms that parameterized SQLite queries treat this value as ordinary text rather than executable SQL.

### Malformed Veilmi Messages

A string beginning with:

```text
VEILMI1:
```

is not automatically accepted.

The backend also checks the expected Veilmi envelope fields and sizes.

---

## 4. Backend Test Results

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

## 5. Automated Frontend Availability and Validation Test

The frontend test file is:

```text
frontend/frontend_availability_and_validation_test.html
```

It uses the browser itself as the test environment and requires **no additional testing package**.

The test page loads the real:

```text
index.html
   +
app.js
```

inside a same-origin test frame and interacts with the actual UnVeilmi frontend.

It also communicates with the real local FastAPI backend and SQLite database during the Publish → Find integration checks.

### Run the Test

Both the backend and frontend must already be running.

For full startup instructions, see:

- [Backend Setup](Set_Up_Backend.md)
- [Frontend Setup](Set_Up_Frontend.md)

The expected local services are:

```text
Frontend: http://127.0.0.1:5500
Backend:  http://127.0.0.1:8000
```

Open:

```text
http://127.0.0.1:5500/frontend_availability_and_validation_test.html
```

The test starts automatically.

To run it again, press:

```text
Run Test Again
```

A run also creates a unique Suite ID, for example:

```text
Suite ID: 10c35d4e1d
```

The Suite ID is included in temporary Article Names so repeated runs do not normally collide with each other.

### Test Data

Most frontend checks only manipulate the browser state.

The Publish → Find integration section creates one real temporary post through the normal frontend and backend flow.

That post:

- uses a unique Article Name containing the Suite ID;
- uses `1` hour of storage;
- remains in SQLite until normal expiry cleanup removes it.

Unlike the backend test suite, the frontend test does not use a special cleanup routine because UnVeilmi intentionally has no manual DELETE API.

The test also creates **synthetic structurally valid `VEILMI1` envelopes** for validation.

These test envelopes are suitable for checking the UnVeilmi frontend and backend format rules, but they are not real messages encrypted by the Veilmi Android app.

---

## 6. What the 50 Frontend Checks Do

The current frontend test contains **50 checks** in five groups:

| Group | Checks | Purpose |
|---|---:|---|
| Environment and page availability | 7 | Confirms the backend is reachable, the real frontend loads, required controls exist, navigation works, safe initial states are used, and HTML limits match the product rules. |
| Article Name validation | 5 | Checks blank input, Unicode character counting, the 50-character boundary, rejection at 51 characters, and invalidation after editing a verified name. |
| `VEILMI1` ciphertext validation | 13 | Checks malformed prefixes/payloads, JSON and required fields, version/KDF/iteration rules, salt/nonce/MAC lengths, empty ciphertext, valid envelopes, and Clear Ciphertext behaviour. |
| Storage, pricing, and state invalidation | 15 | Checks storage limits, free-tier boundaries, byte-size display, billable cases, the 8760-hour maximum, payment confirmation, and whether editing inputs correctly invalidates old state. |
| Publish and Find integration | 10 | Publishes a real temporary post, verifies form reset and duplicate-name behaviour, checks Find validation, retrieves the ciphertext, verifies exact matching, checks Copy-button state, and confirms old results are cleared after a failed search. |

### Important Boundary Checks

Some frontend checks intentionally test exact product boundaries.

For example:

```text
Article Name:
50 characters  → accepted
51 characters  → rejected
```

```text
Storage:
1 hour          → accepted
0 hours         → rejected
8760 hours      → accepted
8761 hours      → rejected
```

```text
Free tier:
≤ 1024 bytes AND ≤ 24 hours → USD 0
otherwise                   → normal price calculation
```

The test also confirms that changing previously verified data invalidates old state.

For example:

```text
Verified Article Name
        ↓
User edits Article Name
        ↓
Old verification is cleared
        ↓
Send becomes disabled
```

The same principle is tested for ciphertext, storage duration, and payment confirmation.

---

## 7. Frontend Test Results

Each frontend check produces either:

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

If one check fails, the page prints the failed check and a short explanation next to it.

For example:

```text
[PASS] Exactly 50 characters are accepted by Article Name validation
[FAIL] A 51-character Article Name is rejected
       Expected message containing "Maximum is 50".
[PASS] Editing a previously verified Article Name invalidates that verification
```

The test normally continues with the remaining checks so several problems can be seen in one run.

The summary then shows how many checks passed or failed.

### What This Frontend Test Does Not Check

The browser test deliberately does **not** claim to test everything.

It does not:

- perform a professional browser-security audit;
- perform cryptographic verification of Veilmi encryption;
- prove that synthetic test ciphertext can be decrypted by Veilmi;
- automatically test the system clipboard, because browser clipboard access can depend on user gestures and permissions;
- replace the backend security test.

For Copy actions, it instead checks that the button becomes enabled and contains the correct value to copy.

A real Veilmi encrypt → UnVeilmi → Veilmi decrypt demonstration can still be performed separately when needed.

---

## 8. Testing Summary

```text
backend_availability_and_security_test.py
        ↓
API + backend validation + database
+ pricing + expiry + security-related behaviour


frontend_availability_and_validation_test.html
        ↓
Real frontend DOM + frontend validation
+ pricing state + Publish → Find integration
```

Together, the two suites test different responsibilities of the current UnVeilmi Proof of Concept:

```text
Frontend
   ↓
FastAPI
   ↓
SQLite
```

The backend suite verifies that server-side rules remain enforced.

The frontend suite verifies that the browser interface applies its own validation correctly and can complete the expected local workflow.
