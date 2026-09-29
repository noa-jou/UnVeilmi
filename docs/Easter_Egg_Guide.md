# Easter Egg from the Demo Video

If you watched the README demo and only half remember what happened, here is the short version.

Kate and Noa look like they are having a completely ordinary LINE conversation.

The trick is:

> **Each LINE message is also an UnVeilmi Article Name.**

The visible chat is the clue.  
UnVeilmi finds the ciphertext.  
Veilmi reveals the hidden message.

---

## 1. Quick Recap

The LINE conversation includes messages such as:

```text
did you get home
yeah just got back
did you eat yet
not really hungry
maybe order something
...
```

In the video, Kate copies:

```text
did you get home
```

and uses it in:

```text
UnVeilmi → Find
```

UnVeilmi returns a `VEILMI1:` ciphertext.

That ciphertext is copied into Veilmi and decrypted with:

```text
family
```

The hidden message is:

```text
I won the lottery!
```

Then the same thing happens with:

```text
yeah just got back
```

which reveals:

```text
Wait. Seriously? How much did you win?
```

And that is where the video stops.

The rest of the conversation is the Easter Egg.

---

## 2. Load the Easter Egg

First, make sure the UnVeilmi database already exists.

Setup guides:

- [Database Setup](Set_Up_DB.md)
- [Backend Setup](Set_Up_Backend.md)
- [Frontend Setup](Set_Up_Frontend.md)

Then, from the `backend` directory, load the prepared demo data:

```bash
sqlite3 unveilmi.db < demo_seed.sql
```

The shared demo passphrase is:

```text
family
```

That is all you need.

---

## 3. Continue the Story

Start UnVeilmi and open:

```text
http://127.0.0.1:5500
```

Now use the remaining LINE messages as Article Names:

```text
did you eat yet
not really hungry
maybe order something
i might cook later
weather looks nice
maybe go for a walk
i will check later
okay talk tonight
```

For each one:

```text
Copy LINE message
        ↓
UnVeilmi → Find
        ↓
Copy Ciphertext
        ↓
Open Veilmi
        ↓
Paste Ciphertext
        ↓
Passphrase: family
        ↓
Decrypt
```

The remaining plaintext is intentionally not listed here.

If you want to know what Kate and Noa say next, you have to uncover it yourself.

---

## 4. What the Demo Is Showing

The Easter Egg is playful, but it demonstrates the basic UnVeilmi idea:

```text
LINE carries the locator
        ↓
UnVeilmi carries the ciphertext
        ↓
Veilmi reveals the message
```

Or, in the project's usual wording:

> **Veilmi handles the secret.  
> UnVeilmi handles the ciphertext.**

Have fun finding the rest.
