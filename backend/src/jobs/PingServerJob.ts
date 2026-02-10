import { ping } from "bedrock-protocol";
import { ServerData } from "../../../types/ServerData";
import Server from '../models/Server';
import Pings from "../models/Pings";

async function pingServer(data: ServerData): Promise<number | null> {
    try {
        let pingData = await ping({
            host: data.ip.valueOf(),
            port: data.port.valueOf()
        })

        return typeof pingData?.playersOnline === "number" ? pingData.playersOnline : null;
    } catch (e) {
        return null;
    }
}

async function pingAll() {
    let data = {} as Record<string, number>;
    const servers = await Server.find();

    for (const srv of servers) {
        try {
            const playerCount = await pingServer({ ip: srv.ip, port: srv.port, name: srv.name, serverId: srv._id } as any as ServerData);
            if (playerCount === null) continue;
            data[srv._id.toString()] = playerCount;
        } catch (e) { }
    }

    await new Pings({
        timestamp: Date.now(),
        data: data
    }).save();
}

export { pingServer, pingAll }