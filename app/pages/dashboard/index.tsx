import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/react";
import { OnlinePlayersChart } from "@/components/charts/OnlinePlayersChart";
import { ServerTable } from "@/components/charts/ServerTable";
import { Preferences } from "@capacitor/preferences";

type TableRow = {
    internalId: string;
    server: string;
    playerCount: number;
    playerCountDevelopment: any;
    dailyPeak: number;
    dailyPeakTimestamp: number;
    record: number;
    recordTimestamp: number;
    invalidPings: boolean;
    outdated: boolean;
};

export default function Dashboard() {
    let [token, setToken] = useState(null);
    let [url, setUrl] = useState(null);
    let router = useRouter();

    let [data, setData] = useState({
        type: "day"
    } as any);

    let [tableData, setTableData] = useState<TableRow[]>([]);
    let [fromDate, setFromDate] = useState(new Date().getTime() - 60 * 1000 * 60 * 12)
    let [toDate, setToDate] = useState(new Date().getTime());
    let [dateOverridden, setDateOverridden] = useState(false);

    const pingRate = 3000;

    async function reloadData() {
        await Preferences.get({ key: 'servers' }).then(async (dat) => {
            let servers = await JSON.parse(dat.value || "[]")
            let id = parseInt(router.query.server as string) || 0;
            let server = servers[id];
            if (server) {
                let tok = servers[id].token
                let ur = servers[id].url

                setToken(tok)
                setUrl(ur)

                if (tok != null && ur != null) {
                    fetch(ur + "/api/stats/latest", {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'authorization': 'Bearer ' + tok
                        }
                    }).then(response => response.json()).then((dat) => {
                        setTableData((prevTableData) => {
                            const tableDataMap = prevTableData && prevTableData.length > 0 ? new Map(prevTableData.map((item) => [item.internalId, item])) : null;

                            const updatedData = dat.map((item: TableRow) => {
                                const previousData = tableDataMap ? tableDataMap.get(item.internalId) : null;

                                let playerCountDevelopment = "stagnant";
                                if (previousData) {
                                    if (item.playerCount > previousData.playerCount) {
                                        playerCountDevelopment = "increasing";
                                    } else if (item.playerCount < previousData.playerCount) {
                                        playerCountDevelopment = "decreasing";
                                    }
                                }

                                return {
                                    ...item,
                                    playerCountDevelopment,
                                };
                            });

                            return updatedData;
                        })
                    });

                    fetch(ur + '/api/stats/all?from=' + fromDate + '&to=' + toDate, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'authorization': 'Bearer ' + tok
                        }
                    }).then(response => response.json()).then((dat) => setData({type: data.type, ...dat }))

                    if(!dateOverridden) {
                        //TODO: too much, starts lagging the browser
                        //setFromDate(new Date().getTime() - 60 * 1000 * 60 * 12)
                        //setToDate(new Date().getTime())
                    }
                }
            }
        });
    }

    useEffect(() => {
        const intervalId = setInterval(async () => {
            try {
                reloadData();
            } catch (e) {
                console.log(e)
                clearInterval(intervalId)
            }
        }, pingRate);

        console.log("pirst ping")
        reloadData();

        return () => clearInterval(intervalId);
    }, [router.query, router, fromDate, toDate]);


    if (!token) {
        return (<div className="flex flex-col items-center justify-center py-2 h-screen min-w-96 w-96 max-w-96">Loading
            server...</div>)
    }

    return (
        <div className="flex flex-col h-screen p-4 space-y-4">
            <Card className="flex-grow min-h-[306px]">
                <CardHeader>
                    <h2 className="text-blueGray-100 mb-1 text-xl font-semibold">
                        Currently connected players
                    </h2>
                </CardHeader>
                <CardBody className="p-0">
                    <OnlinePlayersChart data={data} />
                </CardBody>
                <CardFooter>
                    <h2 className="text-blueGray-100 mb-1 text-xs font-semibold">
                        TODO: Navigation
                    </h2>
                </CardFooter>
            </Card>

            <div>
                <Card>
                    <CardBody className="overflow-y-scroll">
                        <ServerTable url={url} token={token} data={tableData} />
                    </CardBody>
                </Card>
            </div>
        </div>


        /*<div className="flex flex-col gap-4 p-4">
            <Card className={"h-[500px]"}>
                <CardHeader>Small Chart</CardHeader>
                <CardBody>
                    <Input type="datetime-local" value={
                        new Date(fromDate).toISOString().slice(0, 16)
                    } onChange={(e) => setFromDate(new Date(e.target.value).getTime())} />
                    <Input type="datetime-local" value={
                        new Date(toDate).toISOString().slice(0, 16)
                    } onChange={(e) => setToDate(new Date(e.target.value).getTime())} />
                    <Dropdown>
                        <DropdownTrigger>
                            <Button className="capitalize" variant="bordered">
                                {data.type || "Select Type"}
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                            disallowEmptySelection
                            aria-label="Time unit"
                            selectedKeys={data.type}
                            selectionMode="single"
                            variant="flat"
                            onSelectionChange={(e : any) => {
                                //e is set of strings
                                setData({...data, type: e[0]});
                            }}>
                            <DropdownItem key="minute">Minute</DropdownItem>
                            <DropdownItem key="hour">Hour</DropdownItem>
                            <DropdownItem key="day">Day</DropdownItem>
                            <DropdownItem key="week">Week</DropdownItem>
                            <DropdownItem key="month">Month</DropdownItem>
                            <DropdownItem key="year">Year</DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                    <ServersChart data={data} />
                </CardBody>
            </Card>
            <Card>
                <CardHeader>Large Chart</CardHeader>
                <CardBody>
                </CardBody>
            </Card>
            <Card>
                <CardHeader>Table</CardHeader>
                <CardBody>
                </CardBody>
            </Card>
        </div>*/
    );
}