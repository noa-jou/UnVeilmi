# UnVeilmi

> **Hide the ciphertext somewhere else.  
> Let the everyday conversation carry only the clue.**

> **Veilmi handles the secret.  
> UnVeilmi handles the ciphertext storage.**

UnVeilmi is a Proof of Concept for a different kind of encrypted communication workflow.

If you paste a long encrypted message directly into LINE, a workplace chat, or another everyday communication tool, the visible conversation immediately looks like people are exchanging ciphertext.

UnVeilmi separates those two things.

The everyday chat carries only a short **Article Name**—or, you could say, the clue.

```text
Visible conversation
"did you get home"
        ↓
Article Name (clue)
        ↓
UnVeilmi (Find)
        ↓
VEILMI1 ciphertext
        ↓
Veilmi (Decrypt)
        ↓
Hidden plaintext
```

UnVeilmi stores and finds the ciphertext.

Veilmi encrypts and decrypts it locally.

The goal is to make encrypted communication less visually obvious by not placing the ciphertext itself inside the "normal" conversation channel.

---

## Demo

<!--
DEMO VIDEO PLACEHOLDER

Replace this block after the demo video is recorded.

Suggested caption:

"An ordinary LINE conversation hides a second conversation.
Each visible LINE message is also an UnVeilmi Article Name."
-->

The demo follows a LINE conversation between **Kate** and **Noa**.

At first, it looks completely ordinary:

```text
Kate: did you get home
Noa: yeah just got back

Kate: did you eat yet
Noa: not really hungry
```

But each visible message is also an UnVeilmi **Article Name**.

In the video:

```text
did you get home
```

is searched for in UnVeilmi.

UnVeilmi returns a ciphertext.

That ciphertext is copied into Veilmi and decrypted with the shared demo passphrase.

The hidden message is:

```text
I won the lottery!
```

The next visible LINE message:

```text
yeah just got back
```

reveals:

```text
Wait. Seriously? How much did you win?
```

And then the demo stops.

The rest of the conversation is an Easter Egg.

Want to continue the story yourself?

See:

[Easter Egg Guide](docs/Easter_Egg_Guide.md)

---

## Why Veilmi Matters

UnVeilmi does not encrypt or decrypt messages.

That is intentional.

**Veilmi** remains the tool that handles the secret locally.

```text
Plaintext + passphrase
        ↓
      Veilmi
        ↓
  VEILMI1 ciphertext
        ↓
     UnVeilmi
```

The UnVeilmi server does not need the plaintext or Veilmi passphrase.

This is one of the most important design boundaries in the project.

