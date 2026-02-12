import { ping as pingBedrock } from "bedrock-protocol";
import { ServerData } from "../../../types/ServerData";
import Server from '../models/Server';
import Pings from "../models/Pings";
import LatestStats from "../models/LatestStats";

async function pingServer(data: ServerData, isBedrockServer: boolean): Promise<number | null> {
    if (isBedrockServer) {
        try {
            let pingData = await pingBedrock({
                host: data.ip.valueOf(),
                port: data.port.valueOf()
            })

            return typeof pingData?.playersOnline === "number" ? pingData.playersOnline : null;
        } catch (e) {
            return null;
        }
    }

    try {
        const { status } = require("minecraft-server-util");
        const response = await status(data.ip.valueOf(), data.port.valueOf(), {
            timeout: 5000,
            enableSRV: true,
        });
        return typeof response?.players?.online === "number" ? response.players.online : null;
    } catch (e) {
        return null;
    }
}

async function pingAll() {
    let data = {} as Record<string, number>;
    const servers = await Server.find();

    for (const srv of servers) {
        try {
            const isBedrockServer = srv.bedrock !== false;
            const playerCount = await pingServer({ ip: srv.ip, port: srv.port, name: srv.name, serverId: srv._id } as any as ServerData, isBedrockServer);
            if (playerCount === null) continue;
            data[srv._id.toString()] = playerCount;
        } catch (e) { }
    }

    await new Pings({
        timestamp: Date.now(),
        data: data
    }).save();

    const now = Date.now();
    const dayKey = new Date(now).toISOString().slice(0, 10);
    const serverIds = Object.keys(data);
    if (serverIds.length === 0) return;

    const existing = await LatestStats.find({ serverId: { $in: serverIds } }).lean();
    const existingById = new Map(existing.map((entry) => [entry.serverId, entry]));

    const updates = serverIds.map((serverId) => {
        const count = data[serverId];
        const current = existingById.get(serverId);

        let dailyPeak = count;
        let dailyPeakTimestamp = now;
        if (current && current.dayKey === dayKey) {
            if (typeof current.dailyPeak === "number" && current.dailyPeak >= count) {
                dailyPeak = current.dailyPeak;
                dailyPeakTimestamp = current.dailyPeakTimestamp;
            }
        }

        let record = count;
        let recordTimestamp = now;
        if (current && typeof current.record === "number") {
            if (current.record >= count) {
                record = current.record;
                recordTimestamp = current.recordTimestamp;
            }
        }

        return {
            updateOne: {
                filter: { serverId },
                update: {
                    $set: {
                        serverId,
                        latestCount: count,
                        latestTimestamp: now,
                        dayKey,
                        dailyPeak,
                        dailyPeakTimestamp,
                        record,
                        recordTimestamp,
                    }
                },
                upsert: true
            }
        };
    });

    await LatestStats.bulkWrite(updates);
}

export { pingServer, pingAll }
