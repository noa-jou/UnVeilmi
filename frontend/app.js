const API_BASE_URL = "http://127.0.0.1:8000";

const MAX_ARTICLE_NAME_LENGTH = 50;

const VEILMI_PREFIX = "VEILMI1:";
const VEILMI_VERSION = 1;
const VEILMI_KDF = "PBKDF2-SHA256";

const SUPPORTED_PBKDF2_ITERATIONS = new Set([
    50000,
    100000,
    600000,
]);

const SALT_LENGTH = 16;
const NONCE_LENGTH = 12;
const MAC_LENGTH = 16;


/*
 * -------------------------------------------------
 * Demo Pricing
 * -------------------------------------------------
 *
 * This is only a simulated payment system.
 *
 * Current rule:
 *
 * USD 1
 * × each started 1 KB
 * × each started 24-hour period
 *
 * Examples:
 *
 * 800 bytes / 24 hours
 * -> USD 1
 *
 * 1500 bytes / 24 hours
 * -> USD 2
 *
 * 1500 bytes / 48 hours
 * -> USD 4
 *
 * The result is always a whole-number USD amount.
 */

function calculateDemoPrice(ciphertextBytes, storageHours) {
    const kbUnits = Math.max(
        1,
        Math.ceil(ciphertextBytes / 1024)
    );

    const dayUnits = Math.max(
        1,
        Math.ceil(storageHours / 24)
    );

    return kbUnits * dayUnits;
}


/*
 * -------------------------------------------------
 * Publish State
 * -------------------------------------------------
 *
 * These values remember what the user has already
 * successfully checked.
 */

const publishState = {
    verifiedArticleName: null,

    paymentCompleted: false,

    paymentFingerprint: null,
};


/*
 * -------------------------------------------------
 * API Helpers
 * -------------------------------------------------
 */

async function apiRequest(path, options = {}) {
    const response = await fetch(
        `${API_BASE_URL}${path}`,
        options
    );

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const message =
            data?.detail ||
            `Request failed with status ${response.status}.`;

        const error = new Error(message);

        error.status = response.status;

        throw error;
    }

    return data;
}


async function checkArticleName(articleName) {
    const query = new URLSearchParams({
        article_name: articleName,
    });

    return apiRequest(
        `/posts/check-name?${query.toString()}`
    );
}


async function getPost(articleName) {
    const encodedName =
        encodeURIComponent(articleName);

    return apiRequest(
        `/posts/${encodedName}`
    );
}


async function createPost(post) {
    return apiRequest(
        "/posts",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify(post),
        }
    );
}


/*
 * -------------------------------------------------
 * General Helpers
 * -------------------------------------------------
 */

function byId(id) {
    return document.getElementById(id);
}


function setText(element, text) {
    if (element) {
        element.textContent = text;
    }
}


function unicodeLength(value) {
    return Array.from(value).length;
}


function getCiphertextByteSize(ciphertext) {
    return new TextEncoder()
        .encode(ciphertext)
        .length;
}


function randomInt(max) {
    if (max <= 0) {
        return 0;
    }

    if (
        window.crypto &&
        window.crypto.getRandomValues
    ) {
        const values =
            new Uint32Array(1);

        window.crypto.getRandomValues(values);

        return values[0] % max;
    }

    return Math.floor(
        Math.random() * max
    );
}


async function copyText(text, button) {
    if (!text) {
        return;
    }

    await navigator.clipboard.writeText(text);

    if (button) {
        const oldText =
            button.textContent;

        button.textContent =
            "Copied";

        setTimeout(
            () => {
                button.textContent =
                    oldText;
            },
            1200
        );
    }
}


/*
 * -------------------------------------------------
 * Veilmi Format Validation
 * -------------------------------------------------
 *
 * This checks the structure of a Veilmi ciphertext.
 *
 * It does NOT decrypt the message.
 * It does NOT know the passphrase.
 */