If you want to try the demo or use the workflow yourself, start with [Get Veilmi](https://noa-jou.github.io/Veilmi/closed-testing.html)

---

## How It Works

### Publish

```text
Write plaintext in Veilmi
        ↓
Encrypt locally
        ↓
Copy VEILMI1 ciphertext
        ↓
Open UnVeilmi
        ↓
Choose Article Name
        ↓
Choose storage duration
        ↓
Publish
```

### Find

```text
Receive Article Name
        ↓
Open UnVeilmi
        ↓
Find ciphertext
        ↓
Copy ciphertext
        ↓
Open Veilmi
        ↓
Enter shared passphrase
        ↓
Decrypt locally
```

The Article Name is only a locator / a clue.

It is not a password and should not be treated as a secret.

---

## The Bigger Idea

UnVeilmi is currently a local Proof of Concept.

But the idea is intentionally broader.

A future public instance could allow people who need this communication pattern to use UnVeilmi without running their own server.

A team or organization could also adapt the project and host its own version on infrastructure it controls.

For example, an internal deployment could look like:

```text
Existing workplace chat
        ↓
send short Article Name (clue)

--

Organization-hosted UnVeilmi
        ↓
temporary ciphertext storage that can be accessed by each intended user

--

Veilmi on each user's device
        ↓
local decryption
```

That could be useful when people need to exchange legitimate sensitive text while keeping the visible conversation channel simple and ordinary.

Examples might include:

- an internal team discussing a private draft;
- a small organization separating sensitive notes from normal chat history;
- a research group testing privacy-preserving communication workflows;
- a self-hosted environment where the organization wants control of its own ciphertext storage.

UnVeilmi is not currently a production service, and any real deployment would still need proper infrastructure, policy, security, and legal review.

But the PoC is meant to show that the communication model itself can work.

---

## Self-Hosting Vision

UnVeilmi is especially interesting as a project that can be adapted.

A developer, small team, or organization could fork the project and change things such as the hostname, storage rules, retention period, etc.

while keeping the central idea:

```text
Everyday channel: carries the locator / clue / Article Name

UnVeilmi: carries the ciphertext

Veilmi: handles the real message
```

A private deployment could run on an organization's own server rather than a public UnVeilmi instance.

However, the current repository is only a local PoC, so production deployment still requires additional work such as HTTPS, rate limiting, monitoring, abuse controls, and infrastructure hardening.

For the reasoning behind the current choices, see:
[Design Decisions — §7 Why Is the Current PoC Local?](docs/Design_Decisions.md#7-why-is-the-current-poc-local)

UnVeilmi intentionally avoids becoming a full social network or messaging platform.


---

## Current Project Structure

| Part | Current implementation |
|---|---|
| Frontend | HTML / CSS / JavaScript |
| Backend | Python / FastAPI |
| Database | SQLite |
| Environment | Local Debian environment |
| Storage | Temporary ciphertext storage |
| Payment | Simulation only |
| Deployment | Local only |
| Accounts | None |

For the full architecture, see: [Architecture](docs/Architecture.md)


---

## Quick Start

### 1. Create the Database

[Database Setup](docs/Set_Up_DB.md)

### 2. Start the Backend

[Backend Setup](docs/Set_Up_Backend.md)

### 3. Start the Frontend

[Frontend Setup](docs/Set_Up_Frontend.md)

### 4. Run the Tests

[Testing](docs/Testing.md)

### 5. Try It Yourself Manually

After completing steps 1–4, just open a browser and play with:

[http://127.0.0.1:5500](http://127.0.0.1:5500)

---

## Full Documentation List (if you really want to know more)

| Document | What it explains |
|---|---|
| [Architecture](docs/Architecture.md) | Components, Publish / Find flow, backend, database, trust boundaries, and local environment |
| [Security Model](docs/Security_Model.md) | Threat model, why the separation is safer, validation, CORS, metadata, and limitations |
| [Pricing and Storage](docs/Pricing_and_Storage.md) | Free tier, pricing formula, storage duration, expiry, cleanup, and Article Name reuse |
| [Testing](docs/Testing.md) | Automated backend and frontend development tests |
| [Database Setup](docs/Set_Up_DB.md) | Create, inspect, and test the SQLite database |
| [Backend Setup](docs/Set_Up_Backend.md) | Install dependencies and run the FastAPI backend |
| [Frontend Setup](docs/Set_Up_Frontend.md) | Run the local web frontend and connect it to the backend |
| [Design Decisions](docs/Design_Decisions.md) | Why the major product and architecture choices were made |
| [Easter Egg Guide](docs/Easter_Egg_Guide.md) | Reproduce the Kate / Noa hidden-message demo |

---

## Current Limitations !!!

The current version is a local Proof of Concept.

It does not currently provide:

- a public UnVeilmi service;
- production HTTPS deployment;
- authentication;
- rate limiting;
- abuse detection;
- production monitoring;
- real payment processing;
- complete anonymity;
- a professional security audit;
- a cryptographic audit.

The project is meant to demonstrate the architecture and inspire further development, not to claim production readiness.

---

## License

UnVeilmi is licensed under:

**GNU Affero General Public License v3.0 (AGPL-3.0)**

You are welcome to study, modify, and deploy the project.

For network-hosted modifications, AGPL-3.0 is intended to keep improvements available to the open-source community.

See the repository [LICENSE](LICENSE) file for the full license text.

---

## Author

**Noa Jou**

UnVeilmi is a companion project to Veilmi.

I hope this project can eventually become more than a local demonstration:

- a public service for people who need this communication pattern;
- a self-hosted tool for teams that want to adapt it;
- or an idea that another developer takes further.

If UnVeilmi makes you curious, please take a look at [Veilmi](https://github.com/noa-jou/Veilmi) too.
