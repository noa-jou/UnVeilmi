
# Backend Setup

This guide starts after the UnVeilmi SQLite database has already been created.

The goal is simple:

> Start the UnVeilmi backend and confirm that it is working.

---

## 1. Install Python

UnVeilmi uses Python for its backend.

Install Python, `pip`, and virtual environment support:

```bash
sudo apt install python3 python3-pip python3-venv
```

These packages provide:

- `python3` — runs the UnVeilmi backend code.
- `python3-pip` — installs additional Python packages.
- `python3-venv` — creates an isolated Python environment for this project.

Check that Python is installed:

```bash
python3 --version
```

You should see a Python version number.

---

## 2. Python Dependencies

The file:

```text
requirements.txt
```

lists the extra Python packages required by UnVeilmi.

Currently, it includes:

```text
fastapi
uvicorn[standard]
```

### FastAPI

FastAPI is the web framework used by UnVeilmi.

It allows the backend to provide API routes such as:

```text
GET /health
GET /posts/{article_name}
POST /posts
```

### Uvicorn

Uvicorn is the web server that runs the FastAPI application.

It allows your browser or frontend to connect to the UnVeilmi backend through:

```text
http://127.0.0.1:8000
```

These packages will be installed inside a virtual environment in the next step.

---

## 3. Create a Python Virtual Environment

Go to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python3 -m venv .venv
```

Activate it:

```bash
source .venv/bin/activate
```

Your terminal should now show something similar to:

```text
(.venv) user@computer:~/UnVeilmi/backend$
```

A virtual environment keeps UnVeilmi's Python packages separate from the rest of the computer.

This is important because different Python projects may require different package versions.

For example:

```text
Project A → one version of FastAPI
Project B → another version of FastAPI
```

Without a virtual environment, changing packages for one project could accidentally affect another project.

### Install the Required Packages

After activating the virtual environment, install the packages listed in `requirements.txt`:

```bash
python3 -m pip install -r requirements.txt
```

You normally only need to do this:

- the first time you create `.venv`;
- after cloning the project onto a new computer;
- after deleting and recreating `.venv`;
- when `requirements.txt` changes.

You do **not** need to reinstall the packages every time you activate the virtual environment.

As long as the `.venv` folder still exists, the installed packages remain there.

---

## 4. Start the Backend

The main backend code is stored in:

```text
main.py
```

This file contains the FastAPI application and the API routes used by UnVeilmi.

Start the backend with:

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The part:

```text
main:app
```

means:

```text
main
```

refers to:

```text
main.py
```

and:

```text
app
```

refers to the FastAPI application created inside that file:

```python
app = FastAPI(...)
```

In simple terms:

> Uvicorn opens `main.py`, finds the FastAPI application called `app`, and runs it as a web server.

The `--reload` option automatically restarts the backend when the Python code changes. This is useful during development.

---

## 5. Test the Backend

Open a web browser and visit:

```text
http://127.0.0.1:8000/health
```

You should see:

```json
{"status":"ok"}
```

If this appears, the UnVeilmi backend is running successfully.

---

## 6. Stop the Server

Return to the terminal running Uvicorn and press:

```text
Ctrl + C
```

To leave the virtual environment:

```bash
deactivate
```

---

## 7. Starting the Project Again Later

The next time you work on UnVeilmi, you do not need to recreate the virtual environment or reinstall the packages.

Go back to the backend directory:

```bash
cd backend
```

Activate the existing virtual environment:

```bash
source .venv/bin/activate
```

Then start the backend:

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

If `.venv` still exists and `requirements.txt` has not changed, that is all you need to do.

---

## 8. Run the Backend Availability and Security Test

UnVeilmi includes:

```text
backend_availability_and_security_test.py
```

This is a self-contained backend integration and security regression test.

It checks whether the FastAPI backend, API rules, Veilmi ciphertext validation, pricing logic, and SQLite database are working together correctly.

You do **not** need to run `demo_seed.sql` before running this test.

The test script creates its own temporary records, uses unique Article Names, and removes its own test data after testing. Existing demo or user data should not be intentionally modified.

> This is not a professional security audit or cryptographic audit.
>
> It is a development test suite designed to catch common backend errors, validation problems, unsafe input handling, and unexpected database behaviour.

### Before Running the Test

Keep the backend running in the first terminal:

```bash
source .venv/bin/activate

uvicorn main:app \
  --host 127.0.0.1 \
  --port 8000 \
  --reload
