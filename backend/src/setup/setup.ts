import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import {
    validateMongoUri,
    validatePort,
    validatePingRate,
    validateUsername,
    validatePassword,
    validateFilePath,
    formatMsToHuman
} from "./validation";

export interface SetupResult {
    adminUsername: string;
    adminPassword: string;
}

function header(text: string): void {
    console.log("\n" + chalk.bold.cyan(`  === ${text} ===`) + "\n");
}

function ok(text: string): void {
    console.log(chalk.green("  [OK] ") + text);
}

function info(text: string): void {
    console.log(chalk.cyan("  [INFO] ") + text);
}

function warn(text: string): void {
    console.log(chalk.yellow("  [WARN] ") + text);
}

/**
 * Detect whether the full setup wizard or just admin setup is needed.
 * - "full": .env missing or mongodb_uri not set
 * - "env-exists": .env is present and has mongodb_uri
 */
export function detectSetupMode(envPath: string): "full" | "env-exists" {
    if (!fs.existsSync(envPath)) {
        return "full";
    }

    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("mongodb_uri=")) {
            const value = trimmed.substring("mongodb_uri=".length).trim();
            if (value.length > 0) {
                return "env-exists";
            }
        }
    }

    return "full";
}

/**
 * Full setup wizard: configures .env and collects admin credentials.
 */
export async function runSetup(): Promise<SetupResult> {
    header("RedTrack - First Time Setup");
    info("Welcome! Let's configure your RedTrack server.");

    // --- Database ---
    header("Database Configuration");

    const { mongodbUri } = await inquirer.prompt([
        {
            type: "input",
            name: "mongodbUri",
            message: "MongoDB connection URI:",
            default: "mongodb://localhost:27017",
            validate: (input: string) => {
                const result = validateMongoUri(input);
                return result === true ? true : result;
            }
        }
    ]);

    // --- Server ---
    header("Server Configuration");

    const { backendPort } = await inquirer.prompt([
        {
            type: "input",
            name: "backendPort",
            message: "Backend API port:",
            default: "3001",
            validate: (input: string) => {
                const result = validatePort(input);
                return result === true ? true : result;
            }
        }
    ]);

    const { pingRate } = await inquirer.prompt([
        {
            type: "input",
            name: "pingRate",
            message: "Server ping interval in milliseconds:",
            default: "3000",
            validate: (input: string) => {
                const result = validatePingRate(input);
                return result === true ? true : result;
            }
        }
    ]);

    const pingMs = parseInt(pingRate, 10);
    console.log(chalk.dim(`    Servers will be pinged every ${formatMsToHuman(pingMs)}`));

    const { devMode } = await inquirer.prompt([
        {
            type: "confirm",
            name: "devMode",
            message: "Enable development mode?",
            default: false
        }
    ]);

    // --- HTTPS ---
    header("HTTPS Configuration");

    const { httpsEnabled } = await inquirer.prompt([
        {
            type: "confirm",
            name: "httpsEnabled",
            message: "Enable HTTPS?",
            default: false
        }
    ]);

    let httpsKeyPath = "";
    let httpsCertPath = "";

    if (httpsEnabled) {
        const httpsAnswers = await inquirer.prompt([
            {
                type: "input",
                name: "httpsKeyPath",
                message: "Path to SSL private key file:",
                validate: (input: string) => {
                    const result = validateFilePath(input);
                    return result === true ? true : result;
                }
            },
            {
                type: "input",
                name: "httpsCertPath",
                message: "Path to SSL certificate file:",
                validate: (input: string) => {
                    const result = validateFilePath(input);
                    return result === true ? true : result;
                }
            }
        ]);

        httpsKeyPath = httpsAnswers.httpsKeyPath;
        httpsCertPath = httpsAnswers.httpsCertPath;
        ok("SSL certificate files verified");
    }

    // --- Write .env ---
    const envPath = path.resolve(__dirname, "../../.env");

    let envContent = "";
    envContent += `mongodb_uri=${mongodbUri}\n`;
    envContent += `backend_port=${backendPort}\n`;
    envContent += `dev=${devMode}\n`;
    envContent += `ping_rate=${pingRate}\n`;

    if (httpsEnabled) {
        envContent += `backend_https_enabled=true\n`;
        envContent += `backend_https_key_path=${httpsKeyPath}\n`;
        envContent += `backend_https_cert_path=${httpsCertPath}\n`;
    }

    fs.writeFileSync(envPath, envContent, "utf-8");
    ok(".env file saved");

    // Reload dotenv so the new values are available
    const dotenv = require("dotenv");
    dotenv.config({ path: envPath, override: true });

    // --- Admin ---
    const adminResult = await runAdminSetup();

    header("Setup Complete");
    ok("RedTrack is configured and ready to start!\n");

    return adminResult;
}

/**
 * Admin-only setup: collects username and password for the first admin account.
 */
export async function runAdminOnlySetup(): Promise<SetupResult> {
    warn("No admin users found in the database.");
    return await runAdminSetup();
}

async function runAdminSetup(): Promise<SetupResult> {
    header("Admin Account Setup");
    info("Create the initial administrator account.");

    const { username } = await inquirer.prompt([
        {
            type: "input",
            name: "username",
            message: "Admin username:",
            default: "admin",
            validate: (input: string) => {
                const result = validateUsername(input);
                return result === true ? true : result;
            }
        }
    ]);

    let password: string;

    while (true) {
        const { pw } = await inquirer.prompt([
            {
                type: "password",
                name: "pw",
                message: "Admin password:",
                mask: "*",
                validate: (input: string) => {
                    const result = validatePassword(input);
                    return result === true ? true : result;
                }
            }
        ]);

        const { confirmPw } = await inquirer.prompt([
            {
                type: "password",
                name: "confirmPw",
                message: "Confirm password:",
                mask: "*"
            }
        ]);

        if (pw === confirmPw) {
            password = pw;
            break;
        }

        console.log(chalk.red("  Passwords do not match. Please try again.\n"));
    }

    ok(`Admin account "${username}" will be created on boot.`);

    return { adminUsername: username, adminPassword: password };
}
