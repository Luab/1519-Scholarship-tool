#!/usr/bin/env -S deno run -A --unstable --watch

import {
    dirname,
    extname,
    fromFileUrl,
    join,
} from "https://deno.land/std@0.211.0/path/mod.ts";
import { contentType } from "https://deno.land/std@0.211.0/media_types/content_type.ts";
import { bundle } from "https://deno.land/x/emit@0.32.0/mod.ts";
import { createCache } from "https://deno.land/x/deno_cache@0.6.2/mod.ts";
import { serveFile } from "https://deno.land/std@0.211.0/http/file_server.ts";
import { DbUser, DbUserDoc, ResInfo } from "./shared.ts";
import Papa from "https://esm.sh/papaparse@5.4.1";

const __dirname = dirname(fromFileUrl(import.meta.url));

const db = await Deno.openKv(join(__dirname, "../db"));

function dbUserDocDefault(): DbUserDoc {
    return { seen: false, comment: "" };
}

function dbUserDefault(): DbUser {
    return {
        rate: 0,
        comment: "",
        docs: {}, // This will be serialized as a JSON string
        firstName: "",
        lastName: "",
        email: "",
        cv: "",
        motivationalLetter: "",
        recommendationLetter: "",
        transcript: "",
        almostAStudent: "",
    };
}

async function dbUserList() {
    const users = await Array.fromAsync(db.list({ prefix: ["user"] }), async (entry) => {
        const user = entry.value as DbUser;
        return [
            entry.key[1] as string, // The key is now based on firstName_lastName
            {
                ...user,
                docs: user.docs, // No need to parse, as it's already an object
            },
        ];
    });
    return new Map(users);
}

async function dbUserUpdate(user_id: string, f: (x: DbUser) => void) {
    const key = ["user", user_id];
    const user = (await db.get(key)).value as DbUser ?? dbUserDefault();
    f(user);
    await db.set(key, {
        ...user,
        docs: user.docs, // No need to stringify, as it's already an object
    });
}

async function loadCsvData() {
    const csvPath = join(__dirname, "../Form bc716d471a6747858a2b140c6c8e5589_all.csv");
    const csvData = await Deno.readTextFile(csvPath);

    // Parse the CSV data using papaparse
    const results = Papa.parse(csvData, {
        header: true, // Use the first row as headers
        skipEmptyLines: true, // Skip empty lines
        dynamicTyping: true, // Automatically convert numeric fields to numbers
    });

    // Check for errors
    if (results.errors.length > 0) {
        console.error("Errors while parsing CSV:", results.errors);
        throw new Error("Failed to parse CSV file");
    }

    const records = results.data; // Parsed records

    console.log("Parsed CSV records:", records); // Debugging: Log parsed records

    for (const record of records) {
        // Debugging: Log the entire record to see its structure
        console.log("Processing record:", record);

        // Extract fields from the CSV record using the column headers as keys
        const firstName = record["First name"] || ""; // First name from CSV (optional)
        const lastName = record["Last name"] || ""; // Last name from CSV (optional)
        const email = record["Your innopolis mail"] || ""; // Email from CSV (optional)
        const cv = record["CV"] || ""; // CV file path from CSV (optional)
        const motivationalLetter = record["Motivational letter"] || ""; // Motivational letter file path from CSV (optional)
        const recommendationLetter = record["Recommendation letter"] || ""; // Recommendation letter file path from CSV (optional)
        const transcript = record["Transcript"] || ""; // Transcript file path from CSV (optional)
        const almostAStudent = record["Almost “A” student"] || ""; // "Almost A" student document from CSV (optional)

        // Generate a unique user ID based on first and last names
        const user_id = `${firstName}_${lastName}`.toLowerCase().replace(/\s+/g, "_");

        // Ensure all fields are of supported types and handle missing/empty fields
        const user = {
            rate: 0, // Default rate (number)
            comment: "", // Default comment (string)
            docs: {}, // Initialize docs as an empty object
            firstName: firstName,
            lastName: lastName,
            email: email,
            cv: cv,
            motivationalLetter: motivationalLetter,
            recommendationLetter: recommendationLetter,
            transcript: transcript,
            almostAStudent: almostAStudent,
        };

        // Debugging: Log the user object before storing it in the database
        console.log("User object to be stored:", user);

        // Store the serialized user in Deno KV
        await db.set(["user", user_id], user);
    }
}
await loadCsvData();

async function indexHtml() {
    const cache = createCache();
    const js = (await bundle(import.meta.resolve("./index.tsx"), {
        async load(specifier) {
            if (specifier.startsWith("https://esm.sh/")) {
                return { specifier, content: null!, kind: "external" };
            }
            return await cache.load(specifier);
        },
    })).code;
    return `<!DOCTYPE html>
<html>
    <head>
        <meta charSet="UTF-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/index.css" />
        <title>1519</title>
    </head>
    <body>
        <div preact></div>
        <script type="module">
${js}
        </script>
    </body>
</html>
`;
}

async function rankingHtml() {
    const cache = createCache();
    const js = (await bundle(import.meta.resolve("./index.tsx"), {
        async load(specifier) {
            if (specifier.startsWith("https://esm.sh/")) {
                return { specifier, content: null!, kind: "external" };
            }
            return await cache.load(specifier);
        },
    })).code;
    return `<!DOCTYPE html>
<html>
    <head>
        <meta charSet="UTF-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/index.css" />
        <title>Ranking - 1519</title>
    </head>
    <body>
        <div preact></div>
        <script type="module">
${js}
        </script>
    </body>
</html>
`;
}

await Deno.serve({ port: 8080 }, async (req) => {
    const url = new URL(req.url);

    // Decode the URL-encoded path
    const decodedPath = decodeURIComponent(url.pathname);

    // Serve files from the correct directory
    if (decodedPath.startsWith("/Form bc716d471a6747858a2b140c6c8e5589/")) {
        const filePath = join(__dirname, "../", decodedPath);
        try {
            const file = await Deno.readFile(filePath);
            return new Response(file, {
                headers: { "Content-Type": contentType(extname(filePath)) || "application/octet-stream" },
            });
        } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
                return new Response("File not found", { status: 404 });
            }
            return new Response("Internal server error", { status: 500 });
        }
    }

    // Handle other routes (e.g., /info.json, /user, etc.)
    if (url.pathname === "/info.json") {
        const db = await dbUserList();
        const res: ResInfo = {};
        for (const [user_id, user] of db) {
            res[user_id] = {
                ...user,
                name: `${user.firstName} ${user.lastName}`,
            };
        }
        return Response.json(res);
    }

    if (url.pathname === "/user") {
        if (req.method !== "PUT") {
            return new Response(null, { status: 405 });
        }
        const [user_id, { rate, comment }] = await req.json();
        await dbUserUpdate(
            user_id,
            (user) => Object.assign(user, { rate, comment }),
        );
        return new Response();
    }

    if (url.pathname === "/user/doc") {
        if (req.method !== "PUT") {
            return new Response(null, { status: 405 });
        }
        const [user_id, doc_id, { seen, comment }] = await req.json();
        await dbUserUpdate(
            user_id,
            (user) => user.docs[doc_id] = { seen, comment },
        );
        return new Response();
    }
        if (url.pathname === "/") {
        return new Response(await indexHtml(), { headers: [["Content-Type", "text/html"]] });
    }

    if (url.pathname === "/index.css") {
        return serveFile(req, join(__dirname, url.pathname));
    }
    if (url.pathname === "/ranking") {
        return new Response(await rankingHtml(), { headers: [["Content-Type", "text/html"]] });
    }
    return new Response("Not found", { status: 404 });
}).finished;