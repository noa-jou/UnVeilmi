# UnVeilmi

> **A temporary public wall for what Veilmi encrypts.**

**Status:** Concept / Planned Proof of Concept
**Public service:** Not currently operated
**Platform:** Android + Chromebook local demonstration backend
**Related project:** Veilmi

---

## Overview

**UnVeilmi** is a planned companion project to **Veilmi**.

Veilmi encrypts and decrypts text locally on the user's device.

UnVeilmi has a much smaller responsibility:

> **Store and deliver ciphertext without knowing what it means.**

A user first encrypts a message with Veilmi, then publishes the resulting ciphertext to UnVeilmi.

The poster chooses an **Article Name** that can later be used to locate the encrypted post.

The sender may privately tell another person:

1. the Article Name;
2. the passphrase required to decrypt the message.

How the Article Name and passphrase are shared is deliberately outside the responsibility of UnVeilmi.

The recipient enters the Article Name, retrieves the ciphertext, copies it into Veilmi, enters the already-shared passphrase, and decrypts the message locally.

UnVeilmi never needs to receive the plaintext or the decryption passphrase.

---

# Core Idea

The project deliberately separates two responsibilities.

## Veilmi

**Handles the secret.**

* Encrypts locally
* Decrypts locally
* Does not store passwords
* Does not require an account
* Does not require a network connection for encryption or decryption

## UnVeilmi

**Handles the ciphertext.**

* Publishes encrypted text
* Uses a poster-selected Article Name as a locator
* Stores posts temporarily
* Allows ciphertext retrieval by Article Name
* Automatically deletes expired posts
* Does not decrypt messages

In short:

> **Veilmi handles the secret.
> UnVeilmi handles the ciphertext.**

---

# Example

Alice wants to send Bob:

```text
Meet me tomorrow at 7 PM.
```

Alice and Bob already know a passphrase that they have chosen to share outside UnVeilmi.

Alice opens Veilmi and encrypts the message.

Veilmi produces something similar to:

```text
VEILMI1:AJ83kd92...
```

Alice copies the ciphertext into UnVeilmi.

She chooses an Article Name:

```text
coffee-after-rain
```

UnVeilmi checks whether that Article Name is already being used by an active post.

If it is available, Alice can publish the ciphertext.

After the post succeeds, UnVeilmi displays:

```text
Post created successfully.

Article Name:
coffee-after-rain

[ Copy Article Name ]
```

Alice can copy the Article Name and share it with Bob.

Bob opens UnVeilmi and enters:

```text
coffee-after-rain
```

UnVeilmi retrieves:

```text
VEILMI1:AJ83kd92...
```

Bob copies the ciphertext into Veilmi.

Using the passphrase he already shares with Alice, Veilmi decrypts:

```text
Meet me tomorrow at 7 PM.
```

The UnVeilmi server never needs to know the plaintext or the passphrase.

---

# Design Philosophy

UnVeilmi is intentionally small.

It is **not** intended to become another social network or general-purpose messaging platform.

There are no plans for:

* User accounts
* Email registration
* Password databases
* Password recovery
* Friend lists
* Followers
* Likes
* Public profiles
* Comments
* Read receipts
* Online status
* Typing indicators
* Recommendation algorithms
* Advertising profiles

An Article Name locates encrypted data.

A passphrase unlocks encrypted data.

Those two concepts are deliberately separated.

> **The Article Name locates the message.
> The passphrase unlocks the message.**

---

# Article Names

The poster chooses the Article Name.

Examples might include:

```text
coffee-after-rain
project-night-42
meet-me-saturday
```

The Article Name is **not a password**.

It is simply a locator used to retrieve a ciphertext object.

The confidentiality of the message comes from Veilmi encryption and the independently shared passphrase.

## Article Name Availability

Only one active post may use a particular Article Name at a time.

Before creating a post, the backend checks whether the requested Article Name is already in use.

If it is already active, UnVeilmi displays:

```text
This Article Name is already in use.

Please choose another name.
```

