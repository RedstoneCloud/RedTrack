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
    Chip
} from "@heroui/react";

import { AddServer } from "../server/AddServer";

import { ChevronDownIcon, SearchIcon, InfoIcon, ArrowIcon } from "../icons";

export const columns = [
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
    onSelectedInternalIdsChange
}: {
    url: string | null,
    token: string,
    data: any;
    onSelectedInternalIdsChange: (keys: Set<any>) => void;
}) {
    const [filterValue, setFilterValue] = React.useState("");
    const [selectedKeys, setSelectedKeys] = React.useState<Set<any>>(new Set([]));
    const [visibleColumns, setVisibleColumns] = React.useState(new Set(INITIAL_VISIBLE_COLUMNS));
    const [sortDescriptor, setSortDescriptor] = React.useState({
        column: "playerCount",
        direction: "descending",
    });
    const [page, setPage] = React.useState(1);

    const rowsPerPage = 10;

    const hasSearchFilter = Boolean(filterValue);

    const headerColumns = React.useMemo(() => {
        // @ts-ignore
        if (visibleColumns === "all") return columns;

        return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
    }, [visibleColumns]);

    const filteredItems = React.useMemo(() => {
        let filteredData = [...data];

        if (hasSearchFilter) {
            filteredData = filteredData.filter((server) =>
                server.server.toLowerCase().includes(filterValue.toLowerCase()),
            );
        }

        return filteredData;
    }, [data, filterValue]);

    const pages = Math.ceil(filteredItems.length / rowsPerPage);

    const items = React.useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;

        return filteredItems.slice(start, end);
    }, [page, filteredItems, rowsPerPage]);

    const sortedItems = React.useMemo(() => {
        return [...items].sort((a, b) => {
            const first = a[sortDescriptor.column];
            const second = b[sortDescriptor.column];
            const cmp = first < second ? -1 : first > second ? 1 : 0;

            return sortDescriptor.direction === "descending" ? -cmp : cmp;
        });
    }, [sortDescriptor, items]);

    const renderCell = React.useCallback((server: any, columnKey: any) => {
        const cellValue = (
            <span className="font-bold text-default-700">
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
                            <span className="font-bold">
                                {server[columnKey]}
                            </span>
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
            default:
                return cellValue;
        }
    }, []);

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

    const handleSelectionChange = (newSelectedItems: any) => {
        setSelectedKeys(newSelectedItems);

        let selectedInternalIds = newSelectedItems;

        if (selectedInternalIds === "all") {
            selectedInternalIds = data.map((item: any) => item.internalId)
        }

        onSelectedInternalIdsChange(selectedInternalIds);
    };

    const topContent = React.useMemo(() => {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex justify-between gap-3 items-end">
                    <Input
                        isClearable
                        className="w-full sm:max-w-[15%]"
                        placeholder="Search by server name..."
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
                                {columns.map((column: any) => (
                                    column.uid !== "internalId" && (
                                        <DropdownItem key={column.uid} className="capitalize">
                                            {capitalize(column.name)}
                                        </DropdownItem>
                                    ) as any
                                ))}
                            </DropdownMenu>
                        </Dropdown>
                        <AddServer url={url || ""} token={token} />
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
    ]);

    const bottomContent = React.useMemo(() => {
        return (
            <div className="py-2 px-2 flex justify-between items-center">
                <span className="w-[30%] text-small text-default-400">
                    {/* @ts-ignore */}
                    {selectedKeys === "all"
                        ? "All items selected"
                        : `${selectedKeys.size} of ${filteredItems.length} selected`}
                </span>
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
    }, [selectedKeys, items.length, page, pages, hasSearchFilter]);

    return (
        <Table
            isHeaderSticky
            aria-label="Table containing all added servers"
            bottomContent={bottomContent}
            bottomContentPlacement="outside"
            classNames={{
                wrapper: "max-h-[382px]",
            }}
            selectedKeys={selectedKeys}
            selectionMode="multiple"
            // @ts-ignore
            sortDescriptor={sortDescriptor}
            topContent={topContent}
            topContentPlacement="outside"
            onSelectionChange={handleSelectionChange}
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
            <TableBody emptyContent={"No data found"} items={sortedItems}>
                {(item) => (
                    <TableRow key={item.internalId}>
                        {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );
}