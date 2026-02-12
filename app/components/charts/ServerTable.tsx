import React from "react";
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    Input,
    Button,
    DropdownTrigger,
    Dropdown,
    DropdownMenu,
    DropdownItem,
    Pagination,
    Tooltip,
    Chip,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Checkbox,
} from "@heroui/react";
import { PredictionChart } from "./PredictionChart";

import { AddServer } from "../server/AddServer";

import { ChevronDownIcon, SearchIcon, InfoIcon, ArrowIcon } from "../icons";

const baseColumns = [
    { name: "Internal ID", uid: "internalId", sortable: true },
    { name: "Chart", uid: "chart", sortable: false },
    { name: "Server", uid: "server", sortable: true },
    { name: "Player Count", uid: "playerCount", sortable: true },
    { name: "Daily Peak", uid: "dailyPeak", sortable: true },
    { name: "Record", uid: "record", sortable: true }
];

export function capitalize(s: String) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
}

const INITIAL_VISIBLE_COLUMNS = ["chart", "server", "playerCount", "dailyPeak", "record"];

type PredictionPoint = {
    timestamp: number;
    label: string;
    predictedPlayers: number;
};

export function ServerTable({
    url,
    token,
    data,
    canAddServer,
    canManageServers,
    canSeePrediction,
    serverDetails,
    onServersChanged,
    hiddenServers,
    onToggleServer,
    isCached = false,
    onToggleAll,
}: {
    url: string | null,
    token: string,
    data: any;
    canAddServer: boolean;
    canManageServers: boolean;
    canSeePrediction: boolean;
    serverDetails: Record<string, { name: string; ip: string; port: number; color: string; bedrock: boolean }>;
    onServersChanged: () => void;
    hiddenServers?: Set<string>;
    onToggleServer?: (serverName: string) => void;
    isCached?: boolean;
    onToggleAll?: (allServerNames: string[]) => void;
}) {
    const [filterValue, setFilterValue] = React.useState("");
    const [visibleColumns, setVisibleColumns] = React.useState(new Set(INITIAL_VISIBLE_COLUMNS));
    const [sortDescriptor, setSortDescriptor] = React.useState({
        column: "playerCount",
        direction: "descending",
    });
    const [page, setPage] = React.useState(1);
    const [editServerId, setEditServerId] = React.useState<string | null>(null);
    const [editName, setEditName] = React.useState("");
    const [editIP, setEditIP] = React.useState("");
    const [editPort, setEditPort] = React.useState("");
    const [editBedrock, setEditBedrock] = React.useState(true);
    const [editColor, setEditColor] = React.useState("#3b82f6");
    const [editError, setEditError] = React.useState("");
    const [isSaving, setIsSaving] = React.useState(false);
    const [predictionTarget, setPredictionTarget] = React.useState<{ id: string; name: string } | null>(null);
    const [predictionSeries, setPredictionSeries] = React.useState<PredictionPoint[]>([]);
    const [predictionError, setPredictionError] = React.useState("");
    const [isPredicting, setIsPredicting] = React.useState(false);
    const [isDarkMode, setIsDarkMode] = React.useState(true);

    const [rowsPerPage, setRowsPerPage] = React.useState(6);

    const hasSearchFilter = Boolean(filterValue);

    React.useEffect(() => {
        const baseVisibleColumns = [...INITIAL_VISIBLE_COLUMNS];
        if (canSeePrediction || canManageServers) {
            baseVisibleColumns.push("actions");
        }
        setVisibleColumns(new Set(baseVisibleColumns));
    }, [canManageServers, canSeePrediction]);


    React.useEffect(() => {
        if (typeof window === "undefined") return;

        const root = document.documentElement;
        const detectTheme = () => {
            const hasDarkClass = !!document.querySelector(".dark");
            const hasDarkDataTheme = root.getAttribute("data-theme") === "dark";
            const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
            setIsDarkMode(hasDarkClass || hasDarkDataTheme || prefersDark);
        };

        detectTheme();

        const observer = new MutationObserver(detectTheme);
        observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme"] });

        return () => {
            observer.disconnect();
        };
    }, []);

    const chartTheme = React.useMemo(() => {
        if (isDarkMode) {
            return {
                background: "rgba(17, 24, 39, 0.7)",
                grid: "rgba(148, 163, 184, 0.2)",
                axis: "#cbd5e1",
                tooltipBg: "#0f172a",
                tooltipBorder: "rgba(148, 163, 184, 0.35)",
                tooltipText: "#e2e8f0",
                line: "#60a5fa",
            };
        }

        return {
            background: "rgba(248, 250, 252, 0.9)",
            grid: "rgba(15, 23, 42, 0.15)",
            axis: "#334155",
            tooltipBg: "#ffffff",
            tooltipBorder: "rgba(15, 23, 42, 0.2)",
            tooltipText: "#0f172a",
            line: "#2563eb",
        };
    }, [isDarkMode]);
    const predictionLineColor = "#9f74ca";

    const tableColumns = React.useMemo(() => {
        const columns = [...baseColumns];
        if (canSeePrediction || canManageServers) {
            columns.push({ name: "Actions", uid: "actions", sortable: false });
        }
        return columns;
    }, [canManageServers, canSeePrediction]);

    const allServerNames = React.useMemo(() => data.map((s: any) => s.server), [data]);
    const anyChartVisible = allServerNames.length > 0 && allServerNames.some((name: string) => !hiddenServers?.has(name));

    const headerColumns = React.useMemo(() => {
        // @ts-ignore
        if (visibleColumns === "all") return tableColumns.map(c => ({ ...c }));

        return tableColumns.filter((column) => Array.from(visibleColumns).includes(column.uid)).map(c => ({ ...c }));
        // anyChartVisible is included to force HeroUI to re-render column headers when toggle-all state changes
    }, [visibleColumns, tableColumns, anyChartVisible]);

    const filteredItems = React.useMemo(() => {
        let filteredData = [...data];

        if (hasSearchFilter) {
            filteredData = filteredData.filter((server) =>
                server.server.toLowerCase().includes(filterValue.toLowerCase()),
            );
        }

        return filteredData;
    }, [data, filterValue]);


    const sortedItems = React.useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            const first = a[sortDescriptor.column];
            const second = b[sortDescriptor.column];
            const cmp = first < second ? -1 : first > second ? 1 : 0;

            return sortDescriptor.direction === "descending" ? -cmp : cmp;
        });
    }, [sortDescriptor, filteredItems]);

    const pages = Math.ceil(sortedItems.length / rowsPerPage);

    const items = React.useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;

        return sortedItems.slice(start, end).map(item => ({
            ...item,
            _chartVisible: !hiddenServers?.has(item.server),
        }));
    }, [page, sortedItems, rowsPerPage, hiddenServers]);

    const getServerColor = (internalId: string): string => {
        const details = serverDetails[internalId];
        return details?.color || "#3b82f6";
    };

    const renderCell = (server: any, columnKey: any) => {
        const cellValue = (
            <span className={`font-bold ${columnKey != "playerCount" || server.playerCountDevelopment === "stagnant" ? "text-default-700" : ""}`}>
                {server[columnKey]}
            </span>
        );

        switch (columnKey) {
            case "chart":
                const serverColor = getServerColor(server.internalId);
                const isVisible = server._chartVisible !== false;
                return (
                    <div
                        className="flex items-center justify-center cursor-pointer p-1"
                        role="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onToggleServer?.(server.server);
                        }}
                        title={isVisible ? "Hide from chart" : "Show on chart"}
                    >
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{
                                backgroundColor: isVisible ? serverColor : "transparent",
                                boxShadow: isVisible ? `0 0 6px ${serverColor}` : "none",
                                border: `2.5px solid ${serverColor}`,
                                opacity: isVisible ? 1 : 0.3,
                            }}
                        />
                    </div>
                );
            case "server":
                return (
                    <div className="flex gap-4 items-center w-32">
                        <div className="flex gap-2 items-center">
                            {!server.outdated ?
                                <div className="blinking bg-success-500 w-2 h-2 rounded-full"></div>
                                : <></>
                            }
                            <span>{cellValue}</span>
                        </div>
                        {server.outdated ?
                            <Chip color="danger" variant="flat">
                                {server.invalidData ? 'Invalid' : 'Outdated'}
                            </Chip>
                            : <></>
                        }
                    </div>

                )
            case "playerCount":
                if (isCached) {
                    return <span className="text-default-500">--</span>;
                }
                return (
                    <div className={`flex gap-2 items-center text-${server.playerCountDevelopment === 'stagnant' ?
                        'default-400' :
                        server.playerCountDevelopment === 'increasing' ? 'success-400' : 'danger'}`}>
                        <ArrowIcon
                            className={`size-6 
                            ${server.playerCountDevelopment !== 'stagnant' ? (server.playerCountDevelopment === 'increasing' ? '-rotate-45' : 'rotate-45') : ''}`} />
                        {cellValue}
                    </div>
                )
            case "dailyPeak":
                if (isCached) {
                    return <span className="text-default-500">--</span>;
                }
                return (
                    <div className="flex gap-2 items-center">
                        {cellValue}
                        <Tooltip content={`Peaked at ${new Date(server.dailyPeakTimestamp).toString()}`}>
                            <button className="text-default-400"><InfoIcon /></button>
                        </Tooltip>
                    </div>
                )
            case "record":
                if (isCached) {
                    return <span className="text-default-500">--</span>;
                }
                return (
                    <div className="flex gap-2 items-center">
                        {cellValue}
                        <Tooltip content={`Record made on ${new Date(server.recordTimestamp).toString()}`}>
                            <button className="text-default-400"><InfoIcon /></button>
                        </Tooltip>
                    </div>
                )
            case "actions":
                return (
                    <div className="flex gap-2 justify-end">
                        {canSeePrediction ? (
                            <Button
                                size="sm"
                                color="secondary"
                                variant="flat"
                                isDisabled={isCached}
                                onPress={() => handlePredict(server.internalId, server.server)}
                            >
                                Predict
                            </Button>
                        ) : null}
                        {canManageServers ? (
                            <>
                                <Button size="sm" variant="flat" isDisabled={isCached} onPress={() => handleEdit(server.internalId)}>
                                    Edit
                                </Button>
                                <Button size="sm" color="danger" variant="flat" isDisabled={isCached} onPress={() => handleDelete(server.internalId)}>
                                    Delete
                                </Button>
                            </>
                        ) : null}
                    </div>
                )
            default:
                return cellValue;
        }
    };

    const handleEdit = (serverId: string) => {
        const details = serverDetails[serverId];
        if (!details) {
            setEditError("Server details not loaded.");
            return;
        }
        setEditServerId(serverId);
        setEditName(details.name);
        setEditIP(details.ip);
        setEditPort(details.port.toString());
        setEditBedrock(details.bedrock !== false);
        setEditColor(details.color || "#3b82f6");
        setEditError("");
    };


    const handlePredict = async (serverId: string, serverName: string) => {
        if (!url || !canSeePrediction) return;

        setPredictionTarget({ id: serverId, name: serverName });
        setPredictionSeries([]);
        setPredictionError("");
        setIsPredicting(true);

        const response = await fetch(url + "/api/stats/prediction/" + serverId, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + token
            }
        });

        const json = await response.json();
        if (!response.ok) {
            setPredictionError(json.error || "Unable to predict player count.");
            setIsPredicting(false);
            return;
        }

        const rawPoints = (Array.isArray(json.points) ? json.points : [])
            .map((point: any) => ({
                timestamp: Number(point.timestamp),
                count: Number(point.count),
            }))
            .filter((point: { timestamp: number; count: number; }) =>
                Number.isFinite(point.timestamp) && Number.isFinite(point.count),
            )
            .sort((a: { timestamp: number; }, b: { timestamp: number; }) => a.timestamp - b.timestamp);

        const minuteBuckets = new Map<number, { timestamp: number; count: number }>();
        for (const point of rawPoints) {
            const minuteKey = Math.floor(point.timestamp / 60000);
            minuteBuckets.set(minuteKey, point);
        }

        const points = Array.from(minuteBuckets.values()).sort(
            (a, b) => a.timestamp - b.timestamp
        );

        const minimumCoverageMs = 24 * 60 * 60 * 1000;

        if (points.length < 2) {
            setPredictionError("error: Not enough data to predict player counts.");
            setIsPredicting(false);
            return;
        }

        const coveredTime = points[points.length - 1].timestamp - points[0].timestamp;
        if (coveredTime < minimumCoverageMs) {
            setPredictionError("error: At least 24 hours of data are required to predict player counts.");
            setIsPredicting(false);
            return;
        }

        const now = Date.now();
        const recentWindowMs = 12 * 60 * 60 * 1000;
        const recentPoints = points.filter((point: { timestamp: number; }) => point.timestamp >= now - recentWindowMs);

        const overallAverage = points.reduce((sum: number, point: { count: number; }) => sum + point.count, 0) / points.length;
        const recentAverage = recentPoints.length > 0
            ? recentPoints.reduce((sum: number, point: { count: number; }) => sum + point.count, 0) / recentPoints.length
            : overallAverage;

        const trendPerHour = (() => {
            if (recentPoints.length < 2) return 0;
            const start = recentPoints[0].timestamp;
            let sumX = 0;
            let sumY = 0;
            let sumXY = 0;
            let sumXX = 0;
            for (const point of recentPoints) {
                const x = (point.timestamp - start) / (60 * 60 * 1000);
                const y = point.count;
                sumX += x;
                sumY += y;
                sumXY += x * y;
                sumXX += x * x;
            }
            const n = recentPoints.length;
            const denom = n * sumXX - sumX * sumX;
            if (denom === 0) return 0;
            return (n * sumXY - sumX * sumY) / denom;
        })();

        const groupedByHour = points.reduce((acc: Record<number, number[]>, point: { timestamp: number; count: number; }) => {
            const hour = new Date(point.timestamp).getHours();
            if (!acc[hour]) {
                acc[hour] = [];
            }
            acc[hour].push(point.count);
            return acc;
        }, {});

        const groupedByDayHour = points.reduce((acc: Record<string, number[]>, point: { timestamp: number; count: number; }) => {
            const date = new Date(point.timestamp);
            const day = date.getDay();
            const hour = date.getHours();
            const key = `${day}-${hour}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(point.count);
            return acc;
        }, {});

        const hourlyAverage = Object.keys(groupedByHour).reduce((acc: Record<number, number>, hourKey: string) => {
            const hour = Number(hourKey);
            const values = groupedByHour[hour];
            acc[hour] = values.reduce((sum: number, value: number) => sum + value, 0) / values.length;
            return acc;
        }, {});

        const dayHourAverage = Object.keys(groupedByDayHour).reduce((acc: Record<string, number>, key: string) => {
            const values = groupedByDayHour[key];
            acc[key] = values.reduce((sum: number, value: number) => sum + value, 0) / values.length;
            return acc;
        }, {});

        if (Object.keys(hourlyAverage).length === 0) {
            setPredictionError("error: Unable to build predictions from available data.");
            setIsPredicting(false);
            return;
        }

        const predictionWindow = 24;
        const predictions: PredictionPoint[] = [];
        const baseDate = new Date(now);
        baseDate.setMinutes(0, 0, 0);
        const startOfNextHour = baseDate.getTime() + (60 * 60 * 1000);

        for (let hourOffset = 0; hourOffset < predictionWindow; hourOffset++) {
            const futureTimestamp = startOfNextHour + hourOffset * 60 * 60 * 1000;
            const futureDate = new Date(futureTimestamp);
            const futureDay = futureDate.getDay();
            const futureHour = futureDate.getHours();
            const dayHourKey = `${futureDay}-${futureHour}`;
            const dayHourValues = groupedByDayHour[dayHourKey] || [];
            const dayHourBaseline = dayHourAverage[dayHourKey];
            const hourBaseline = hourlyAverage[futureHour];
            const dayHourWeight = Math.min(0.7, dayHourValues.length / 10);
            const hourWeight = 0.2;
            const overallWeight = 1 - dayHourWeight - hourWeight;
            const baseline =
                (dayHourBaseline ?? hourBaseline ?? overallAverage) * dayHourWeight +
                (hourBaseline ?? overallAverage) * hourWeight +
                overallAverage * overallWeight;
            const trendComponent = trendPerHour * (hourOffset + 1);
            const blended = (baseline * 0.75) + ((recentAverage + trendComponent) * 0.25);

            predictions.push({
                timestamp: futureTimestamp,
                label: futureDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                predictedPlayers: Math.max(0, Math.round(blended)),
            });
        }

        const detailedPredictions: PredictionPoint[] = [];
        const stepMs = 15 * 60 * 1000;
        for (let i = 0; i < predictions.length; i++) {
            const current = predictions[i];
            const next = predictions[i + 1];
            detailedPredictions.push(current);
            if (!next) continue;
            const delta = next.predictedPlayers - current.predictedPlayers;
            for (let step = 1; step <= 3; step++) {
                const timestamp = current.timestamp + step * stepMs;
                const interpolated = current.predictedPlayers + (delta * step) / 4;
                detailedPredictions.push({
                    timestamp,
                    label: new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    predictedPlayers: Math.max(0, Math.round(interpolated)),
                });
            }
        }

        setPredictionSeries(detailedPredictions);
        setIsPredicting(false);
    };


    const handleDelete = async (serverId: string) => {
        if (!url) return;
        const shouldDelete = window.confirm("Are you sure you want to delete this server?");
        if (!shouldDelete) return;

        await fetch(url + "/api/servermanage/" + serverId, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + token
            }
        });

        onServersChanged();
    };

    const handleSaveEdit = async () => {
        if (!url || !editServerId) return;
        setIsSaving(true);
        setEditError("");

        const response = await fetch(url + "/api/servermanage/" + editServerId, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + token
            },
            body: JSON.stringify({
                serverName: editName,
                serverIP: editIP,
                serverPort: editPort,
                bedrock: editBedrock,
                color: editColor,
            })
        });

        const json = await response.json();
        if (!response.ok) {
            setEditError(json.error || "Unable to update server.");
            setIsSaving(false);
            return;
        }

        setIsSaving(false);
        setEditServerId(null);
        onServersChanged();
    };

    const onSearchChange = React.useCallback((value: any) => {
        if (value) {
            setFilterValue(value);
            setPage(1);
        } else {
            setFilterValue("");
        }
    }, []);

    const onClear = React.useCallback(() => {
        setFilterValue("");
        setPage(1);
    }, []);

    const topContent = React.useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Input
                        isClearable
                        className="w-full sm:max-w-xs"
                        placeholder="Search..."
                        startContent={<SearchIcon />}
                        size="sm"
                        value={filterValue}
                        onClear={() => onClear()}
                        onValueChange={onSearchChange}
                    />
                    <div className="flex gap-3">
                        <Dropdown >
                            <DropdownTrigger className="hidden sm:flex">
                                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">
                                    Columns
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                disallowEmptySelection
                                aria-label="Table Columns"
                                closeOnSelect={false}
                                selectedKeys={visibleColumns}
                                selectionMode="multiple"
                                // @ts-ignore
                                onSelectionChange={setVisibleColumns}
                            >
                                {tableColumns.map((column: any) => (
                                    column.uid !== "internalId" && (
                                        <DropdownItem key={column.uid} className="capitalize">
                                            {capitalize(column.name)}
                                        </DropdownItem>
                                    ) as any
                                ))}
                            </DropdownMenu>
                        </Dropdown>
                        {canAddServer ? <AddServer url={url || ""} token={token} onServerAdded={onServersChanged} /> : null}
                    </div>
                </div>
            </div>
        );
    }, [
        filterValue,
        visibleColumns,
        data.length,
        onSearchChange,
        hasSearchFilter,
        canAddServer,
        tableColumns
    ]);

    const bottomContent = React.useMemo(() => {
        return (
            <div className="py-2 px-2 flex justify-between items-center">
                <Pagination
                    isCompact
                    showControls
                    showShadow
                    color="primary"
                    page={page}
                    total={pages}
                    onChange={setPage}
                />
                <label className="flex items-center gap-2 text-small text-default-400">
                    Rows
                    <select
                        className="rounded-md border border-default-200 bg-transparent px-2 py-1 text-small text-default-500 outline-none"
                        value={rowsPerPage}
                        onChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setPage(1);
                        }}
                    >
                        <option value={6}>6</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </label>
            </div>
        );
    }, [items.length, page, pages, hasSearchFilter, rowsPerPage]);

    return (
        <>
            <Table
                isHeaderSticky
                aria-label="Table containing all added servers"
                bottomContent={bottomContent}
                bottomContentPlacement="outside"
                classNames={{
                    wrapper: "max-h-[382px] border border-default-200/60 bg-content1/60 shadow-sm",
                }}
                // @ts-ignore
                sortDescriptor={sortDescriptor}
                topContent={topContent}
                topContentPlacement="outside"
                // @ts-ignore
                onSortChange={setSortDescriptor}
            >
                <TableHeader columns={headerColumns}>
                    {(column) => (
                        <TableColumn
                            key={column.uid}
                            allowsSorting={column.sortable}
                            {...(column.uid === "chart" ? { className: "w-14" } : column.uid === "actions" ? { className: "text-right" } : {})}
                        >
                            {column.uid === "chart" ? (
                                <button
                                    type="button"
                                    className="flex items-center justify-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-default-400"
                                    title={anyChartVisible ? "Hide all from chart" : "Show all on chart"}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleAll?.(allServerNames);
                                    }}
                                >
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                            backgroundColor: anyChartVisible ? "#a3a3a3" : "transparent",
                                            boxShadow: anyChartVisible ? "0 0 6px #a3a3a3" : "none",
                                            border: "2.5px solid #a3a3a3",
                                            opacity: anyChartVisible ? 1 : 0.3,
                                        }}
                                    />
                                </button>
                            ) : column.name}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody emptyContent={"No data found"} items={items}>
                    {(item) => (
                        <TableRow key={`${item.internalId}-${item._chartVisible}`}>
                            {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            <Modal
                isOpen={!!predictionTarget}
                onOpenChange={() => setPredictionTarget(null)}
                placement="top-center"
                size="4xl"
                classNames={{
                    wrapper: "items-start p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:p-6",
                    base: "my-2 sm:my-8",
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Prediction for {predictionTarget?.name}<span className="text-sm font-normal text-default-400">Next 24 hours (15-min steps)</span></ModalHeader>
                            <ModalBody>
                                {isPredicting ? <p className="text-default-500">Calculating prediction...</p> : null}
                                {!isPredicting && predictionError ? <p className="text-red-500">{predictionError}</p> : null}
                                {!isPredicting && !predictionError ? (
                                    <p className="text-xs text-default-400">Experimental feature: this chart is only an estimate and may differ from actual player counts.</p>
                                ) : null}
                                {!isPredicting && !predictionError && predictionSeries.length > 0 ? (
                                    <div
                                        className="h-80 w-full rounded-xl border border-default-200 p-2"
                                        style={{ background: chartTheme.background }}
                                    >
                                        <PredictionChart
                                            points={predictionSeries}
                                            lineColor={predictionLineColor}
                                            theme={chartTheme}
                                        />
                                    </div>
                                ) : null}
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="flat" onPress={onClose}>Close</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
            <Modal
                isOpen={!!editServerId}
                onOpenChange={() => setEditServerId(null)}
                placement="top-center"
                classNames={{
                    wrapper: "items-start p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:p-6",
                    base: "my-2 sm:my-8",
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Edit server</ModalHeader>
                            <ModalBody>
                                {editError ? <p className="text-red-500">{editError}</p> : null}
                                <Input
                                    label="Server Name"
                                    variant="bordered"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                />
                                <Input
                                    label="Server Address"
                                    variant="bordered"
                                    value={editIP}
                                    onChange={(e) => setEditIP(e.target.value)}
                                />
                                <Input
                                    label="Port"
                                    variant="bordered"
                                    value={editPort}
                                    onChange={(e) => setEditPort(e.target.value)}
                                />
                                <Checkbox isSelected={editBedrock} onValueChange={setEditBedrock}>
                                    Bedrock server (disable for Java)
                                </Checkbox>
                                <Input
                                    type="color"
                                    label="Server color"
                                    variant="bordered"
                                    value={editColor}
                                    onChange={(e) => setEditColor(e.target.value)}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="flat" onPress={onClose} isDisabled={isSaving}>
                                    Cancel
                                </Button>
                                <Button color="primary" onPress={handleSaveEdit} isLoading={isSaving}>
                                    Save
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}