When the existing post expires and is automatically deleted, that Article Name becomes available again.

## Post Confirmation

After a post is successfully created, UnVeilmi displays the Article Name again so that the poster has a clear opportunity to save or copy it.

For example:

```text
Post created successfully.

Article Name:
coffee-after-rain

Expires in:
24 hours

[ Copy Article Name ]

Please save or share this Article Name yourself.
UnVeilmi does not provide an account or recovery service.
```

UnVeilmi does not keep a personal history of posts for individual users.

---

# Temporary Storage by Design

UnVeilmi is intended to provide **temporary ciphertext storage**, not permanent cloud storage.

Every post has an expiry time.

When the expiry time is reached, the backend automatically deletes the post.

The Prototype deliberately does not include:

* Manual deletion
* Permanent storage
* Archive functions
* User-controlled post history

The lifecycle remains simple:

```text
Publish
   ↓
Temporary storage
   ↓
Retrieve
   ↓
Expire
   ↓
Automatic deletion
```

---

# Hypothetical Pricing Model

UnVeilmi does **not** process real payments in this Proof of Concept.

However, the Prototype estimates what a post might cost if UnVeilmi were ever deployed as a real public service.

The hypothetical price may depend on:

1. the size of the encrypted payload;
2. the requested storage duration.

Conceptually:

```text
Larger ciphertext
        +
Longer storage
        ↓
Higher estimated price
```

For example:

```text
Ciphertext size:
4.8 KB

Requested storage:
24 hours

Estimated price:
NT$1
```

A different post might display:

```text
Ciphertext size:
18.2 KB

Requested storage:
3 days

Estimated price:
NT$3
```

These figures are entirely fictional.

The Proof of Concept demonstrates a possible pricing mechanism, not a real commercial price list.

A real pricing model would only be designed if UnVeilmi were ever publicly deployed.

---

# Proof-of-Concept Payment

The Prototype never charges real money.

It simply calculates an estimated price and pretends that payment has succeeded.

For example:

```text
Ciphertext size:
6.2 KB

Storage period:
24 hours

Estimated price:
NT$1

[ Simulate Payment & Post ]
```

Pressing this button means only:

> Treat this post as if the estimated payment had been completed.

There is:

* No Google Play Billing integration
* No credit card information
* No payment account
* No financial transaction

The simulated payment exists only to demonstrate how a future resource-based pricing model could behave.

---

# Planned Data Model

A minimal post record may contain:

```text
id
article_name
ciphertext
ciphertext_size
created_at
expires_at
storage_duration
estimated_price
```

`storage_duration` and `estimated_price` exist only for demonstration purposes.

They do not represent a real purchase.

---

# Proof of Concept Environment

The first version of UnVeilmi will run entirely on hardware already available to the developer.

There is:

* No public domain
* No cloud hosting
* No public backend
* No production database
* No real payment system

A **Chromebook acts as both the temporary local UnVeilmi server and the first Android client**.

A separate physical Android phone acts as the second Android client.

Both devices communicate over the same local network.

---

# Chromebook — Local Server and Client A

The Chromebook performs two different roles.

## 1. Local Server

The Chromebook Linux development environment runs:

```text
Debian Linux
    │
    ├── FastAPI
    └── SQLite
```

FastAPI provides the local UnVeilmi API.

SQLite stores temporary ciphertext records.

The backend is made accessible to other devices on the same local network through the Chromebook's local IP address and development port.

Conceptually:

```text
Physical Android Phone
        │
        │ Local Wi-Fi
        ▼
Chromebook Local IP
        │
        │ Port 8000
        ▼
Debian Linux
        │
        ├── FastAPI
        └── SQLite
```

The Chromebook therefore acts like a small temporary server on the local network.

Turning off the Chromebook effectively turns off the UnVeilmi service.

---

## 2. Android Client A

The Chromebook also has its own Android environment.

It contains:

### Veilmi

Installed through:

```text
Google Play
    ↓
Veilmi Closed Testing
```

### UnVeilmi

Installed as a development APK into the Chromebook Android environment.

