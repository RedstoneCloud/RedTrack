import {Router, Request, Response} from 'express';
import {requiresAuth} from "../ApiServer";
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

        const allPings = await Pings.find();
        const currentMillis = Date.now();
        const latestPings = allPings.filter(ping => {
            return (currentMillis - ping.timestamp) < (parseInt(process.env.ping_rate as string) * 2);
        }).sort((a, b) => {
            return b.timestamp - a.timestamp;
        });

        let data = {} as any;

        for (let singlePing of allPings) {
            for (let serverId in singlePing.data) {
                if(!serverNames[serverId]) continue;
                if (!data[serverId]) {
                    data[serverId] = {
                        dailyPeak: 0,
                        dailyPeakTimestamp: 0,
                        record: 0,
                        recordTimestamp: 0,
                        latestPing: 0,
                        name: serverNames[serverId] || serverId,
                    }
                }

                if (singlePing.data[serverId] > data[serverId].record) {
                    data[serverId].record = singlePing.data[serverId];
                    data[serverId].recordTimestamp = singlePing.timestamp;
                }

                if (singlePing.timestamp > currentMillis - 24 * 60 * 60 * 1000) {
                    if (singlePing.data[serverId] > data[serverId].dailyPeak) {
                        data[serverId].dailyPeak = singlePing.data[serverId];
                        data[serverId].dailyPeakTimestamp = singlePing.timestamp;
                    }
                }

                if (singlePing.timestamp > data[serverId].latestPing) {
                    data[serverId].latestPing = singlePing.data[serverId];
                }
            }
        }

        let finalData = [] as any;

        for (let serverId in data) {
            finalData.push({
                internalId: serverId,
                server: data[serverId].name,
                playerCount: data[serverId].latestPing,
                dailyPeak: data[serverId].dailyPeak,
                dailyPeakTimestamp: data[serverId].dailyPeakTimestamp,
                record: data[serverId].record,
                recordTimestamp: data[serverId].recordTimestamp,
                invalidPings: !data[serverId].latestPing,
                outdated: (currentMillis - data[serverId].latestPing.timestamp) > (parseInt(process.env.ping_rate as string) * 2)
            });
        }

        res.json(finalData);
    }
)
;

export default router;