```

Open a second terminal and go to the `backend` directory.

Then run:

```bash
python3 backend_availability_and_security_test.py
```

---

### What Does the Test Check?

The test currently checks the following backend behaviours:

1. **Database schema**
   - Confirms that the `posts` table exists with the required fields such as `article_name`, `ciphertext`, `storage_hours`, `price`, `ciphertext_size`, `created_at`, and `expires_at`.
   - This helps detect accidental database schema changes.

2. **Backend health endpoint**
   - Calls `/health`.
   - Confirms that FastAPI is running and responding normally.

3. **Allowed CORS origin**
   - Sends a request as if it came from the UnVeilmi frontend.
   - Confirms that the approved frontend origin is allowed to communicate with the backend.

4. **Disallowed CORS origin**
   - Sends a request using an unrelated external website as the origin.
   - Confirms that the backend does not give that website CORS permission.
   - This helps prevent random websites from directly using the browser to communicate with the local API.

5. **CORS preflight request**
   - Tests the browser's `OPTIONS` request before a POST request.
   - Confirms that the browser is allowed to send JSON POST requests from the approved frontend.

6. **DELETE endpoint is unavailable**
   - Attempts to send a `DELETE` request to a post.
   - Confirms that UnVeilmi does not accidentally expose a post-deletion API that was never designed.

7. **Unused Article Name is available**
   - Checks a new Article Name.
   - Confirms that the backend reports it as available.

8. **Empty Article Name is rejected**
   - Sends an empty Article Name.
   - Confirms that the backend rejects it instead of accepting invalid data.

9. **Article Name longer than 50 characters is rejected**
   - Tests the Article Name length limit used by the application.

10. **Valid free-tier post**
    - Creates a valid Veilmi post within the free tier.
    - Confirms that the backend accepts `USD 0`.
    - Also checks that SQLite automatically generates values such as:
      - `ciphertext_size`
      - `created_at`
      - `expires_at`

11. **POST response privacy**
    - Checks that the POST response does not unnecessarily send the stored ciphertext back to the client.
    - The client already has the ciphertext, so returning it again would be unnecessary.

12. **Existing Article Name becomes unavailable**
    - Creates a post and then checks the same Article Name.
    - Confirms that an active Article Name cannot be reused.

13. **Retrieve an existing post**
    - Creates a temporary post and retrieves it through the API.
    - Confirms that the returned ciphertext exactly matches the stored ciphertext.

14. **Duplicate Article Name protection**
    - Attempts to create two active posts using the same Article Name.
    - Confirms that the second request is rejected with HTTP `409 Conflict`.

15. **Incorrect client price is rejected**
    - Deliberately sends the wrong storage price.
    - Confirms that the backend recalculates the price independently instead of trusting the frontend.
    - Also confirms that the rejected request does not create a database record.

16. **Storage longer than 24 hours is no longer free**
    - Uses a small ciphertext but stores it for more than 24 hours.
    - Confirms that the free tier ends after 24 hours.

17. **Ciphertext larger than 1 KB is no longer free**
    - Creates a ciphertext larger than 1024 bytes.
    - Confirms that large ciphertext is charged even when stored for 24 hours or less.

18. **Maximum storage duration**
    - Confirms that `8760` hours (365 days) is accepted.

19. **Minimum storage duration**
    - Confirms that `1` hour is accepted.

20. **Zero-hour storage is rejected**
    - Confirms that `0` hours is invalid.

21. **Storage above 8760 hours is rejected**
    - Tests `8761` hours.
    - Confirms that the backend enforces the maximum storage duration.

22. **Negative price is rejected**
    - Sends a negative price such as `-1`.
    - Confirms that storage prices cannot be negative.

23. **POST Article Name longer than 50 characters is rejected**
    - Tests the Article Name limit directly on the POST endpoint as well as on the availability endpoint.

24. **Missing required POST field**
    - Sends incomplete JSON, for example without `price`.
    - Confirms that FastAPI/Pydantic rejects incomplete requests.

25. **Malformed JSON**
    - Sends broken JSON syntax.
    - Confirms that the backend rejects requests that cannot be parsed correctly.

26. **SQL-injection-style Article Name**
    - Uses an Article Name containing characters such as:

      ```text
      ' OR 1=1 --
      ```

    - The test does **not** try to damage the database.
    - It checks that SQLite parameterized queries treat those characters as normal text rather than executable SQL.
    - It also confirms that the `posts` table still exists afterward.

27. **Unicode Article Name**
    - Creates an Article Name containing Unicode characters such as Chinese text.
    - Confirms that Unicode data can be stored and retrieved without being corrupted.

28. **Supported Veilmi PBKDF2 iteration counts**
    - Tests the supported Veilmi iteration values:
      - `50000`
      - `100000`
      - `600000`
    - Confirms that ciphertext created by supported Veilmi versions remains compatible with UnVeilmi.

29. **Malformed Veilmi payload**
    - Sends a value beginning with `VEILMI1:` but without a valid Veilmi envelope.
    - Confirms that simply using the correct prefix is not enough.

30. **Wrong Veilmi prefix**
    - Sends a message using the wrong format identifier, such as `VEILMI2:`.
    - Confirms that unsupported message formats are rejected.

31. **Unsupported Veilmi version**
    - Uses a valid-looking Veilmi envelope with an unsupported version number.
    - Confirms that the backend checks the Veilmi version field.

32. **Unsupported key derivation function**
    - Replaces the expected `PBKDF2-SHA256` value with an unsupported KDF.
    - Confirms that unexpected cryptographic formats are rejected.

33. **Unsupported PBKDF2 iteration count**
    - Uses an iteration count that Veilmi does not support.
    - Confirms that arbitrary values are not accepted.

34. **Invalid salt length**
    - Creates a Veilmi envelope whose salt has the wrong number of bytes.
    - Confirms that the backend validates the expected Veilmi structure.

35. **Invalid nonce length**
    - Creates a Veilmi envelope with an invalid nonce size.
    - Confirms that malformed encryption metadata is rejected.

36. **Invalid authentication tag / MAC length**
    - Creates a Veilmi envelope with an invalid authentication field length.
    - Confirms that malformed message authentication data is rejected.

37. **Empty encrypted ciphertext field**
    - Creates a Veilmi envelope with no encrypted message bytes.
    - Confirms that an otherwise valid-looking empty ciphertext is rejected.

38. **Expired post cleanup during GET**
    - Creates a test record and manually marks it as expired.
    - Attempts to retrieve it.
    - Confirms that the backend deletes the expired record and returns `404`.

39. **Expired post cleanup during Article Name check**
    - Marks a test post as expired and checks its Article Name.
    - Confirms that the expired record is removed and that the Article Name becomes available again.

40. **Reuse an expired Article Name**
    - Creates an expired record and then publishes a new post using the same Article Name.
    - Confirms that expired names can safely be reused.

---

### Understanding Some of the Security Tests

Some of these tests may look unusual at first.

For example:

```text
' OR 1=1 --
```

is a common SQL-injection-style string.

A badly written SQL query might accidentally interpret part of this text as SQL code.

UnVeilmi uses parameterized SQLite queries, so the Article Name should be treated only as data.

The test therefore checks:

```text
Dangerous-looking text
        ↓