Conceptually:

```text
Chromebook Android Environment

├── Veilmi
│   └── Google Play Closed Testing
│
└── UnVeilmi
    └── Development APK
```

This acts as **Participant A**.

---

# Physical Android Phone — Client B

A separate physical Android test phone acts as **Participant B**.

It contains:

### Veilmi

Installed through:

```text
Google Play
    ↓
Veilmi Closed Testing
```

### UnVeilmi

Installed from the development APK through USB.

Conceptually:

```text
Physical Android Phone

├── Veilmi
│   └── Google Play Closed Testing
│
└── UnVeilmi
    └── APK installed via USB
```

The phone connects to the Chromebook-hosted UnVeilmi backend over the same local Wi-Fi network.

---

# Complete Local Architecture

```text
                         LOCAL WI-FI
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
          ▼                                       ▼

       CHROMEBOOK                         ANDROID PHONE
       Client A                              Client B

┌──────────────────────┐             ┌──────────────────────┐
│ Android Environment  │             │                      │
│                      │             │ Veilmi               │
│ Veilmi               │             │ Play Store           │
│ Play Store           │             │ Closed Testing       │
│ Closed Testing       │             │                      │
│                      │             │ UnVeilmi             │
│ UnVeilmi             │             │ APK via USB          │
│ Development APK      │             │                      │
└──────────┬───────────┘             └──────────┬───────────┘
           │                                    │
           └──────────────┬─────────────────────┘
                          │
                          ▼

                  CHROMEBOOK SERVER

                    Debian Linux
               ┌────────────────┐
               │ FastAPI        │
               │ SQLite         │
               └────────────────┘
```

Everything remains inside the local development environment.

No public infrastructure is required.

---

# Communication Demonstration

The Prototype demonstrates how two people who already know:

1. a shared Veilmi passphrase;
2. an Article Name;

can exchange a message without the server knowing the plaintext.

---

## Participant A — Chromebook

Participant A opens Veilmi on the Chromebook.

They write:

```text
Meet me tomorrow at 7 PM.
```

They enter a passphrase already shared with Participant B.

Veilmi encrypts the message locally:

```text
VEILMI1:AJ83kd92...
```

Participant A copies this ciphertext.

They open UnVeilmi on the Chromebook and paste it.

They choose:

```text
Article Name:
coffee-after-rain
```

UnVeilmi checks whether the Article Name is already in use.

If it is available, the application displays:

```text
Ciphertext size:
5.4 KB

Storage:
24 hours

Estimated price:
NT$1
```

Participant A presses:

```text
Simulate Payment & Post
```

No real payment occurs.

UnVeilmi sends the Article Name, ciphertext, and temporary storage information to the local Chromebook backend.

After success:

```text
Post created successfully.

Article Name:
coffee-after-rain

Expires in:
24 hours

[ Copy Article Name ]
```

Participant A copies the Article Name and gives it to Participant B.

The passphrase is already known independently.

---

## Participant B — Physical Android Phone

Participant B opens UnVeilmi on the physical test phone.

They enter:

```text
coffee-after-rain
```

UnVeilmi queries the Chromebook backend.

The server returns:

```text
VEILMI1:AJ83kd92...
```

Participant B presses:

```text
Copy
```

They open Veilmi.

They paste the ciphertext and enter the passphrase already shared with Participant A.

Veilmi displays:

```text
Meet me tomorrow at 7 PM.
```

The communication is complete.

---

# Reverse Communication

The same demonstration can run in reverse.

Participant B can:

```text
Phone Veilmi
    ↓
Encrypt
    ↓
Phone UnVeilmi
    ↓
Choose Article Name
    ↓
Post
```

Participant A can then:

```text
Chromebook UnVeilmi
    ↓
Enter Article Name
    ↓
Retrieve ciphertext
    ↓
Chromebook Veilmi
    ↓
Decrypt
```

Neither device is permanently the sender or recipient.

Both are simply clients of the same local ciphertext service.

---

# What the Server Sees