function decodeBase64Url(
    value,
    fieldName
) {
    if (
        typeof value !== "string" ||
        value.length === 0
    ) {
        throw new Error(
            `Veilmi field '${fieldName}' must be a non-empty Base64URL string.`
        );
    }

    if (
        !/^[A-Za-z0-9_-]+={0,2}$/.test(value)
    ) {
        throw new Error(
            `Veilmi field '${fieldName}' is not valid Base64URL.`
        );
    }

    const unpadded =
        value.replace(/=+$/, "");

    if (
        unpadded.length % 4 === 1
    ) {
        throw new Error(
            `Veilmi field '${fieldName}' is not valid Base64URL.`
        );
    }

    const standardBase64 =
        unpadded
            .replace(/-/g, "+")
            .replace(/_/g, "/")
        +
        "=".repeat(
            (
                4 -
                (
                    unpadded.length % 4
                )
            ) % 4
        );

    let binary;

    try {
        binary =
            atob(standardBase64);
    } catch {
        throw new Error(
            `Veilmi field '${fieldName}' is not valid Base64URL.`
        );
    }

    return Uint8Array.from(
        binary,
        (character) =>
            character.charCodeAt(0)
    );
}


function validateVeilmiCiphertext(
    encodedMessage
) {
    if (
        typeof encodedMessage !== "string"
    ) {
        return {
            valid: false,
            message:
                "Veilmi ciphertext must be text.",
        };
    }


    if (
        !encodedMessage.startsWith(
            VEILMI_PREFIX
        )
    ) {
        return {
            valid: false,
            message:
                "Invalid Veilmi message prefix.",
        };
    }


    const payload =
        encodedMessage.slice(
            VEILMI_PREFIX.length
        );


    if (!payload) {
        return {
            valid: false,
            message:
                "Veilmi message payload is empty.",
        };
    }


    try {
        const jsonBytes =
            decodeBase64Url(
                payload,
                "payload"
            );


        let jsonText;

        try {
            jsonText =
                new TextDecoder(
                    "utf-8",
                    {
                        fatal: true,
                    }
                ).decode(
                    jsonBytes
                );
        } catch {
            throw new Error(
                "Veilmi message payload is not valid UTF-8."
            );
        }


        let envelope;

        try {
            envelope =
                JSON.parse(
                    jsonText
                );
        } catch {
            throw new Error(
                "Veilmi message payload is not valid JSON."
            );
        }


        if (
            envelope === null ||
            typeof envelope !== "object" ||
            Array.isArray(envelope)
        ) {
            throw new Error(
                "Invalid Veilmi message format."
            );
        }


        const requiredFields = [
            "v",
            "k",
            "i",
            "s",
            "n",
            "c",
            "m",
        ];


        for (
            const field
            of requiredFields
        ) {
            if (
                !(field in envelope)
            ) {
                throw new Error(
                    `Veilmi message is missing required field '${field}'.`
                );
            }
        }


        if (
            !Number.isInteger(
                envelope.v
            )
        ) {
            throw new Error(
                "Veilmi field 'v' must be an integer."
            );
        }


        if (
            typeof envelope.k !== "string"
        ) {
            throw new Error(
                "Veilmi field 'k' must be a string."
            );
        }


        if (
            !Number.isInteger(
                envelope.i
            )
        ) {
            throw new Error(
                "Veilmi field 'i' must be an integer."
            );
        }


        for (
            const field
            of ["s", "n", "c", "m"]
        ) {
            if (
                typeof envelope[field]
                !== "string"
            ) {
                throw new Error(
                    `Veilmi field '${field}' must be a string.`
                );
            }
        }


        if (
            envelope.v
            !== VEILMI_VERSION
        ) {
            throw new Error(
                "Unsupported Veilmi message version."
            );
        }


        if (
            envelope.k
            !== VEILMI_KDF
        ) {
            throw new Error(
                "Unsupported Veilmi key derivation function."
            );
        }


        if (
            !SUPPORTED_PBKDF2_ITERATIONS
                .has(envelope.i)
        ) {
            throw new Error(
                "Unsupported Veilmi PBKDF2 iteration count."
            );
        }


        const salt =
            decodeBase64Url(
                envelope.s,
                "s"
            );

        const nonce =
            decodeBase64Url(
                envelope.n,
                "n"
            );

        const ciphertext =
            decodeBase64Url(
                envelope.c,
                "c"
            );

        const mac =
            decodeBase64Url(
                envelope.m,
                "m"
            );


        if (
            salt.length
            !== SALT_LENGTH
        ) {
            throw new Error(
                "Invalid Veilmi salt length."
            );
        }


        if (
            nonce.length
            !== NONCE_LENGTH
        ) {
            throw new Error(
                "Invalid Veilmi nonce length."
            );
        }


        if (
            mac.length
            !== MAC_LENGTH
        ) {
            throw new Error(
                "Invalid Veilmi authentication tag length."
            );
        }


        if (
            ciphertext.length === 0
        ) {
            throw new Error(
                "Ciphertext must not be empty."
            );
        }


        return {
            valid: true,

            message:
                "Valid Veilmi ciphertext.",
        };
    } catch (error) {
        return {
            valid: false,

            message:
                error.message,
        };
    }
}


