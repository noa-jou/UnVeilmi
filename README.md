# UnVeilmi

> **Hide the ciphertext somewhere else.  
> Let the everyday conversation carry only the clue.**

> **Veilmi handles the secret.  
> UnVeilmi handles the ciphertext.**

UnVeilmi is a Proof of Concept for a different kind of encrypted communication workflow.

If you paste a long encrypted message directly into LINE, a workplace chat, or another everyday communication tool, the visible conversation immediately looks like people are exchanging ciphertext.

UnVeilmi separates those two things.

The everyday chat carries only a short **Article Name**.

UnVeilmi stores the ciphertext separately.

Veilmi decrypts it locally.

```text
Visible conversation
"did you get home"
        ↓
Article Name
        ↓
UnVeilmi
        ↓
VEILMI1 ciphertext
        ↓
Veilmi
        ↓
Hidden plaintext
```

The goal is not to pretend encryption does not exist.

The goal is to avoid placing the obvious ciphertext itself inside the normal conversation channel.

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

is searched in UnVeilmi.

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

## Why UnVeilmi Exists

Veilmi already solves one part of the problem:

> Encrypt and decrypt text locally, without needing an account or network connection.

But there is still a practical question:

> **Where should the ciphertext go?**

Sending the ciphertext directly through an ordinary chat works, but it also makes the encrypted communication visually obvious.

UnVeilmi proposes another pattern:

```text
Normal chat
   ↓
short locator only

UnVeilmi
   ↓
temporary ciphertext storage

Veilmi
   ↓
local decryption
```

This creates a clean separation:

> **The Article Name locates the ciphertext.  
> The Veilmi passphrase protects the plaintext.**

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
short Article Name

Organization-hosted UnVeilmi
        ↓
temporary ciphertext

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

If you want to try the demo or use the workflow yourself, start with Veilmi:

[Get Veilmi](https://noa-jou.github.io/Veilmi/closed-testing.html)

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

The Article Name is only a locator.

It is not a password and should not be treated as a secret.

For the full architecture, see:

[Architecture](docs/Architecture.md)

---

## Current Proof of Concept

| Part | Current implementation |
|---|---|
| Frontend | HTML / CSS / JavaScript |
| Backend | Python / FastAPI |
| Database | SQLite |
| Environment | Local Chromebook Debian environment |
| Storage | Temporary ciphertext storage |
| Payment | Simulation only |
| Deployment | Local only |
| Accounts | None |

The current services run locally at:

```text
Frontend → http://127.0.0.1:5500
Backend  → http://127.0.0.1:8000
```

This is not yet a public UnVeilmi service.

---

## Core Features

- Publish Veilmi ciphertext without putting that ciphertext directly in the visible chat.
- Use an ordinary-looking Article Name as a locator.
- Retrieve ciphertext by exact Article Name.
- Keep plaintext encryption and decryption inside Veilmi.
- Store ciphertext temporarily instead of permanently.
- Reuse an Article Name after the old post expires.
- Validate the expected `VEILMI1` structure.
- Recalculate storage price on the backend instead of trusting the browser.
- Run automated backend and frontend regression tests.
- Operate without user accounts or personal profiles.

UnVeilmi intentionally avoids becoming a full social network or messaging platform.

Its job is much smaller:

> **Temporarily store and retrieve Veilmi ciphertext.**

---

## Self-Hosting Vision

UnVeilmi is especially interesting as a project that can be adapted.

A developer, small team, or organization could fork the project and change things such as:

```text
hostname
storage rules
retention period
UI
pricing model
deployment environment
```

while keeping the central idea:

```text
Everyday channel
carries the locator

UnVeilmi
carries the ciphertext

Veilmi
reveals the message
```

A private deployment could run on an organization's own server rather than a public UnVeilmi instance.

The current repository is only a local PoC, so production deployment still requires additional work such as HTTPS, rate limiting, monitoring, abuse controls, and infrastructure hardening.

For the reasoning behind the current choices, see:

[Design Decisions](docs/Design_Decisions.md)

---

## Security Idea

UnVeilmi is designed so the storage service does not need the information required to read the message.

If the SQLite database is copied, it may expose:

```text
Article Name
ciphertext
ciphertext size
timestamps
storage metadata
```

but it is not designed to contain:

```text
plaintext
Veilmi passphrase
```

That means stealing the UnVeilmi database alone should not directly reveal what the encrypted messages say.

This is not the same as complete anonymity or perfect security.

A public network service could still expose metadata such as IP addresses, request times, message sizes, and access patterns.

For the full threat model and limitations, see:

[Security Model](docs/Security_Model.md)

---

## Pricing and Temporary Storage

The current PoC includes a demonstration pricing model:

```text
ciphertext size
      ×
storage duration
```

A post is free when:

```text
ciphertext size <= 1024 bytes
AND
storage duration <= 24 hours
```

Otherwise, the demonstration price is based on:

```text
USD 1 per KB-day
```

No real payment is processed.

Posts are temporary.

Expired records are removed during relevant backend activity.

For the full lifecycle and formula, see:

[Pricing and Storage](docs/Pricing_and_Storage.md)

---

## Testing

UnVeilmi currently has two automated development-test layers:

```text
backend_availability_and_security_test.py
        ↓
39 backend checks


frontend_availability_and_validation_test.html
        ↓
50 frontend checks
```

The tests cover things such as:

- API availability;
- frontend validation;
- backend validation;
- Article Name rules;
- VEILMI1 structure;
- pricing;
- expiry;
- SQL-injection-style input handling;
- CORS behaviour;
- Publish → Find integration.

These are development regression tests, not a professional security audit or cryptographic audit.

See:

[Testing](docs/Testing.md)

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

---

## Documentation

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

## Current Limitations

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

See the repository `LICENSE` file for the full license text.

---

## Author

**Noa Jou**

UnVeilmi is an independent companion project to Veilmi.

I hope this project can eventually become more than a local demonstration:

- a public service for people who need this communication pattern;
- a self-hosted tool for teams that want to adapt it;
- or an idea that another developer takes further.

If UnVeilmi makes you curious, start with Veilmi.

> **The communication channel carries the locator.  
> UnVeilmi carries the ciphertext.  
> Veilmi reveals the message.**