import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    Checkbox,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from "@heroui/react";
import { OnlinePlayersChart } from "@/components/charts/OnlinePlayersChart";
import { ServerTable } from "@/components/charts/ServerTable";
import { Preferences } from "@capacitor/preferences";
import { Permissions, hasPermission } from "@/lib/permissions";

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
    let [currentUser, setCurrentUser] = useState<{ id: string; name: string; permissions: number } | null>(null);
    let [serverDetails, setServerDetails] = useState<Record<string, { name: string; ip: string; port: number; color: string }>>({});
    let [users, setUsers] = useState<Array<{ id: string; name: string; permissions: number }>>([]);

    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [accountError, setAccountError] = useState("");
    const [isAccountSubmitting, setIsAccountSubmitting] = useState(false);

    const [newUserName, setNewUserName] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserPermissions, setNewUserPermissions] = useState({
        manageServers: false,
        manageUsers: false,
        addServer: false,
    });
    const [userError, setUserError] = useState("");
    const [userPasswordTarget, setUserPasswordTarget] = useState<{ id: string; name: string } | null>(null);
    const [userPassword, setUserPassword] = useState("");
    const [isUserSubmitting, setIsUserSubmitting] = useState(false);

    const rangeMs = 12 * 60 * 60 * 1000;
    const pingRate = 10000;

    const canAddServer = currentUser ? hasPermission(currentUser.permissions, Permissions.ADD_SERVER) : false;
    const canManageServers = currentUser ? hasPermission(currentUser.permissions, Permissions.SERVER_MANAGEMENT) : false;
    const canManageUsers = currentUser ? hasPermission(currentUser.permissions, Permissions.USER_MANAGEMENT) : false;

    const formatRange = (value: number) => new Date(value).toLocaleString();

    const handleRangeShift = (direction: "prev" | "next") => {
        setDateOverridden(true);
        const now = Date.now();
        if (direction === "prev") {
            setFromDate((prev) => prev - rangeMs);
            setToDate((prev) => prev - rangeMs);
            return;
        }

        setFromDate((prev) => {
            const nextFrom = prev + rangeMs;
            return nextFrom > now - rangeMs ? now - rangeMs : nextFrom;
        });
        setToDate((prev) => {
            const nextTo = prev + rangeMs;
            return nextTo > now ? now : nextTo;
        });
    };

    const handleRangeReset = () => {
        setDateOverridden(false);
        setFromDate(Date.now() - rangeMs);
        setToDate(Date.now());
    };

    const loadCurrentUser = async (activeUrl: string, activeToken: string) => {
        const response = await fetch(activeUrl + "/api/usersmanage/me", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + activeToken
            }
        });

        if (!response.ok) {
            return;
        }

        const json = await response.json();
        setCurrentUser(json);
    };

    const loadServerDetails = async (activeUrl: string, activeToken: string) => {
        const response = await fetch(activeUrl + "/api/servermanage/list", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + activeToken
            }
        });

        if (!response.ok) return;

        const json = await response.json();
        const details = json.reduce((acc: any, server: any) => {
            acc[server._id] = {
                name: server.name,
                ip: server.ip,
                port: server.port,
                color: server.color
            };
            return acc;
        }, {});
        setServerDetails(details);
    };

    const loadUsers = async (activeUrl: string, activeToken: string) => {
        const response = await fetch(activeUrl + "/api/usersmanage/list", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + activeToken
            }
        });
        if (!response.ok) return;
        const json = await response.json();
        setUsers(json);
    };

    const handleSignOut = async () => {
        try {
            if (url && token) {
                await fetch(url + "/api/auth/endSession", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "authorization": "Bearer " + token
                    }
                });
            }
        } finally {
            const servers = JSON.parse((await Preferences.get({ key: "servers" })).value || "[]");
            const id = parseInt(router.query.server as string) || 0;
            servers.splice(id, 1);
            await Preferences.set({ key: "servers", value: JSON.stringify(servers) });
            router.push("/");
        }
    };

    const handlePasswordChange = async () => {
        if (!url || !token) return;
        if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
            setAccountError("Please provide matching passwords.");
            return;
        }

        setIsAccountSubmitting(true);
        setAccountError("");
        const response = await fetch(url + "/api/usersmanage/change-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + token
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const json = await response.json();
        if (!response.ok) {
            setAccountError(json.error || "Unable to update password.");
            setIsAccountSubmitting(false);
            return;
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setIsAccountSubmitting(false);
        setIsAccountModalOpen(false);
    };

    const handleCreateUser = async () => {
        if (!url || !token) return;
        setUserError("");
        setIsUserSubmitting(true);
        const permissions =
            (newUserPermissions.manageServers ? Permissions.SERVER_MANAGEMENT : 0) |
            (newUserPermissions.manageUsers ? Permissions.USER_MANAGEMENT : 0) |
            (newUserPermissions.addServer ? Permissions.ADD_SERVER : 0);

        const response = await fetch(url + "/api/usersmanage/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + token
            },
            body: JSON.stringify({
                name: newUserName,
                password: newUserPassword,
                permissions
            })
        });

        const json = await response.json();
        if (!response.ok) {
            setUserError(json.error || "Unable to create user.");
            setIsUserSubmitting(false);
            return;
        }

        setNewUserName("");
        setNewUserPassword("");
        setNewUserPermissions({ manageServers: false, manageUsers: false, addServer: false });
        setIsUserSubmitting(false);
        await loadUsers(url, token);
    };

    const handleDeleteUser = async (userId: string) => {
        if (!url || !token) return;
        const shouldDelete = window.confirm("Delete this user?");
        if (!shouldDelete) return;

        await fetch(url + "/api/usersmanage/" + userId, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + token
            }
        });

        await loadUsers(url, token);
    };

    const handleResetUserPassword = async () => {
        if (!url || !token || !userPasswordTarget) return;
        setIsUserSubmitting(true);
        const response = await fetch(url + "/api/usersmanage/" + userPasswordTarget.id + "/password", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "authorization": "Bearer " + token
            },
            body: JSON.stringify({ newPassword: userPassword })
        });

        const json = await response.json();
        if (!response.ok) {
            setUserError(json.error || "Unable to update password.");
            setIsUserSubmitting(false);
            return;
        }

        setIsUserSubmitting(false);
        setUserPassword("");
        setUserPasswordTarget(null);
        await loadUsers(url, token);
    };

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
                    const now = Date.now();
                    const effectiveFrom = dateOverridden ? fromDate : now - rangeMs;
                    const effectiveTo = dateOverridden ? toDate : now;

                    if (!dateOverridden) {
                        setFromDate(effectiveFrom);
                        setToDate(effectiveTo);
                    }

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

                    fetch(ur + '/api/stats/all?from=' + effectiveFrom + '&to=' + effectiveTo, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'authorization': 'Bearer ' + tok
                        }
                    }).then(response => response.json()).then((dat) => setData((prev) => ({ type: prev.type, ...dat })))
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
    }, [router.query, router, fromDate, toDate, dateOverridden]);

    useEffect(() => {
        if (!token || !url) return;
        loadCurrentUser(url, token);
    }, [token, url]);

    useEffect(() => {
        if (!token || !url || !currentUser) return;
        if (hasPermission(currentUser.permissions, Permissions.SERVER_MANAGEMENT)) {
            loadServerDetails(url, token);
        }
        if (hasPermission(currentUser.permissions, Permissions.USER_MANAGEMENT)) {
            loadUsers(url, token);
        }
    }, [currentUser, token, url]);


    if (!token) {
        return (<div className="flex flex-col items-center justify-center py-2 h-screen min-w-96 w-96 max-w-96">Loading
            server...</div>)
    }

    return (
        <div className="flex flex-col h-screen p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col">
                    <span className="text-sm text-default-400">Signed in as</span>
                    <span className="text-lg font-semibold">{currentUser?.name || "Loading user..."}</span>
                </div>
                <div className="flex gap-2">
                    <Button variant="flat" onPress={() => setIsAccountModalOpen(true)}>
                        Account settings
                    </Button>
                    <Button color="danger" variant="flat" onPress={handleSignOut}>
                        Sign out
                    </Button>
                </div>
            </div>

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
                    <div className="flex w-full flex-col gap-2 text-xs text-blueGray-100">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="flat" onPress={() => handleRangeShift("prev")}>
                                Previous 12h
                            </Button>
                            <Button size="sm" variant="flat" onPress={() => handleRangeShift("next")}>
                                Next 12h
                            </Button>
                            <Button size="sm" color="primary" variant="flat" onPress={handleRangeReset}>
                                Now
                            </Button>
                            {dateOverridden ? (
                                <span className="text-blueGray-100">Custom range</span>
                            ) : (
                                <span className="text-blueGray-100">Live range</span>
                            )}
                        </div>
                        <span>
                            Showing {formatRange(fromDate)} → {formatRange(toDate)}
                        </span>
                    </div>
                </CardFooter>
            </Card>

            <div>
                <Card>
                    <CardBody className="overflow-y-scroll">
                        <ServerTable
                            url={url}
                            token={token}
                            data={tableData}
                            canAddServer={canAddServer}
                            canManageServers={canManageServers}
                            serverDetails={serverDetails}
                            onServersChanged={() => {
                                if (url && token && canManageServers) {
                                    loadServerDetails(url, token);
                                }
                                reloadData();
                            }}
                        />
                    </CardBody>
                </Card>
            </div>

            {canManageUsers ? (
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-1">
                            <h3 className="text-lg font-semibold">User management</h3>
                            <span className="text-sm text-default-400">Add, remove, or reset passwords.</span>
                        </div>
                    </CardHeader>
                    <CardBody className="space-y-4">
                        {userError ? <p className="text-red-500">{userError}</p> : null}
                        <div className="grid gap-3 md:grid-cols-3">
                            <Input
                                label="Username"
                                variant="bordered"
                                value={newUserName}
                                onChange={(e) => setNewUserName(e.target.value)}
                            />
                            <Input
                                label="Temporary password"
                                variant="bordered"
                                type="password"
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                            />
                            <div className="flex flex-col gap-2">
                                <Checkbox
                                    isSelected={newUserPermissions.manageServers}
                                    onValueChange={(value) =>
                                        setNewUserPermissions((prev) => ({ ...prev, manageServers: value }))
                                    }
                                >
                                    Manage servers
                                </Checkbox>
                                <Checkbox
                                    isSelected={newUserPermissions.addServer}
                                    onValueChange={(value) =>
                                        setNewUserPermissions((prev) => ({ ...prev, addServer: value }))
                                    }
                                >
                                    Add servers
                                </Checkbox>
                                <Checkbox
                                    isSelected={newUserPermissions.manageUsers}
                                    onValueChange={(value) =>
                                        setNewUserPermissions((prev) => ({ ...prev, manageUsers: value }))
                                    }
                                >
                                    Manage users
                                </Checkbox>
                            </div>
                        </div>
                        <div>
                            <Button color="primary" onPress={handleCreateUser} isLoading={isUserSubmitting}>
                                Create user
                            </Button>
                        </div>
                        <Table aria-label="User table">
                            <TableHeader>
                                <TableColumn>Name</TableColumn>
                                <TableColumn>Permissions</TableColumn>
                                <TableColumn>Actions</TableColumn>
                            </TableHeader>
                            <TableBody emptyContent={"No users found"} items={users}>
                                {(user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>{user.permissions}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="flat"
                                                    onPress={() => setUserPasswordTarget({ id: user.id, name: user.name })}
                                                >
                                                    Reset password
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    color="danger"
                                                    variant="flat"
                                                    onPress={() => handleDeleteUser(user.id)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardBody>
                </Card>
            ) : null}
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
        <Modal isOpen={isAccountModalOpen} onOpenChange={setIsAccountModalOpen} placement="top-center">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">Account settings</ModalHeader>
                        <ModalBody>
                            {accountError ? <p className="text-red-500">{accountError}</p> : null}
                            <Input
                                label="Current password"
                                type="password"
                                variant="bordered"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                            />
                            <Input
                                label="New password"
                                type="password"
                                variant="bordered"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <Input
                                label="Confirm new password"
                                type="password"
                                variant="bordered"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="flat" onPress={onClose} isDisabled={isAccountSubmitting}>
                                Cancel
                            </Button>
                            <Button color="primary" onPress={handlePasswordChange} isLoading={isAccountSubmitting}>
                                Update password
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
        <Modal isOpen={!!userPasswordTarget} onOpenChange={() => setUserPasswordTarget(null)} placement="top-center">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            Reset password for {userPasswordTarget?.name}
                        </ModalHeader>
                        <ModalBody>
                            <Input
                                label="New password"
                                type="password"
                                variant="bordered"
                                value={userPassword}
                                onChange={(e) => setUserPassword(e.target.value)}
                            />
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="flat" onPress={onClose} isDisabled={isUserSubmitting}>
                                Cancel
                            </Button>
                            <Button color="primary" onPress={handleResetUserPassword} isLoading={isUserSubmitting}>
                                Update password
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
