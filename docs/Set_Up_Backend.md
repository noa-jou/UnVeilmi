
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

## 8. Run the Backend Smoke Test

UnVeilmi includes:

```text
backend_smoke_test.py
```

This script checks that the backend, API, and SQLite database are working together correctly.

Keep the backend running in the first terminal.

Open a second terminal, go to the `backend` directory, and run:

```bash
python3 backend_smoke_test.py
```

The script automatically checks:

1. **Health check** — confirms that FastAPI is running.
2. **Article Name availability** — confirms that used and unused Article Names are detected correctly.
3. **Retrieve post** — confirms that an existing ciphertext can be returned through the API.
4. **Create a valid Veilmi post** — confirms that a valid Veilmi ciphertext can be inserted and that runtime values such as `ciphertext_size`, `created_at`, and `expires_at` are generated.
5. **Reject malformed Veilmi ciphertext** — confirms that invalid or malformed Veilmi messages are rejected by the backend.
6. **Expired post cleanup** — confirms that expired posts are removed and cannot be retrieved.

If everything is working correctly, the output should look similar to:

```text
UnVeilmi Backend Smoke Test
==============================
[PASS] 1. Backend health check
[PASS] 2. Article Name availability checks
[PASS] 3. Retrieve an existing post
[PASS] 4. Create a valid Veilmi post
[PASS] 5. Reject malformed Veilmi ciphertext
[PASS] 6. Expired post cleanup
==============================
All 6 backend checks passed.
UnVeilmi Backend v1 is working correctly.
```

The smoke test creates temporary test records and removes them automatically after testing.