Backend
        ↓
SQLite treats it as normal text
        ↓
Database structure remains unchanged
```

The CORS tests check a different type of protection.

CORS controls which websites a browser is allowed to connect to on behalf of a user.

For UnVeilmi, the intended local frontend origins are allowed, while unrelated websites should not receive permission.

The malformed Veilmi tests are mainly **input validation tests**.

They confirm that the backend does not accept something merely because it looks approximately like Veilmi ciphertext.

The structure must still satisfy the expected Veilmi format.

---

### Test Data Safety

The test suite does not depend on `demo_seed.sql`.

Every test run creates a unique prefix similar to:

```text
backend-security-a1b2c3d4e5-...
```

This allows the script to identify its own temporary records.

After the tests finish, it deletes only records created by that test run.

Existing UnVeilmi posts and demo data should remain untouched.

---

### Test Results

Each test produces either:

```text
[PASS]
```

or:

```text
[FAIL]
```

A successful run will end with a summary similar to:

```text
========================================================================
UnVeilmi Backend Availability and Security Test Summary
========================================================================
Total:  40
Passed: 40
Failed: 0

All checks passed.
The tested backend/API/database behaviors are working correctly.
```

If a test fails, the script continues running the remaining tests whenever possible.

This makes it easier to see several problems in one test run instead of fixing them one at a time.

> Passing this test suite does not prove that UnVeilmi is completely secure.
>
> It means that the specific backend, validation, database, pricing, expiry, and security-related behaviours covered by these tests are working as expected.

---

### If a Test Fails

If one test fails, the script will show the name of the failed test immediately and print a short explanation underneath it.

For example:

```text
[PASS] Backend health endpoint
[PASS] Allowed frontend CORS origin
[FAIL] Minimum 1-hour storage contract is accepted
       storage_hours=1 should be accepted by the product contract.
       If this fails with 422, check whether PostCreate uses
       Field(gt=1) instead of Field(ge=1).

[PASS] Zero-hour storage is rejected
[PASS] Negative price is rejected
```

The test suite normally continues running the remaining checks, so one failure does not hide other possible problems.

An unsuccessful run will end with a summary similar to:

```text
========================================================================
UnVeilmi Backend Availability and Security Test Summary
========================================================================
Total:  40
Passed: 39
Failed: 1

One or more checks failed.
Review the failed test names and messages above.
```

The summary tells you how many tests failed, while the earlier `[FAIL]` or `[ERROR]` messages show exactly which checks caused the problem.

`[FAIL]` usually means that the backend returned a result that did not match the expected behaviour.

`[ERROR]` usually means that something unexpected happened while the test itself was running, such as a Python exception, database problem, or connection issue.