/*
 * -------------------------------------------------
 * Article Name Validation
 * -------------------------------------------------
 */

function validateArticleNameLocally(
    articleName
) {
    const length =
        unicodeLength(articleName);


    if (length === 0) {
        return {
            valid: false,

            message:
                "Please enter an Article Name.",
        };
    }


    if (
        length >
        MAX_ARTICLE_NAME_LENGTH
    ) {
        return {
            valid: false,

            message:
                `Article Name must be ${MAX_ARTICLE_NAME_LENGTH} characters or fewer.`,
        };
    }


    return {
        valid: true,
        message: "",
    };
}


/*
 * Create typo-like suggestions by swapping
 * neighboring characters.
 *
 * Example:
 *
 * home
 * ->
 * hoem
 */

function createTypoCandidates(
    articleName
) {
    const characters =
        Array.from(articleName);

    const candidates = [];


    for (
        let i = 0;
        i < characters.length - 1;
        i += 1
    ) {
        if (
            characters[i]
            === characters[i + 1]
        ) {
            continue;
        }


        const copy =
            [...characters];


        [
            copy[i],
            copy[i + 1],
        ] = [
                copy[i + 1],
                copy[i],
            ];


        const candidate =
            copy.join("");


        if (
            candidate !== articleName &&
            !candidates.includes(
                candidate
            )
        ) {
            candidates.push(
                candidate
            );
        }
    }


    /*
     * Shuffle the candidates so the suggestion
     * does not always look predictable.
     */

    for (
        let i =
            candidates.length - 1;
        i > 0;
        i -= 1
    ) {
        const j =
            randomInt(i + 1);


        [
            candidates[i],
            candidates[j],
        ] = [
                candidates[j],
                candidates[i],
            ];
    }


    return candidates;
}


/*
 * Fallback suggestion.
 *
 * Used when the Article Name is too short
 * or swapping characters does not produce
 * another useful name.
 */

function createFallbackCandidate(
    articleName
) {
    const suffix =
        String(
            randomInt(90) + 10
        );


    const characters =
        Array.from(articleName);


    while (
        characters.length +
        suffix.length +
        1 >
        MAX_ARTICLE_NAME_LENGTH
    ) {
        characters.pop();
    }


    return (
        `${characters.join("")}-${suffix}`
    );
}


/*
 * Every suggestion is checked against
 * the backend before it is shown.
 */

async function findAvailableArticleNameSuggestion(
    articleName
) {
    const candidates =
        createTypoCandidates(
            articleName
        );


    for (
        const candidate
        of candidates
    ) {
        const result =
            await checkArticleName(
                candidate
            );


        if (
            result.available
        ) {
            return candidate;
        }
    }


    /*
     * If character swapping fails,
     * try a short random suffix.
     */

    for (
        let attempt = 0;
        attempt < 10;
        attempt += 1
    ) {
        const candidate =
            createFallbackCandidate(
                articleName
            );


        const result =
            await checkArticleName(
                candidate
            );


        if (
            result.available
        ) {
            return candidate;
        }
    }


    return null;
}


/*
 * -------------------------------------------------
 * Article Name State
 * -------------------------------------------------
 */

function resetArticleNameVerification() {
    publishState.verifiedArticleName =
        null;


    setText(
        byId("article-name-status"),
        ""
    );


    setText(
        byId(
            "article-name-suggestion"
        ),
        ""
    );


    const useSuggestionButton =
        byId(
            "use-suggested-name"
        );


    if (
        useSuggestionButton
    ) {
        useSuggestionButton.hidden =
            true;

        delete (
            useSuggestionButton
                .dataset
                .suggestion
        );
    }


    updateSendButton();
}


