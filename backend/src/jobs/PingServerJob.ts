import { ping } from "bedrock-protocol";
import {ServerData} from "../../../types/ServerData";
import Server from '../models/Server';
import Pings from "../models/Pings";

async function pingServer(data : ServerData) {
    const timestamp = Math.floor(Date.now());
    try {
        let pingData = await ping({
            host: data.ip.valueOf(),
            port: data.port.valueOf()
        })

        await new Pings({
            server: data.serverId,
            playerCount: pingData.playersOnline,
            timestamp: timestamp
        }).save();
    } catch(e) {
    }
}

async function pingAll() {
    // @ts-ignore
    (await Server.find()).forEach(async (srv) => {
        await pingServer({ip: srv.ip, port: srv.port, name: srv.name, serverId: srv._id} as any as ServerData);
    });
}

export { pingServer, pingAll }