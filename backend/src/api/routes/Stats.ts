import { Router, Request, Response } from 'express';
import Users from "../../models/Users";
import Sessions from "../../models/Sessions";
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

        //log from, to and data
        //console.log(allPings, parseInt(req.query.from as string), parseInt(req.query.to as string));
    }

    allPings = allPings.sort((a, b) => {
        //timestamp old to new
        return a.timestamp - b.timestamp;
    })

    //sort by serverId
    let sortedPings = allPings.sort((a, b) => {
        return a.server.localeCompare(b.server);
    });

    if (allPings.length === 0) {
        res.json({
            from: parseInt(req.query.from as string),
            to: parseInt(req.query.to as string),
            data: {}
        })
        return;
    }

    //from is earliest timestamp from all pings, to is latest timestamp from all pings
    let from = inRange ? parseInt(req.query.from as string) : allPings[0].timestamp;
    let to = inRange ? parseInt(req.query.to as string) : allPings[allPings.length - 1].timestamp;

    res.json({
        from,
        to,
        data: {
            //serverId: [{timestamp, count}, ...],
            //...
            ...sortedPings.reduce((acc, ping) => {
                // @ts-ignore
                if (!acc[ping.server]) {
                    // @ts-ignore
                    acc[ping.server] = [];
                }
                // @ts-ignore
                acc[ping.server].push({
                    timestamp: ping.timestamp,
                    count: ping.playerCount
                });
                return acc;
            }, {})
        }
    })
});

router.get('/latest', requiresAuth, async (req: Request, res: Response) => {
    const servers = await Server.find();

    const currentMillis = Date.now();

    const serversWithPings = await Promise.all(servers.map(async (server) => {
        const latestPings = await Pings.aggregate([
            { $match: { server: server._id.toString() } },   // Match the server ID
            { $sort: { timestamp: -1 } },         // Sort by timestamp in descending order
            { $limit: 1 }                         // Limit to the most recent ping
        ]);

        const latestPing = latestPings.length > 0 ? latestPings[0] : null

        const dailyPeak = await Pings.aggregate([
            {
                $match: {
                    server: server._id.toString(),
                    timestamp: { $gte: currentMillis - 24 * 60 * 60 * 1000 }
                }
            },
            {
                $group: {
                    _id: undefined,
                    playerCount: { $max: "$playerCount" },
                    timestamp: { $first: "$timestamp" }
                }
            }
        ]);

        const record = await Pings.aggregate([
            { $match: { server: server._id.toString() } },
            {
                $group: {
                    _id: undefined,
                    playerCount: { $max: "$playerCount" },
                    timestamp: { $first: "$timestamp" }
                }
            }
        ]);

        const outdated = !latestPing || (currentMillis - latestPing.timestamp) > parseInt(process.env.ping_rate as string)

        return {
            internalId: server._id.toString(),
            server: server.name,
            playerCount: latestPing ? latestPing.playerCount : 0,
            dailyPeak: dailyPeak.length ? dailyPeak[0].playerCount : 0,
            dailyPeakTimestamp: dailyPeak.length ? dailyPeak[0].timestamp : 0,
            record: record.length ? record[0].playerCount : 0,
            recordTimestamp: record.length ? record[0].timestamp : 0,
            invalidPings: !latestPing,
            outdated
        };
    }));

    /*const serversWithPings = await Server.aggregate([
        // Lookup the pings for each server
        {
          $lookup: {
            from: "pings", // The collection name for Pings
            localField: "_id", // Match the server _id
            foreignField: "server", // Match the server in Pings collection
            as: "pings"
          }
        },
        // Add a field to get the latest ping
        {
          $addFields: {
            latestPing: {
              $arrayElemAt: [{ $sortArray: { input: "$pings", sortBy: { timestamp: -1 } } }, 0]
            },
            // Add fields for highest player count within the last 24 hours
            dailyPeak: {
              $arrayElemAt: [
                {
                  $sortArray: {
                    input: {
                      $filter: {
                        input: "$pings",
                        as: "ping",
                        cond: { $gte: ["$$ping.timestamp", Date.now() - 24 * 60 * 60 * 1000] }
                      }
                    },
                    sortBy: { playerCount: -1 }
                  }
                },
                0
              ]
            },
            // Add field for the highest player count of all-time
            record: {
              $arrayElemAt: [
                {
                  $sortArray: {
                    input: "$pings",
                    sortBy: { playerCount: -1 }
                  }
                },
                0
              ]
            }
          }
        },
        // Project the fields you need
        {
          $project: {
            internalId: "$_id",
            server: "$name",
            playerCount: "$latestPing.playerCount",
            dailyPeak: "$dailyPeak.playerCount",
            dailyPeakTimestamp: "$dailyPeak.timestamp",
            record: "$record.playerCount",
            recordTimestamp: "$record.timestamp"
          }
        }
      ]);*/


    res.json(serversWithPings);
});

export default router;