/*
 * -------------------------------------------------
 * Check Article Name
 * -------------------------------------------------
 */

async function handleCheckArticleName() {
    const input =
        byId("article-name");

    const status =
        byId(
            "article-name-status"
        );

    const suggestionText =
        byId(
            "article-name-suggestion"
        );

    const useSuggestionButton =
        byId(
            "use-suggested-name"
        );


    const articleName =
        input.value.trim();


    const localValidation =
        validateArticleNameLocally(
            articleName
        );


    publishState.verifiedArticleName =
        null;


    setText(
        suggestionText,
        ""
    );


    if (
        useSuggestionButton
    ) {
        useSuggestionButton.hidden =
            true;

        delete (
            useSuggestionButton
                .dataset
                .suggestion
        );
    }


    if (
        !localValidation.valid
    ) {
        setText(
            status,
            localValidation.message
        );

        updateSendButton();

        return;
    }


    setText(
        status,
        "Checking Article Name..."
    );


    try {
        const result =
            await checkArticleName(
                articleName
            );


        if (
            result.available
        ) {
            publishState
                .verifiedArticleName =
                articleName;


            setText(
                status,
                "Article Name is available."
            );


            updateSendButton();

            return;
        }


        setText(
            status,
            "Article Name is already in use. Looking for an available suggestion..."
        );


        const suggestion =
            await findAvailableArticleNameSuggestion(
                articleName
            );


        if (!suggestion) {
            setText(
                suggestionText,

                "No automatic suggestion was available. Please try another name."
            );


            updateSendButton();

            return;
        }


        setText(
            suggestionText,

            `Available suggestion: ${suggestion}`
        );


        if (
            useSuggestionButton
        ) {
            useSuggestionButton.hidden =
                false;


            useSuggestionButton
                .dataset
                .suggestion =
                suggestion;
        }
    } catch (error) {
        setText(
            status,

            `Could not check Article Name: ${error.message}`
        );
    }


    updateSendButton();
}


/*
 * -------------------------------------------------
 * Use Suggested Article Name
 * -------------------------------------------------
 */

function handleUseSuggestedName() {
    const button =
        byId(
            "use-suggested-name"
        );

    const input =
        byId(
            "article-name"
        );


    const suggestion =
        button?.dataset
            .suggestion;


    if (
        !suggestion ||
        !input
    ) {
        return;
    }


    input.value =
        suggestion;


    /*
     * This exact suggestion was already checked
     * against the backend.
     */

    publishState
        .verifiedArticleName =
        suggestion;


    setText(
        byId(
            "article-name-status"
        ),

        "Suggested Article Name is available."
    );


    setText(
        byId(
            "article-name-suggestion"
        ),

        ""
    );


    button.hidden =
        true;


    updateSendButton();
}


/*
 * -------------------------------------------------
 * Payment State
 * -------------------------------------------------
 */

function resetPayment() {
    publishState.paymentCompleted =
        false;

    publishState.paymentFingerprint =
        null;


    setText(
        byId("payment-status"),
        ""
    );


    const payButton =
        byId("pay-button");


    if (
        payButton
    ) {
        payButton.disabled =
            true;
    }


    updateSendButton();
}


/*
 * -------------------------------------------------
 * Quote
 * -------------------------------------------------
 */

function getCurrentQuote() {
    const ciphertext =
        byId("ciphertext")
            ?.value
            .trim()
        ?? "";


    const storageHours =
        Number(
            byId(
                "storage-hours"
            )?.value
        );


    const veilmiValidation =
        validateVeilmiCiphertext(
            ciphertext
        );


    if (
        !veilmiValidation.valid
    ) {
        return {
            valid: false,

            reason:
                veilmiValidation.message,
        };
    }


    if (
        !Number.isInteger(
            storageHours
        ) ||
        storageHours <= 0
    ) {
        return {
            valid: false,

            reason:
                "Storage hours must be a positive whole number.",
        };
    }


    const ciphertextBytes =
        getCiphertextByteSize(
            ciphertext
        );


    const price =
        calculateDemoPrice(
            ciphertextBytes,
            storageHours
        );


    return {
        valid: true,

        ciphertext,

        ciphertextBytes,

        storageHours,

        price,
    };
}


