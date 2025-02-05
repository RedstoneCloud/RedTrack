import { ping } from "bedrock-protocol";
import {ServerData} from "../../../types/ServerData";
import Server from '../models/Server';
import Pings from "../models/Pings";

async function pingServer(data : ServerData) {
    try {
        let pingData = await ping({
            host: data.ip.valueOf(),
            port: data.port.valueOf()
        })

        return pingData?.playersOnline;
    } catch(e) {
        return 0;
    }
}

async function pingAll() {
    let data = {} as any;

    for(let s in (await Server.find())) {
        try {
            let srv = (await Server.find())[s];
            data[srv._id.toString()] = await pingServer({ip: srv.ip, port: srv.port, name: srv.name, serverId: srv._id} as any as ServerData);
        } catch(e) {}
    }

    await new Pings({
        timestamp: Date.now(),
        data: data
    }).save();
}

export { pingServer, pingAll }