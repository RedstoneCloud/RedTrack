import { config } from 'dotenv';
import {pingAll} from "./jobs/PingServerJob";
import {connect} from "mongoose";
import Users from "./models/Users";
import {hashPassword} from "./utils/Encryption";
import Permissions from "./utils/Permissions";

config();


let pingJob;
let apiServer;

async function boot() {
    connect(process.env.mongodb_uri as string, {
        dbName: "tracker"
    });
    console.log("Connected to MongoDB");

    if((await Users.find()).length === 0) {
        console.log("No users found, creating default admin user")
        let pwData = await hashPassword("changeme");
        await new Users({
            name: "admin",
            password: pwData,
            permissions: Permissions.all
        }).save();
    }

    pingJob = setInterval(pingAll, parseInt(process.env.ping_rate as string))
    console.log("Started ping job")

    apiServer = require("./api/ApiServer");
    console.log("Started API server")
}

boot();