/*
 * This remembers exactly what the user
 * agreed to pay for.
 *
 * If the message, storage duration,
 * or price changes, the old payment
 * becomes invalid.
 */

function quoteFingerprint(
    quote
) {
    return JSON.stringify({
        ciphertext:
            quote.ciphertext,

        storageHours:
            quote.storageHours,

        price:
            quote.price,
    });
}


/*
 * -------------------------------------------------
 * Update Quote Display
 * -------------------------------------------------
 */

function updateQuote() {
    const quote =
        getCurrentQuote();


    if (
        !quote.valid
    ) {
        setText(
            byId(
                "ciphertext-status"
            ),

            quote.reason
        );


        setText(
            byId("quote-size"),
            "—"
        );


        setText(
            byId("quote-hours"),
            "—"
        );


        setText(
            byId("quote-price"),
            "—"
        );


        const payButton =
            byId(
                "pay-button"
            );


        if (
            payButton
        ) {
            payButton.disabled =
                true;
        }


        resetPayment();

        return;
    }


    setText(
        byId(
            "ciphertext-status"
        ),

        "Valid Veilmi ciphertext."
    );


    setText(
        byId("quote-size"),

        `${quote.ciphertextBytes} bytes`
    );


    setText(
        byId("quote-hours"),

        `${quote.storageHours} hours`
    );


    setText(
        byId("quote-price"),

        `USD ${quote.price}`
    );


    const payButton =
        byId(
            "pay-button"
        );


    if (
        payButton
    ) {
        payButton.disabled =
            false;


        payButton.textContent =
            `Pay USD ${quote.price}`;
    }


    updateSendButton();
}


/*
 * -------------------------------------------------
 * Fake Payment
 * -------------------------------------------------
 */

function handleFakePayment() {
    const quote =
        getCurrentQuote();


    if (
        !quote.valid
    ) {
        setText(
            byId(
                "payment-status"
            ),

            "The quote is no longer valid."
        );


        resetPayment();

        return;
    }


    publishState.paymentCompleted =
        true;


    publishState.paymentFingerprint =
        quoteFingerprint(
            quote
        );


    setText(
        byId(
            "payment-status"
        ),

        `Payment successful — USD ${quote.price} (simulation).`
    );


    updateSendButton();
}


/*
 * -------------------------------------------------
 * Check Whether Payment Still Matches
 * -------------------------------------------------
 */

function paymentMatchesCurrentQuote() {
    if (
        !publishState
            .paymentCompleted
    ) {
        return false;
    }


    const quote =
        getCurrentQuote();


    if (
        !quote.valid
    ) {
        return false;
    }


    return (
        publishState
            .paymentFingerprint
        ===
        quoteFingerprint(
            quote
        )
    );
}


/*
 * -------------------------------------------------
 * Send Button State
 * -------------------------------------------------
 */

function updateSendButton() {
    const sendButton =
        byId(
            "send-button"
        );


    if (
        !sendButton
    ) {
        return;
    }


    const currentArticleName =
        byId(
            "article-name"
        )?.value
            .trim()
        ?? "";


    const nameStillVerified =
        (
            publishState
                .verifiedArticleName
            ===
            currentArticleName
        );


    const quote =
        getCurrentQuote();


    sendButton.disabled =
        !(
            nameStillVerified
            &&
            quote.valid
            &&
            paymentMatchesCurrentQuote()
        );
}


/*
 * -------------------------------------------------
 * Final Send
 * -------------------------------------------------
 */

