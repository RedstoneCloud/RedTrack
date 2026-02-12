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

    const now = Date.now();
    await new Pings({
        timestamp: now,
        data: data
    }).save();

    const dayKey = new Date(now).toISOString().slice(0, 10);
    const serverIds = Object.keys(data);
    if (serverIds.length === 0) return;

    const existing = await LatestStats.find({ serverId: { $in: serverIds } }).lean();
    const existingById = new Map(existing.map((entry) => [entry.serverId, entry]));
    const rollingWindowStart = now - 24 * 60 * 60 * 1000;

    const fetchRollingPeak = async (serverId: string) => {
        const peakRows = await Pings.aggregate([
            {
                $match: {
                    timestamp: { $gte: rollingWindowStart },
                    [`data.${serverId}`]: { $exists: true }
                }
            },
            {
                $project: {
                    timestamp: 1,
                    count: `$data.${serverId}`
                }
            },
            { $sort: { count: -1, timestamp: -1 } },
            { $limit: 1 }
        ]);
        if (peakRows.length === 0) {
            return { peak: null as number | null, timestamp: null as number | null };
        }
        return { peak: peakRows[0].count as number, timestamp: peakRows[0].timestamp as number };
    };

    const fetchRecord = async (serverId: string) => {
        const recordRows = await Pings.aggregate([
            {
                $match: {
                    [`data.${serverId}`]: { $exists: true }
                }
            },
            {
                $project: {
                    timestamp: 1,
                    count: `$data.${serverId}`
                }
            },
            { $sort: { count: -1, timestamp: -1 } },
            { $limit: 1 }
        ]);
        if (recordRows.length === 0) {
            return { record: null as number | null, timestamp: null as number | null };
        }
        return { record: recordRows[0].count as number, timestamp: recordRows[0].timestamp as number };
    };

    const peakBackfillIds = serverIds.filter((serverId) => {
        const current = existingById.get(serverId);
        return !current || typeof current.dailyPeakTimestamp !== "number" || current.dailyPeakTimestamp < rollingWindowStart;
    });
    const recordBackfillIds = serverIds.filter((serverId) => {
        const current = existingById.get(serverId);
        return !current || typeof current.record !== "number" || typeof current.recordTimestamp !== "number";
    });

    const peakBackfills = new Map<string, { peak: number | null; timestamp: number | null }>();
    await Promise.all(peakBackfillIds.map(async (serverId) => {
        peakBackfills.set(serverId, await fetchRollingPeak(serverId));
    }));

    const recordBackfills = new Map<string, { record: number | null; timestamp: number | null }>();
    await Promise.all(recordBackfillIds.map(async (serverId) => {
        recordBackfills.set(serverId, await fetchRecord(serverId));
    }));

    const updates = serverIds.map((serverId) => {
        const count = data[serverId];
        const current = existingById.get(serverId);

        let dailyPeak = count;
        let dailyPeakTimestamp = now;
        if (current && typeof current.dailyPeak === "number" && typeof current.dailyPeakTimestamp === "number") {
            if (current.dailyPeakTimestamp >= rollingWindowStart && current.dailyPeak >= count) {
                dailyPeak = current.dailyPeak;
                dailyPeakTimestamp = current.dailyPeakTimestamp;
            }
        }
        const peakBackfill = peakBackfills.get(serverId);
        if (peakBackfill?.peak != null && peakBackfill.timestamp != null) {
            dailyPeak = peakBackfill.peak;
            dailyPeakTimestamp = peakBackfill.timestamp;
        }
        if (count > dailyPeak) {
            dailyPeak = count;
            dailyPeakTimestamp = now;
        }

        let record = count;
        let recordTimestamp = now;
        if (current && typeof current.record === "number" && typeof current.recordTimestamp === "number") {
            record = current.record;
            recordTimestamp = current.recordTimestamp;
        }
        const recordBackfill = recordBackfills.get(serverId);
        if (recordBackfill?.record != null && recordBackfill.timestamp != null) {
            if (recordBackfill.record >= record) {
                record = recordBackfill.record;
                recordTimestamp = recordBackfill.timestamp;
            }
        }
        if (count > record) {
            record = count;
            recordTimestamp = now;
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