The Chromebook SQLite database might contain:

```text
article_name       ciphertext             ciphertext_size    expires_at
coffee-after-rain  VEILMI1:AJ83kd92...    5529 bytes         ...
```

It does not need:

```text
Meet me tomorrow at 7 PM.
```

It does not receive the Veilmi passphrase.

It does not need to know who Participant A or Participant B is.

The purpose of the Prototype is to demonstrate:

> **The server can deliver a message without being able to read the message.**

---

# Expiration Demonstration

A normal demonstration may use:

```text
Storage duration:
24 hours
```

For development testing, this may temporarily be shortened to something such as:

```text
2 minutes
```

This makes it possible to test the complete lifecycle quickly:

```text
Calculate estimated price
          ↓
Simulate payment
          ↓
Publish ciphertext
          ↓
Retrieve ciphertext
          ↓
Decrypt with Veilmi
          ↓
Expire
          ↓
Automatic deletion
```

There is no manual deletion feature in the Prototype.

---

# Planned Backend

The Prototype backend should remain deliberately small.

Possible stack:

* Debian Linux
* Python
* FastAPI
* SQLite

Initial API requirements may include:

```text
POST /posts

GET /posts/{article_name}

GET /health
```

The backend should also check whether an Article Name is already being used by an active post before accepting a new post.

Expired posts should be removed automatically.

There is no:

* User-management API
* Authentication API
* Password API
* Payment API
* Manual deletion API

---

# Planned Android App

The first UnVeilmi Prototype only needs a small number of screens.

## Publish

```text
Paste Veilmi ciphertext

[                         ]

Article Name:
[ coffee-after-rain ]

Ciphertext size:
6.2 KB

Storage period:
24 hours

Estimated price:
NT$1

[ Simulate Payment & Post ]
```

If the Article Name is already in use:

```text
This Article Name is already in use.

Please choose another name.
```

After success:

```text
Post created successfully.

Article Name:

coffee-after-rain

Expires in:
24 hours

[ Copy Article Name ]
```

---

## Find

```text
Enter Article Name

[ coffee-after-rain ]

[ Find ]
```

Result:

```text
VEILMI1:AJ83kd92...

[ Copy ]
```

The user then opens Veilmi to decrypt the ciphertext.

---

# Content Limits

The Prototype supports **text only**.

It does not support:

* Images
* Video
* Audio
* Executable files
* General file uploads

The backend should enforce a maximum ciphertext payload size.

The precise limit can be decided during implementation.

The Publish screen may display:

```text
Character count
Ciphertext byte size
Requested storage duration
Estimated price
```

before the simulated transaction.

---

# Security Model

The UnVeilmi server does not need access to:

* Plaintext
* Decryption passphrases
* Veilmi passwords
* Recipient identities

Users decide how they exchange their passphrases and Article Names.

That exchange occurs outside UnVeilmi.

The Article Name should not be treated as a security secret.

Its purpose is only to locate the ciphertext.

The Veilmi passphrase protects the plaintext.

---

# Important Limitations

UnVeilmi does **not** claim to provide complete anonymity.

Even if the server cannot read a ciphertext, a network service may still expose metadata such as:

* IP addresses
* Request times
* Message sizes
* Access patterns

A real public deployment would therefore require additional privacy and metadata analysis.

Likewise:

> **Unable to read a message does not automatically remove the legal responsibilities of a service operator.**

Legal compliance, abuse management, infrastructure security, payment processing, taxation, and production deployment are outside the scope of this Prototype.

---

# Possible Future Business Model

This section is entirely hypothetical.

UnVeilmi currently has:

* No public service
* No public server
* No real payment system

If the project were ever deployed publicly, one possible pricing model would charge according to:

```text
encrypted data size
        ×
storage duration
```

A real pricing model would additionally need to consider:

* Infrastructure costs
* Database operations
* Network traffic
* Payment processing
* Platform fees
* Abuse prevention
* Maintenance
* Taxes

The Prototype does not attempt to solve those commercial questions.

