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
} from "@heroui/react";

import { AddServer } from "../server/AddServer";

import { ChevronDownIcon, SearchIcon, InfoIcon, ArrowIcon } from "../icons";

const baseColumns = [
    { name: "Internal ID", uid: "internalId", sortable: true },
    { name: "Server", uid: "server", sortable: true },
    { name: "Player Count", uid: "playerCount", sortable: true },
    { name: "Daily Peak", uid: "dailyPeak", sortable: true },
    { name: "Record", uid: "record", sortable: true }
];

export function capitalize(s: String) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
}

const INITIAL_VISIBLE_COLUMNS = ["server", "playerCount", "dailyPeak", "record"];

export function ServerTable({
    url,
    token,
    data,
    canAddServer,
    canManageServers,
    serverDetails,
    onServersChanged,
}: {
    url: string | null,
    token: string,
    data: any;
    canAddServer: boolean;
    canManageServers: boolean;
    serverDetails: Record<string, { name: string; ip: string; port: number; color: string }>;
    onServersChanged: () => void;
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
    const [editError, setEditError] = React.useState("");
    const [isSaving, setIsSaving] = React.useState(false);

    const rowsPerPage = 7;

    const hasSearchFilter = Boolean(filterValue);

    React.useEffect(() => {
        if (canManageServers) {
            setVisibleColumns(new Set([...INITIAL_VISIBLE_COLUMNS, "actions"]));
        }
    }, [canManageServers]);

    const tableColumns = React.useMemo(() => {
        const columns = [...baseColumns];
        if (canManageServers) {
            columns.push({ name: "Actions", uid: "actions", sortable: false });
        }
        return columns;
    }, [canManageServers]);

    const headerColumns = React.useMemo(() => {
        // @ts-ignore
        if (visibleColumns === "all") return tableColumns;

        return tableColumns.filter((column) => Array.from(visibleColumns).includes(column.uid));
    }, [visibleColumns, tableColumns]);

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

        return sortedItems.slice(start, end);
    }, [page, sortedItems, rowsPerPage]);

    const renderCell = React.useCallback((server: any, columnKey: any) => {
        const cellValue = (
            <span className={`font-bold ${columnKey != "playerCount" || server.playerCountDevelopment === "stagnant" ? "text-default-700" : ""}`}>
                {server[columnKey]}
            </span>
        );

        switch (columnKey) {
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
                return (
                    <div className="flex gap-2 items-center">
                        {cellValue}
                        <Tooltip content={`Peaked at ${new Date(server.dailyPeakTimestamp).toString()}`}>
                            <button className="text-default-400"><InfoIcon /></button>
                        </Tooltip>
                    </div>
                )
            case "record":
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
                    <div className="flex gap-2">
                        <Button size="sm" variant="flat" onPress={() => handleEdit(server.internalId)}>
                            Edit
                        </Button>
                        <Button size="sm" color="danger" variant="flat" onPress={() => handleDelete(server.internalId)}>
                            Delete
                        </Button>
                    </div>
                )
            default:
                return cellValue;
        }
    }, [serverDetails]);

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
        setEditError("");
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
                serverPort: editPort
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
                <div className="flex justify-between gap-3 items-end">
                    <Input
                        isClearable
                        className="w-full sm:max-w-[15%]"
                        placeholder="Search..."
                        startContent={<SearchIcon />}
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
                        {canAddServer ? <AddServer url={url || ""} token={token} /> : null}
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
            </div>
        );
    }, [items.length, page, pages, hasSearchFilter]);

    return (
        <Table
            isHeaderSticky
            aria-label="Table containing all added servers"
            bottomContent={bottomContent}
            bottomContentPlacement="outside"
            classNames={{
                wrapper: "max-h-[382px]",
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
                    >
                        {column.name}
                    </TableColumn>
                )}
            </TableHeader>
            <TableBody emptyContent={"No data found"} items={items}>
                {(item) => (
                    <TableRow key={item.internalId}>
                        {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                    </TableRow>
                )}
            </TableBody>
        </Table>
        <Modal isOpen={!!editServerId} onOpenChange={() => setEditServerId(null)} placement="top-center">
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
    );
}
