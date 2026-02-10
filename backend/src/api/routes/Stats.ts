import { Router, Request, Response } from 'express';
import { requiresAuth } from "../ApiServer";
import Pings from "../../models/Pings";
import Server from "../../models/Server";
import Permissions from "../../utils/Permissions";

const router = Router();


const parseRangeBoundary = (value: unknown): number | null => {
    if (typeof value !== "string" || value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

router.get('/range', requiresAuth, async (req: Request, res: Response) => {
    const from = parseRangeBoundary(req.query.from);
    const to = parseRangeBoundary(req.query.to);

    if (from === null || to === null) {
        res.status(400).json({ error: "Both from and to query parameters are required" });
        return;
    }

    if (from >= to) {
        res.status(400).json({ error: "from must be lower than to" });
        return;
    }

    const allPings = await Pings.find({
        timestamp: {
            $gte: from,
            $lte: to,
        }
    }).sort({ timestamp: 1 });

    const servers = await Server.find().then((servers) => {
        const data = {} as any;
        servers.forEach((server: any) => {
            data[server._id.toString()] = {
                color: server.color,
                name: server.name,
            };
        });
        return data;
    });

    const data = {} as any;

    for (const singlePing of allPings) {
        for (const serverId in singlePing.data) {
            if (servers[serverId]?.name == null) continue;
            if (!data[serverId]) {
                data[serverId] = {
                    pings: [],
                    color: servers[serverId]?.color || "#000000",
                    name: servers[serverId]?.name || serverId,
                };
            }
            data[serverId].pings.push({
                timestamp: singlePing.timestamp,
                count: singlePing.data[serverId],
            });
        }
    }

    res.json({
        from,
        to,
        data,
    });
});

router.get('/all', requiresAuth, async (req: Request, res: Response) => {
    let allPings = [];

    //if no query.from and query.to, get all pings
    let inRange = req.query.from && req.query.to;

    if (!inRange) {
        allPings = await Pings.find();
    } else {
        allPings = await Pings.find({
            $and: [
                {
                    timestamp: {
                        $gte: parseInt(req.query.from as string)
                    }
                },
                {
                    timestamp: {
                        $lte: parseInt(req.query.to as string)
                    }
                }
            ]
        });
    }

    allPings = allPings.sort((a, b) => {
        //timestamp old to new
        return a.timestamp - b.timestamp;
    })

    let from = inRange ? parseInt(req.query.from as string) : allPings[0].timestamp;
    let to = inRange ? parseInt(req.query.to as string) : allPings[allPings.length - 1].timestamp;

    let servers = await Server.find().then(servers => {
        let data = {} as any;
        servers.forEach((server: any) => {
            data[server._id.toString()] = {
                color: server.color,
                name: server.name
            };
        });
        return data;
    });

    let data = {} as any;

    for (let singlePing of allPings) {
        for (let serverId in singlePing.data) {
            if(servers[serverId]?.name == null) continue;
            if (!data[serverId]) {
                data[serverId] = {
                    pings: [],
                    color: servers[serverId]?.color || "#000000",
                    name: servers[serverId]?.name || serverId
                }
            }
            await data[serverId].pings.push({
                timestamp: singlePing.timestamp,
                count: singlePing.data[serverId]
            });
        }
    }

    res.json({
        from,
        to,
        data
    })
});

router.get('/latest', requiresAuth, async (req: Request, res: Response) => {
    let serverNames = await Server.find().then(servers => {
        let names = {} as any;
        servers.forEach((server: any) => {
            names[server._id.toString()] = server.name;
        });
        return names;
    });

    const currentMillis = Date.now();

    const serverStats = await Pings.aggregate([
        {
            $match: {
                timestamp: { $gte: currentMillis - 24 * 60 * 60 * 1000 } // Last 24 hours
            }
        },
        {
            $project: {
                serverData: { $objectToArray: "$data" }, // Convert "data" object to an array
                timestamp: 1
            }
        },
        { $unwind: "$serverData" }, // Flatten the array (each key-value pair becomes a document)
        {
            $group: {
                _id: "$serverData.k", // Group by serverId
                highestEntry: {
                    $max: { count: "$serverData.v", timestamp: "$timestamp" } // Find highest count + timestamp
                },
                latestEntry: {
                     $last: { count: "$serverData.v", timestamp: "$timestamp" } // Keep the latest entry
                }
            }
        },
        {
            $project: {
                highestCount: "$highestEntry.count",
                highestTimestamp: "$highestEntry.timestamp",
                latestCount: "$latestEntry.count",
                latestTimestamp: "$latestEntry.timestamp"
            }
        }
    ]);

    let data = [] as any;

    for (let singleData of serverStats) {
        const result = await Pings.aggregate([
            {
                $match: {
                    [`data.${singleData._id}`]: { $exists: true } // Ensure the field exists
                }
            },
            {
                $project: {
                    serverId: `$data.${singleData._id}`,
                    timestamp: 1
                }
            },
            {
                $sort: { serverId: -1 }
            },
            {
                $limit: 1
            }
        ]);

        const record = result.length > 0 ? result[0] : null;

        if(serverNames[singleData._id] == null) continue;

        data.push({
            internalId: singleData._id,
            server: serverNames[singleData._id] || singleData._id,
            playerCount: singleData.latestCount,
            dailyPeak: singleData.highestCount,
            dailyPeakTimestamp: singleData.highestTimestamp,
            record: record ? record.serverId : null,
            recordTimestamp: record ? record.timestamp : null,
            outdated: (currentMillis - singleData.latestTimestamp) > (parseInt(process.env.ping_rate as string) * 2)
        })
    }

    res.json(data);
});

router.get('/prediction/:serverId', requiresAuth, async (req: Request, res: Response) => {
    // @ts-ignore
    if (!Permissions.hasPermission(req.user.permissions, Permissions.CAN_SEE_PREDICTION)) {
        res.status(403).json({ error: "You do not have permission to see predictions" });
        return;
    }

    const { serverId } = req.params;
    const now = Date.now();
    const historyWindowMs = 7 * 24 * 60 * 60 * 1000;
    const bucketSizeMs = 5 * 60 * 1000;

    const points = await Pings.aggregate([
        {
            $match: {
                timestamp: { $gte: now - historyWindowMs },
                [`data.${serverId}`]: { $exists: true }
            }
        },
        {
            $project: {
                timestamp: 1,
                count: `$data.${serverId}`
            }
        },
        {
            $group: {
                _id: {
                    $floor: {
                        $divide: ["$timestamp", bucketSizeMs]
                    }
                },
                timestamp: { $max: "$timestamp" },
                count: { $avg: "$count" }
            }
        },
        {
            $project: {
                _id: 0,
                timestamp: 1,
                count: { $round: ["$count", 2] }
            }
        },
        { $sort: { timestamp: 1 } }
    ]);

    if (points.length < 2) {
        res.status(422).json({ error: "Not enough data to predict player counts" });
        return;
    }

    const coveredTimeMs = points[points.length - 1].timestamp - points[0].timestamp;
    const minimumCoverageMs = 24 * 60 * 60 * 1000;

    if (coveredTimeMs < minimumCoverageMs) {
        res.status(422).json({ error: "At least 24 hours of data are required for prediction" });
        return;
    }

    res.status(200).json({
        serverId,
        points,
        from: points[0].timestamp,
        to: points[points.length - 1].timestamp,
        bucketSizeMs
    });
});

export default router;
