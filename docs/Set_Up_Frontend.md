# Frontend Setup

This guide explains how to open the UnVeilmi frontend and connect it to the backend.

The project uses two small local web servers:

```text
Frontend  → http://127.0.0.1:5500
Backend   → http://127.0.0.1:8000
```

Both run on the same computer.

---

## 1. Why Are There Two Ports?

A port can be thought of as a separate door on the same computer.

For example:

```text
127.0.0.1:5500
```

and:

```text
127.0.0.1:8000
```

both point to your own computer, but they lead to different programs.

In UnVeilmi:

```text
Port 5500 → Frontend
Port 8000 → Backend
```

The frontend displays the web page.

The backend handles API requests and communicates with the SQLite database.

The flow looks like this:

```text
Browser
   ↓
Frontend :5500
   ↓
app.js sends API requests
   ↓
Backend :8000
   ↓
SQLite database
```

The two ports allow the frontend and backend to run independently while still communicating with each other.

---

## 2. Start the Backend

Open the first terminal.

Go to the backend directory:

```bash
cd ~/UnVeilmi/backend
```

Activate the Python virtual environment:

```bash
source .venv/bin/activate
```

Start FastAPI:

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Keep this terminal open.

The backend is now available at:

```text
http://127.0.0.1:8000
```

---

## 3. Start the Frontend

Open a second terminal.

Go to the frontend directory:

```bash
cd ~/UnVeilmi/frontend
```

Start Python's simple local web server:

```bash
python3 -m http.server 5500
```

Keep this terminal open as well.

The frontend is now available at:

```text
http://127.0.0.1:5500
```

---

## 4. Open UnVeilmi

Open your web browser and visit:

```text
http://127.0.0.1:5500
```

You should now see the UnVeilmi frontend.

The browser loads:

```text
index.html
style.css
app.js
```

from port `5500`.

When `app.js` needs to check an Article Name, retrieve ciphertext, or create a post, it sends a request to the backend on port `8000`.

For example:

```text
Frontend
http://127.0.0.1:5500
        ↓
GET /posts/check-name
        ↓
Backend
http://127.0.0.1:8000
```

---

## 5. Why Not Open `index.html` Directly?

It is better not to open the file directly with:

```text
file:///...
```

Instead, UnVeilmi runs the frontend through a small local HTTP server.

This makes the development environment behave more like a real website and allows the frontend to communicate with the FastAPI backend more reliably.

---

## 6. Stop the Frontend

Return to the terminal running:

```bash
python3 -m http.server 5500
```

and press:

```text
Ctrl + C
```

The frontend server will stop.

The backend can be stopped separately in its own terminal.

---

## Starting UnVeilmi Again Later

You normally need two terminals.

### Terminal 1 — Backend

```bash
cd ~/UnVeilmi/backend
source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Terminal 2 — Frontend

```bash
cd ~/UnVeilmi/frontend
python3 -m http.server 5500
```

Then open:

```text
http://127.0.0.1:5500
```

in your browser.
