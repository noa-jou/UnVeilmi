const API_BASE_URL = "http://127.0.0.1:8000";

const MAX_ARTICLE_NAME_LENGTH = 50;
const MIN_STORAGE_HOURS = 1;
const MAX_STORAGE_HOURS = 8760;

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

const BYTES_PER_KB = 1024;
const HOURS_PER_DAY = 24;
const USD_PER_KB_DAY = 1;


const publishState = {
    verifiedArticleName: null,
    verifiedCiphertext: null,

    paymentCompleted: false,
    paymentFingerprint: null,
};


/* -------------------------------------------------
   General helpers
------------------------------------------------- */

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

    if (window.crypto?.getRandomValues) {
        const values =
            new Uint32Array(1);

        window.crypto
            .getRandomValues(values);

        return values[0] % max;
    }

    return Math.floor(
        Math.random() * max
    );
}


/* -------------------------------------------------
   API helpers
------------------------------------------------- */

function formatApiError(data, status) {

    if (
        typeof data?.detail === "string"
    ) {
        return data.detail;
    }


    if (
        Array.isArray(data?.detail)
    ) {
        return data.detail
            .map((item) => {

                const location =
                    Array.isArray(item.loc)
                        ? item.loc.join(" → ")
                        : "request";


                return (
                    `${location}: ${item.msg}`
                );
            })
            .join("; ");
    }


    if (
        data?.detail &&
        typeof data.detail === "object"
    ) {
        try {
            return JSON.stringify(
                data.detail
            );
        } catch {
            // Use generic message below.
        }
    }


    return (
        `Request failed with status ${status}.`
    );
}


async function apiRequest(
    path,
    options = {}
) {

    const response =
        await fetch(
            `${API_BASE_URL}${path}`,
            options
        );


    let data = null;


    try {
        data =
            await response.json();
    } catch {
        data = null;
    }


    if (!response.ok) {

        const error =
            new Error(
                formatApiError(
                    data,
                    response.status
                )
            );


        error.status =
            response.status;

        error.data =
            data;


        throw error;
    }


    return data;
}


async function checkArticleName(
    articleName
) {

    const query =
        new URLSearchParams({
            article_name:
                articleName,
        });


    return apiRequest(
        `/posts/check-name?${query.toString()}`
    );
}


async function getPost(
    articleName
) {

    return apiRequest(
        `/posts/${encodeURIComponent(articleName)}`
    );
}


async function createPost(
    post
) {

    return apiRequest(
        "/posts",
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/json",
            },

            body:
                JSON.stringify(post),
        }
    );
}


async function copyText(
    text,
    button
) {

    if (!text) {
        return;
    }


    await navigator.clipboard
        .writeText(text);


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


/* -------------------------------------------------
   Veilmi format validation
------------------------------------------------- */

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
        !/^[A-Za-z0-9_-]+={0,2}$/
            .test(value)
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
        typeof encodedMessage
        !== "string"
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
                )
                    .decode(
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
            typeof envelope.k
            !== "string"
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
            of [
                "s",
                "n",
                "c",
                "m",
            ]
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


/* -------------------------------------------------
   Article Name
------------------------------------------------- */

function validateArticleNameLocally(
    articleName
) {

    const length =
        unicodeLength(
            articleName
        );


    if (
        length === 0
    ) {
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
                `Article Name is ${length} characters. `
                +
                `Maximum is ${MAX_ARTICLE_NAME_LENGTH}.`,
        };
    }


    return {
        valid: true,
        message: "",
    };
}


function updateArticleNameCount() {

    const value =
        byId("article-name")
            ?.value
        ?? "";


    setText(
        byId(
            "article-name-count"
        ),

        `${unicodeLength(value)} / ${MAX_ARTICLE_NAME_LENGTH} characters`
    );
}