It only demonstrates that an estimated price can be calculated before publishing.

---

# Why Build This?

UnVeilmi is primarily a cybersecurity and software engineering Proof of Concept.

The goal is to demonstrate practical understanding of:

* Client/server architecture
* Local area networking
* IP addressing
* Ports
* Port forwarding
* HTTP APIs
* Android development
* Linux services
* Backend development
* SQLite
* Temporary data lifecycle
* Encryption boundaries
* Threat modelling
* Data minimisation
* Secure system design
* Resource-based pricing concepts

It also provides an opportunity to apply networking and Linux concepts in a working system rather than only studying them theoretically.

---

# Relationship to Veilmi

Veilmi and UnVeilmi are intentionally separate.

Veilmi remains useful without UnVeilmi.

UnVeilmi temporarily transports and stores ciphertext produced by Veilmi.

Together:

```text
Plaintext
   ↓
Veilmi
   ↓
Local encryption
   ↓
Ciphertext
   ↓
UnVeilmi
   ↓
Temporary storage
   ↓
Another UnVeilmi client
   ↓
Ciphertext
   ↓
Veilmi
   ↓
Local decryption
   ↓
Plaintext
```

> **Veilmi handles the secret.
> UnVeilmi handles the ciphertext.**

---

# Project Scope

## Phase 1 — Proof of Concept

* [ ] Create UnVeilmi Flutter project
* [ ] Build Publish screen
* [ ] Build Find screen
* [ ] Create FastAPI backend
* [ ] Create SQLite database
* [ ] Run backend in Chromebook Linux
* [ ] Configure local network access
* [ ] Let poster choose an Article Name
* [ ] Check whether an Article Name is already active
* [ ] Reject duplicate active Article Names
* [ ] Show Article Name again after successful post
* [ ] Add Copy Article Name button
* [ ] Store ciphertext
* [ ] Retrieve ciphertext by exact Article Name
* [ ] Measure ciphertext byte size
* [ ] Enforce ciphertext size limit
* [ ] Select temporary storage duration
* [ ] Calculate hypothetical price
* [ ] Simulate payment
* [ ] Implement automatic expiry
* [ ] Automatically delete expired posts
* [ ] Install UnVeilmi in Chromebook Android environment
* [ ] Install UnVeilmi APK on physical Android phone
* [ ] Use Veilmi closed-testing build on both devices
* [ ] Connect both clients to Chromebook local backend
* [ ] Demonstrate Chromebook → Phone communication
* [ ] Demonstrate Phone → Chromebook communication
* [ ] Record demonstration
* [ ] Document architecture
* [ ] Write threat model

## Phase 2 — Optional Future Research

* [ ] Rate limiting
* [ ] Abuse prevention
* [ ] HTTPS
* [ ] Production deployment architecture
* [ ] Real payment architecture
* [ ] Production pricing formula
* [ ] Production database
* [ ] Monitoring
* [ ] Metadata minimisation
* [ ] Security testing
* [ ] Public deployment cost analysis

Phase 2 is **not currently planned for implementation**.

---

# Current Status

UnVeilmi is currently an idea preserved for future development.

There is currently:

* No public UnVeilmi server
* No production deployment
* No real payment system
* No public user service

The first milestone is:

> **Prove that two independent Android clients can exchange Veilmi ciphertext through a Chromebook-hosted local UnVeilmi backend when both participants already know the Article Name and shared passphrase.**

If that works, the core concept works.

---

# License

The intended license for this project is:

**GNU Affero General Public License v3.0 (AGPL-3.0)**

The goal is to allow people to study, use, modify, deploy, and improve UnVeilmi while encouraging improvements to network-hosted versions to remain available to the open-source community.

A complete official AGPL-3.0 `LICENSE` file should be added when the source code is published.

Until that decision is finalized, this private repository is maintained for development and planning purposes.

---

# Author

**Noa Jou**

UnVeilmi is an independent companion project to Veilmi.

> **Veilmi handles the secret.
> UnVeilmi handles the ciphertext.**
