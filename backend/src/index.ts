import { config } from 'dotenv';
import path from 'path';
import {pingAll} from "./jobs/PingServerJob";
import {connect} from "mongoose";
import Users from "./models/Users";
import {hashPassword} from "./utils/Encryption";
import Permissions from "./utils/Permissions";
import { runSetup, runAdminOnlySetup, detectSetupMode, SetupResult } from "./setup/setup";

const skipSetup = process.argv.includes("--skip-setup");

let pingJob: ReturnType<typeof setInterval>;
let apiServer: any;

async function boot() {
    const envPath = path.resolve(__dirname, "../.env");
    let setupResult: SetupResult | null = null;

    // Run full setup wizard if .env is missing/incomplete
    if (!skipSetup) {
        const mode = detectSetupMode(envPath);
        if (mode === "full") {
            setupResult = await runSetup();
        }
    }

    // Load .env (either pre-existing or just created by setup)
    config();

    // Connect to MongoDB
    await connect(process.env.mongodb_uri as string, {
        dbName: "tracker"
    });
    console.log("Connected to MongoDB");

    // Admin user creation
    if ((await Users.find()).length === 0) {
        if (setupResult) {
            // Use credentials from full setup wizard
            console.log(`Creating admin user "${setupResult.adminUsername}"...`);
            const pwData = await hashPassword(setupResult.adminPassword);
            await new Users({
                name: setupResult.adminUsername,
                password: pwData,
                permissions: Permissions.all
            }).save();
            console.log("Admin user created");
        } else if (!skipSetup) {
            // .env existed but DB has no users - run admin-only setup
            const adminResult = await runAdminOnlySetup();
            console.log(`Creating admin user "${adminResult.adminUsername}"...`);
            const pwData = await hashPassword(adminResult.adminPassword);
            await new Users({
                name: adminResult.adminUsername,
                password: pwData,
                permissions: Permissions.all
            }).save();
            console.log("Admin user created");
        } else {
            // --skip-setup: legacy fallback
            console.log("No users found, creating default admin user");
            const pwData = await hashPassword("changeme");
            await new Users({
                name: "admin",
                password: pwData,
                permissions: Permissions.all
            }).save();
        }
    }

    // Start services
    pingJob = setInterval(pingAll, parseInt(process.env.ping_rate as string));
    console.log("Started ping job");

    apiServer = require("./api/ApiServer");
    console.log("Started API server");
}

boot();
