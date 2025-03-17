import { Router, Request, Response } from 'express';
import { requiresAuth } from "../ApiServer";
import Pings from "../../models/Pings";
import Server from "../../models/Server";

const router = Router();

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

export default router;