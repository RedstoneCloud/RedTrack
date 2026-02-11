import fs from "fs";

type ValidationResult = true | string;

function validateMongoUri(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return "MongoDB URI cannot be empty";
    if (!trimmed.startsWith("mongodb://") && !trimmed.startsWith("mongodb+srv://")) {
        return "URI must start with mongodb:// or mongodb+srv://";
    }
    return true;
}

function validatePort(input: string): ValidationResult {
    const num = parseInt(input, 10);
    if (isNaN(num)) return "Port must be a number";
    if (num < 1 || num > 65535) return "Port must be between 1 and 65535";
    return true;
}

function validatePingRate(input: string): ValidationResult {
    const num = parseInt(input, 10);
    if (isNaN(num)) return "Ping rate must be a number";
    if (num < 1000) return "Ping rate must be at least 1000ms (1 second)";
    if (num > 3600000) return "Ping rate must be at most 3600000ms (1 hour)";
    return true;
}

function validateUsername(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return "Username cannot be empty";
    if (trimmed.length < 3) return "Username must be at least 3 characters";
    if (trimmed.length > 32) return "Username must be 32 characters or fewer";
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return "Username can only contain letters, numbers, underscores, and hyphens";
    }
    return true;
}

function validatePassword(input: string): ValidationResult {
    if (input.length < 6) return "Password must be at least 6 characters";
    if (input.length > 128) return "Password must be 128 characters or fewer";
    return true;
}

function validateFilePath(input: string): ValidationResult {
    const trimmed = input.trim();
    if (!trimmed) return "File path cannot be empty";
    if (!fs.existsSync(trimmed)) return `File not found: ${trimmed}`;
    return true;
}

function formatMsToHuman(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""}`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)} minute${minutes !== 1 ? "s" : ""}`;
}

export {
    validateMongoUri,
    validatePort,
    validatePingRate,
    validateUsername,
    validatePassword,
    validateFilePath,
    formatMsToHuman,
    ValidationResult
};