async function handleSend(
    event
) {
    event.preventDefault();


    const articleName =
        byId(
            "article-name"
        )
            .value
            .trim();


    const publishStatus =
        byId(
            "publish-status"
        );


    /*
     * FINAL CHECK
     *
     * 1. Article Name format
     * 2. Article Name still available
     * 3. Veilmi ciphertext still valid
     * 4. Payment still matches
     * 5. POST to backend
     */


    const localNameCheck =
        validateArticleNameLocally(
            articleName
        );


    if (
        !localNameCheck.valid
    ) {
        setText(
            publishStatus,
            localNameCheck.message
        );


        resetArticleNameVerification();

        return;
    }


    const quote =
        getCurrentQuote();


    if (
        !quote.valid
    ) {
        setText(
            publishStatus,

            `Cannot send: ${quote.reason}`
        );


        resetPayment();

        return;
    }


    if (
        !paymentMatchesCurrentQuote()
    ) {
        setText(
            publishStatus,

            "Payment is missing or no longer matches the current ciphertext and storage duration."
        );


        resetPayment();

        return;
    }


    setText(
        publishStatus,

        "Final Article Name check..."
    );


    try {
        /*
         * Check Article Name one more time.
         */

        const nameResult =
            await checkArticleName(
                articleName
            );


        if (
            !nameResult.available
        ) {
            publishState
                .verifiedArticleName =
                null;


            setText(
                byId(
                    "article-name-status"
                ),

                "Article Name became unavailable. Please choose another name."
            );


            setText(
                publishStatus,

                "The Article Name is no longer available."
            );


            updateSendButton();

            return;
        }


        /*
         * Check Veilmi format one more time.
         */

        const finalVeilmiCheck =
            validateVeilmiCiphertext(
                quote.ciphertext
            );


        if (
            !finalVeilmiCheck.valid
        ) {
            setText(
                publishStatus,

                `Cannot send: ${finalVeilmiCheck.message}`
            );


            resetPayment();

            return;
        }


        setText(
            publishStatus,
            "Sending..."
        );


        /*
         * Backend performs the final authoritative
         * validation again.
         */

        const result =
            await createPost({
                article_name:
                    articleName,

                ciphertext:
                    quote.ciphertext,

                storage_hours:
                    quote.storageHours,

                price:
                    quote.price,
            });


        setText(
            publishStatus,

            "Published successfully."
        );


        setText(
            byId(
                "published-article-name"
            ),

            result.article_name
        );


        const copyNameButton =
            byId(
                "copy-article-name"
            );


        if (
            copyNameButton
        ) {
            copyNameButton.disabled =
                false;


            copyNameButton
                .dataset
                .copyValue =
                result.article_name;
        }


        /*
         * This Article Name is now used.
         * The payment also cannot be reused.
         */

        publishState
            .verifiedArticleName =
            null;


        publishState
            .paymentCompleted =
            false;


        publishState
            .paymentFingerprint =
            null;


        updateSendButton();
    } catch (error) {
        if (
            error.status === 409
        ) {
            publishState
                .verifiedArticleName =
                null;


            setText(
                byId(
                    "article-name-status"
                ),

                "Article Name is already in use."
            );
        }


        setText(
            publishStatus,

            `Could not publish: ${error.message}`
        );


        updateSendButton();
    }
}


/*
 * -------------------------------------------------
 * Find Existing Post
 * -------------------------------------------------
 */

async function handleSearch(
    event
) {
    event.preventDefault();


    const articleName =
        byId(
            "search-article-name"
        )
            .value
            .trim();


    const searchStatus =
        byId(
            "search-status"
        );


    const retrievedCiphertext =
        byId(
            "retrieved-ciphertext"
        );


    setText(
        searchStatus,
        ""
    );


    setText(
        retrievedCiphertext,
        ""
    );


    const validation =
        validateArticleNameLocally(
            articleName
        );


    if (
        !validation.valid
    ) {
        setText(
            searchStatus,

            validation.message
        );

        return;
    }


    setText(
        searchStatus,

        "Searching..."
    );


    try {
        const post =
            await getPost(
                articleName
            );


        setText(
            searchStatus,

            "Ciphertext found."
        );


        setText(
            retrievedCiphertext,

            post.ciphertext
        );


        const copyButton =
            byId(
                "copy-ciphertext"
            );


        if (
            copyButton
        ) {
            copyButton.disabled =
                false;


            copyButton
                .dataset
                .copyValue =
                post.ciphertext;
        }
    } catch (error) {
        if (
            error.status === 404
        ) {
            setText(
                searchStatus,

                "Article not found or expired."
            );
        } else {
            setText(
                searchStatus,

                `Could not search: ${error.message}`
            );
        }
    }
}