function createTypoCandidates(
    articleName
) {

    const characters =
        Array.from(
            articleName
        );


    const candidates =
        [];


    for (
        let i = 0;
        i < characters.length - 1;
        i += 1
    ) {

        if (
            characters[i]
            === characters[i + 1]
            ||
            /\s/.test(
                characters[i]
            )
            ||
            /\s/.test(
                characters[i + 1]
            )
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
            candidate
            !== articleName
            &&
            !candidates.includes(
                candidate
            )
            &&
            unicodeLength(
                candidate
            )
            <=
            MAX_ARTICLE_NAME_LENGTH
        ) {
            candidates.push(
                candidate
            );
        }
    }


    for (
        let i =
            candidates.length - 1;

        i > 0;

        i -= 1
    ) {

        const j =
            randomInt(
                i + 1
            );


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


function createFallbackCandidate(
    articleName
) {

    const suffix =
        String(
            randomInt(90)
            + 10
        );


    const characters =
        Array.from(
            articleName
        );


    while (
        characters.length
        +
        suffix.length
        +
        1
        >
        MAX_ARTICLE_NAME_LENGTH
    ) {
        characters.pop();
    }


    return (
        `${characters.join("")}-${suffix}`
    );
}


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


function resetArticleNameVerification() {

    publishState
        .verifiedArticleName =
        null;


    setText(
        byId(
            "article-name-status"
        ),
        ""
    );


    setText(
        byId(
            "article-name-suggestion"
        ),
        ""
    );


    const button =
        byId(
            "use-suggested-name"
        );


    if (button) {

        button.hidden =
            true;


        delete (
            button
                .dataset
                .suggestion
        );
    }


    updateArticleNameCount();

    updateSendButton();
}


async function handleCheckArticleName() {

    const input =
        byId(
            "article-name"
        );


    const status =
        byId(
            "article-name-status"
        );


    const suggestionText =
        byId(
            "article-name-suggestion"
        );


    const button =
        byId(
            "use-suggested-name"
        );


    const articleName =
        input.value.trim();


    const validation =
        validateArticleNameLocally(
            articleName
        );


    publishState
        .verifiedArticleName =
        null;


    setText(
        suggestionText,
        ""
    );


    if (button) {

        button.hidden =
            true;


        delete (
            button
                .dataset
                .suggestion
        );
    }


    if (
        !validation.valid
    ) {

        setText(
            status,
            validation.message
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
                "Article Name is available. ✓"
            );


            updateSendButton();

            return;
        }


        setText(
            status,

            "Article Name is already in use. Looking for a suggestion..."
        );


        const suggestion =
            await findAvailableArticleNameSuggestion(
                articleName
            );


        if (
            !suggestion
        ) {

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


        if (button) {

            button.hidden =
                false;


            button
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
        button
            ?.dataset
            .suggestion;


    if (
        !suggestion
        ||
        !input
    ) {
        return;
    }


    input.value =
        suggestion;


    publishState
        .verifiedArticleName =
        suggestion;


    setText(
        byId(
            "article-name-status"
        ),

        "Suggested Article Name is available. ✓"
    );


    setText(
        byId(
            "article-name-suggestion"
        ),
        ""
    );


    button.hidden =
        true;


    updateArticleNameCount();

    updateSendButton();
}


/* -------------------------------------------------
   Ciphertext
------------------------------------------------- */

function resetCiphertextVerification() {

    publishState
        .verifiedCiphertext =
        null;


    setText(
        byId(
            "ciphertext-status"
        ),
        ""
    );


    resetPayment();

    clearQuote();

    updateSendButton();
}


function handleCheckCiphertext() {

    const ciphertext =
        byId(
            "ciphertext"
        )
            .value
            .trim();


    const result =
        validateVeilmiCiphertext(
            ciphertext
        );


    if (
        !result.valid
    ) {

        publishState
            .verifiedCiphertext =
            null;


        setText(
            byId(
                "ciphertext-status"
            ),

            `Invalid Veilmi ciphertext: ${result.message}`
        );


        resetPayment();

        clearQuote();

        updateSendButton();

        return;
    }


    publishState
        .verifiedCiphertext =
        ciphertext;


    setText(
        byId(
            "ciphertext-status"
        ),

        "Valid Veilmi ciphertext. ✓"
    );


    resetPayment();

    updateQuote();

    updateSendButton();
}


function handleClearCiphertext() {

    const input =
        byId(
            "ciphertext"
        );


    input.value =
        "";


    resetCiphertextVerification();

    input.focus();
}


/* -------------------------------------------------
   Storage validation and pricing
------------------------------------------------- */

function validateStorageHours(
    rawValue
) {

    if (
        rawValue === ""
    ) {
        return {
            valid: false,

            message:
                "Please enter a storage duration.",
        };
    }


    const hours =
        Number(
            rawValue
        );


    if (
        !Number.isInteger(hours)
        ||
        hours
        <
        MIN_STORAGE_HOURS
    ) {
        return {
            valid: false,

            message:
                `Storage duration must be at least ${MIN_STORAGE_HOURS} hour.`,
        };
    }


    if (
        hours
        >
        MAX_STORAGE_HOURS
    ) {
        return {
            valid: false,

            message:
                `Storage duration cannot exceed ${MAX_STORAGE_HOURS} hours (365 days).`,
        };
    }


    return {
        valid: true,

        hours,

        message: "",
    };
}


function calculateDemoPrice(
    ciphertextBytes,
    storageHours
) {

    const freeTier =
        ciphertextBytes
        <=
        BYTES_PER_KB
        &&
        storageHours
        <=
        HOURS_PER_DAY;


    if (
        freeTier
    ) {
        return {
            freeTier: true,

            rawPrice: 0,

            price: 0,
        };
    }


    const rawPrice =
        (
            ciphertextBytes
            /
            BYTES_PER_KB
        )
        *
        (
            storageHours
            /
            HOURS_PER_DAY
        )
        *
        USD_PER_KB_DAY;


    return {
        freeTier: false,

        rawPrice,

        price:
            Math.ceil(
                rawPrice
            ),
    };
}


function clearQuote() {

    setText(
        byId(
            "quote-size"
        ),
        "—"
    );


    setText(
        byId(
            "quote-hours"
        ),
        "—"
    );


    setText(
        byId(
            "quote-calculation"
        ),
        "—"
    );


    setText(
        byId(
            "quote-price"
        ),
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


        payButton.textContent =
            "Pay";
    }
}


function getCurrentQuote() {

    const ciphertext =
        byId(
            "ciphertext"
        )
            ?.value
            .trim()
        ?? "";


    const storageRawValue =
        byId(
            "storage-hours"
        )
            ?.value
        ?? "";


    if (
        publishState
            .verifiedCiphertext
        !==
        ciphertext
        ||
        !ciphertext
    ) {
        return {
            valid: false,

            reason:
                "Please check the Veilmi ciphertext first.",
        };
    }


    const storageValidation =
        validateStorageHours(
            storageRawValue
        );


    if (
        !storageValidation.valid
    ) {
        return {
            valid: false,

            reason:
                storageValidation.message,
        };
    }


    const ciphertextBytes =
        getCiphertextByteSize(
            ciphertext
        );


    const pricing =
        calculateDemoPrice(
            ciphertextBytes,

            storageValidation.hours
        );


    return {
        valid: true,

        ciphertext,

        ciphertextBytes,

        storageHours:
            storageValidation.hours,

        freeTier:
            pricing.freeTier,

        rawPrice:
            pricing.rawPrice,

        price:
            pricing.price,
    };
}


function updateQuote() {

    const storageRawValue =
        byId(
            "storage-hours"
        )
            ?.value
        ?? "";


    const storageValidation =
        validateStorageHours(
            storageRawValue
        );


    setText(
        byId(
            "storage-status"
        ),

        storageValidation.valid
            ? ""
            : storageValidation.message
    );


    const quote =
        getCurrentQuote();


    if (
        !quote.valid
    ) {

        clearQuote();

        updateSendButton();

        return;
    }


    setText(
        byId(
            "quote-size"
        ),

        `${quote.ciphertextBytes} bytes`
    );


    setText(
        byId(
            "quote-hours"
        ),

        `${quote.storageHours} hours`
    );


    if (
        quote.freeTier
    ) {

        setText(
            byId(
                "quote-calculation"
            ),

            `Free tier: ${quote.ciphertextBytes} bytes ≤ 1024 bytes `
            +
            `and ${quote.storageHours} hours ≤ 24 hours.`
        );

    } else {

        setText(
            byId(
                "quote-calculation"
            ),

            `ceil((${quote.ciphertextBytes} ÷ 1024) × `
            +
            `(${quote.storageHours} ÷ 24) × USD 1) `
            +
            `= USD ${quote.price}`
        );
    }


    setText(
        byId(
            "quote-price"
        ),

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
            quote.price === 0

                ? "Confirm Free Storage"

                : `Pay USD ${quote.price}`;
    }


    updateSendButton();
}


/* -------------------------------------------------
   Fake payment
------------------------------------------------- */

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


function resetPayment() {

    publishState
        .paymentCompleted =
        false;


    publishState
        .paymentFingerprint =
        null;


    setText(
        byId(
            "payment-status"
        ),
        ""
    );
}


function handleFakePayment() {

    const quote =
        getCurrentQuote();


    if (
        !quote.valid
    ) {

        resetPayment();


        setText(
            byId(
                "payment-status"
            ),

            quote.reason
        );


        updateSendButton();

        return;
    }


    publishState
        .paymentCompleted =
        true;


    publishState
        .paymentFingerprint =
        quoteFingerprint(
            quote
        );


    if (
        quote.price === 0
    ) {

        setText(
            byId(
                "payment-status"
            ),

            "Free storage confirmed — USD 0. ✓"
        );

    } else {

        setText(
            byId(
                "payment-status"
            ),

            `Payment successful — USD ${quote.price} (simulation). ✓`
        );
    }


    updateSendButton();
}


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


/* -------------------------------------------------
   Send / Publish
------------------------------------------------- */

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


    const articleName =
        byId(
            "article-name"
        )
            ?.value
            .trim()
        ?? "";


    const ciphertext =
        byId(
            "ciphertext"
        )
            ?.value
            .trim()
        ?? "";


    const quote =
        getCurrentQuote();


    const articleNameVerified =
        publishState
            .verifiedArticleName
        ===
        articleName
        &&
        articleName !== "";


    const ciphertextVerified =
        publishState
            .verifiedCiphertext
        ===
        ciphertext
        &&
        ciphertext !== "";


    sendButton.disabled =
        !(
            articleNameVerified
            &&
            ciphertextVerified
            &&
            quote.valid
            &&
            paymentMatchesCurrentQuote()
        );
}

/* -------------------------------------------------
   Reset Publish Form After Success
------------------------------------------------- */

function resetPublishFormAfterSuccess() {

    /*
     * Clear the completed post inputs.
     */

    const articleNameInput =
        byId(
            "article-name"
        );


    const ciphertextInput =
        byId(
            "ciphertext"
        );


    const storageHoursInput =
        byId(
            "storage-hours"
        );


    if (
        articleNameInput
    ) {
        articleNameInput.value =
            "";
    }


    if (
        ciphertextInput
    ) {
        ciphertextInput.value =
            "";
    }


    /*
     * Return storage duration to its default value.
     */

    if (
        storageHoursInput
    ) {
        storageHoursInput.value =
            "24";
    }


    /*
     * Clear all validation states.
     */

    publishState
        .verifiedArticleName =
        null;


    publishState
        .verifiedCiphertext =
        null;


    publishState
        .paymentCompleted =
        false;


    publishState
        .paymentFingerprint =
        null;


    /*
     * Clear validation messages.
     */

    setText(
        byId(
            "article-name-status"
        ),
        ""
    );


    setText(
        byId(
            "article-name-suggestion"
        ),
        ""
    );


    setText(
        byId(
            "ciphertext-status"
        ),
        ""
    );


    setText(
        byId(
            "storage-status"
        ),
        ""
    );


    setText(
        byId(
            "payment-status"
        ),
        ""
    );


    setText(
        byId(
            "publish-status"
        ),
        ""
    );


    /*
     * Hide any old Article Name suggestion.
     */

    const suggestionButton =
        byId(
            "use-suggested-name"
        );


    if (
        suggestionButton
    ) {
        suggestionButton.hidden =
            true;


        delete (
            suggestionButton
                .dataset
                .suggestion
        );
    }


    /*
     * Reset quote and buttons.
     */

    clearQuote();


    const sendButton =
        byId(
            "send-button"
        );


    if (
        sendButton
    ) {
        sendButton.disabled =
            true;
    }


    /*
     * Reset Article Name counter.
     */

    updateArticleNameCount();
}



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


    const ciphertext =
        byId(
            "ciphertext"
        )
            .value
            .trim();


    const publishStatus =
        byId(
            "publish-status"
        );


    const nameValidation =
        validateArticleNameLocally(
            articleName
        );


    if (
        !nameValidation.valid
    ) {

        setText(
            publishStatus,

            nameValidation.message
        );


        resetArticleNameVerification();

        return;
    }


    if (
        publishState
            .verifiedArticleName
        !==
        articleName
    ) {

        setText(
            publishStatus,

            "Please check the Article Name again before sending."
        );


        updateSendButton();

        return;
    }


    if (
        publishState
            .verifiedCiphertext
        !==
        ciphertext
    ) {

        setText(
            publishStatus,

            "Please check the Veilmi ciphertext again before sending."
        );


        updateSendButton();

        return;
    }


    const finalVeilmiCheck =
        validateVeilmiCiphertext(
            ciphertext
        );


    if (
        !finalVeilmiCheck.valid
    ) {

        publishState
            .verifiedCiphertext =
            null;


        setText(
            publishStatus,

            `Cannot send: ${finalVeilmiCheck.message}`
        );


        resetPayment();

        clearQuote();

        updateSendButton();

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

        updateSendButton();

        return;
    }


    if (
        !paymentMatchesCurrentQuote()
    ) {

        setText(
            publishStatus,

            "Payment or free-storage confirmation is missing, or no longer matches the current post."
        );


        resetPayment();

        updateSendButton();

        return;
    }


    setText(
        publishStatus,

        "Final Article Name check..."
    );


    try {

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

                "Article Name is already in use."
            );


            setText(
                publishStatus,

                "The Article Name is no longer available."
            );


            updateSendButton();

            return;
        }


        setText(
            publishStatus,

            "Sending..."
        );


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


        /*
         * Show the successful result first.
         */

        setText(
            byId(
                "published-article-name"
            ),

            result.article_name
        );


        const publishedResult =
            byId(
                "published-result"
            );


        if (
            publishedResult
        ) {
            publishedResult.hidden =
                false;
        }


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
         * Clear the completed Publish form.
         *
         * The Published Article Name above is intentionally
         * NOT cleared, so the user can still copy and share it.
         */

        resetPublishFormAfterSuccess();


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


/* -------------------------------------------------
   Clear Find Result After Copy
------------------------------------------------- */

function clearSearchResultAfterCopy() {

    const articleNameInput =
        byId(
            "search-article-name"
        );


    const retrievedCiphertext =
        byId(
            "retrieved-ciphertext"
        );


    const resultSection =
        byId(
            "search-result"
        );


    const copyButton =
        byId(
            "copy-ciphertext"
        );


    /*
     * Clear the Article Name.
     */

    if (
        articleNameInput
    ) {
        articleNameInput.value =
            "";
    }


    /*
     * Remove the ciphertext from the page.
     */

    setText(
        retrievedCiphertext,
        ""
    );


    /*
     * Hide the result.
     */

    if (
        resultSection
    ) {
        resultSection.hidden =
            true;
    }


    /*
     * Disable Copy Ciphertext again.
     */

    if (
        copyButton
    ) {

        copyButton.disabled =
            true;


        delete (
            copyButton
                .dataset
                .copyValue
        );
    }


    /*
     * Clear the old Find status message.
     */

    setText(
        byId(
            "search-status"
        ),
        ""
    );


    /*
     * Return focus to Article Name.
     */

    articleNameInput
        ?.focus();
}


/* -------------------------------------------------
   Find / Retrieve
------------------------------------------------- */

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


    const copyButton =
        byId(
            "copy-ciphertext"
        );


    const resultSection =
        byId(
            "search-result"
        );


    setText(
        searchStatus,
        ""
    );


    setText(
        retrievedCiphertext,
        ""
    );


    if (
        resultSection
    ) {
        resultSection.hidden =
            true;
    }


    if (
        copyButton
    ) {

        copyButton.disabled =
            true;


        delete (
            copyButton
                .dataset
                .copyValue
        );
    }


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

            "Ciphertext found. ✓"
        );


        setText(
            retrievedCiphertext,

            post.ciphertext
        );


        if (
            resultSection
        ) {
            resultSection.hidden =
                false;
        }


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


/* -------------------------------------------------
   Page navigation
------------------------------------------------- */

function showPage(
    pageName
) {

    const publishPage =
        byId(
            "publish-page"
        );


    const searchPage =
        byId(
            "search-page"
        );


    if (
        !publishPage
        ||
        !searchPage
    ) {
        return;
    }


    const showSearch =
        pageName === "search";


    publishPage.hidden =
        showSearch;


    searchPage.hidden =
        !showSearch;


    byId(
        "show-publish-page"
    )
        ?.setAttribute(
            "aria-current",

            showSearch
                ? "false"
                : "page"
        );


    byId(
        "show-search-page"
    )
        ?.setAttribute(
            "aria-current",

            showSearch
                ? "page"
                : "false"
        );
}


/* -------------------------------------------------
   Page setup
------------------------------------------------- */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        byId(
            "show-publish-page"
        )
            ?.addEventListener(
                "click",
                () => {
                    showPage(
                        "publish"
                    );
                }
            );


        byId(
            "show-search-page"
        )
            ?.addEventListener(
                "click",
                () => {
                    showPage(
                        "search"
                    );
                }
            );


        byId(
            "article-name"
        )
            ?.addEventListener(
                "input",

                resetArticleNameVerification
            );


        byId(
            "check-name-button"
        )
            ?.addEventListener(
                "click",

                handleCheckArticleName
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


            useSuggestionButton
                .addEventListener(
                    "click",

                    handleUseSuggestedName
                );
        }


        byId(
            "ciphertext"
        )
            ?.addEventListener(
                "input",

                resetCiphertextVerification
            );


        byId(
            "check-ciphertext-button"
        )
            ?.addEventListener(
                "click",

                handleCheckCiphertext
            );


        byId(
            "clear-ciphertext-button"
        )
            ?.addEventListener(
                "click",

                handleClearCiphertext
            );


        byId(
            "storage-hours"
        )
            ?.addEventListener(
                "input",
                () => {

                    resetPayment();

                    updateQuote();

                    updateSendButton();
                }
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


            payButton
                .addEventListener(
                    "click",

                    handleFakePayment
                );
        }


        byId(
            "publish-form"
        )
            ?.addEventListener(
                "submit",

                handleSend
            );


        byId(
            "search-form"
        )
            ?.addEventListener(
                "submit",

                handleSearch
            );


        const copyNameButton =
            byId(
                "copy-article-name"
            );


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


                const copyCiphertextButton =
            byId(
                "copy-ciphertext"
            );


        if (
            copyCiphertextButton
        ) {

            /*
             * Copy starts disabled.
             * It becomes enabled only after Find succeeds.
             */

            copyCiphertextButton.disabled =
                true;


            copyCiphertextButton
                .addEventListener(
                    "click",

                    async () => {

                        const ciphertext =
                            copyCiphertextButton
                                .dataset
                                .copyValue;


                        if (
                            !ciphertext
                        ) {
                            return;
                        }


                        try {

                            /*
                             * Copy the ciphertext first.
                             */

                            await navigator.clipboard
                                .writeText(
                                    ciphertext
                                );


                            /*
                             * After a successful copy:
                             *
                             * - clear Article Name
                             * - clear ciphertext
                             * - hide the result
                             * - disable Copy Ciphertext
                             */

                            clearSearchResultAfterCopy();


                        } catch (error) {

                            setText(
                                byId(
                                    "search-status"
                                ),

                                `Could not copy ciphertext: ${error.message}`
                            );
                        }
                    }
                );
        }


        updateArticleNameCount();

        showPage(
            "publish"
        );

        clearQuote();

        updateQuote();

        updateSendButton();
    }
);