/*
 * -------------------------------------------------
 * Page Navigation
 * -------------------------------------------------
 */

function showPage(pageName) {
    const publishPage =
        byId("publish-page");

    const searchPage =
        byId("search-page");


    if (
        !publishPage ||
        !searchPage
    ) {
        return;
    }


    if (
        pageName === "search"
    ) {
        publishPage.hidden =
            true;

        searchPage.hidden =
            false;
    } else {
        publishPage.hidden =
            false;

        searchPage.hidden =
            true;
    }
}

/*
 * -------------------------------------------------
 * Page Setup
 * -------------------------------------------------
 */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        const showPublishButton =
            byId("show-publish-page");

        const showSearchButton =
            byId("show-search-page");


        if (
            showPublishButton
        ) {
            showPublishButton
                .addEventListener(
                    "click",
                    () => {
                        showPage("publish");
                    }
                );
        }


        if (
            showSearchButton
        ) {
            showSearchButton
                .addEventListener(
                    "click",
                    () => {
                        showPage("search");
                    }
                );
        }
        
        const articleNameInput =
            byId(
                "article-name"
            );


        const checkNameButton =
            byId(
                "check-name-button"
            );


        const useSuggestionButton =
            byId(
                "use-suggested-name"
            );


        const ciphertextInput =
            byId(
                "ciphertext"
            );


        const storageHoursInput =
            byId(
                "storage-hours"
            );


        const payButton =
            byId(
                "pay-button"
            );


        const publishForm =
            byId(
                "publish-form"
            );


        const searchForm =
            byId(
                "search-form"
            );


        const copyNameButton =
            byId(
                "copy-article-name"
            );


        const copyCiphertextButton =
            byId(
                "copy-ciphertext"
            );


        /*
         * Article Name
         */

        if (
            articleNameInput
        ) {
            articleNameInput
                .addEventListener(
                    "input",
                    resetArticleNameVerification
                );
        }


        if (
            checkNameButton
        ) {
            checkNameButton
                .addEventListener(
                    "click",
                    handleCheckArticleName
                );
        }


        if (
            useSuggestionButton
        ) {
            useSuggestionButton.hidden =
                true;


            useSuggestionButton
                .addEventListener(
                    "click",
                    handleUseSuggestedName
                );
        }


        /*
         * Ciphertext
         */

        if (
            ciphertextInput
        ) {
            ciphertextInput
                .addEventListener(
                    "input",
                    () => {
                        resetPayment();

                        updateQuote();
                    }
                );
        }


        /*
         * Storage Hours
         */

        if (
            storageHoursInput
        ) {
            storageHoursInput
                .addEventListener(
                    "input",
                    () => {
                        resetPayment();

                        updateQuote();
                    }
                );
        }


        /*
         * Fake Payment
         */

        if (
            payButton
        ) {
            payButton.disabled =
                true;


            payButton
                .addEventListener(
                    "click",
                    handleFakePayment
                );
        }


        /*
         * Publish Form
         */

        if (
            publishForm
        ) {
            publishForm
                .addEventListener(
                    "submit",
                    handleSend
                );
        }


        /*
         * Search Form
         */

        if (
            searchForm
        ) {
            searchForm
                .addEventListener(
                    "submit",
                    handleSearch
                );
        }


        /*
         * Copy Published Article Name
         */

        if (
            copyNameButton
        ) {
            copyNameButton.disabled =
                true;


            copyNameButton
                .addEventListener(
                    "click",
                    async () => {
                        await copyText(
                            copyNameButton
                                .dataset
                                .copyValue,

                            copyNameButton
                        );
                    }
                );
        }


        /*
         * Copy Retrieved Ciphertext
         */

        if (
            copyCiphertextButton
        ) {
            copyCiphertextButton.disabled =
                true;


            copyCiphertextButton
                .addEventListener(
                    "click",
                    async () => {
                        await copyText(
                            copyCiphertextButton
                                .dataset
                                .copyValue,

                            copyCiphertextButton
                        );
                    }
                );
        }


        updateQuote();

        updateSendButton();
    }
);