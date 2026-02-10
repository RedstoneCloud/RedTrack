import React, { useEffect, useRef, useState } from "react";
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
import { Permissions, describePermissions, hasPermission, normalizePermissions } from "@/lib/permissions";

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
    let [backendReachable, setBackendReachable] = useState(true);
    let [backendError, setBackendError] = useState("");
    let [fromDate, setFromDate] = useState(new Date().getTime() - 60 * 1000 * 60 * 1)
    let [toDate, setToDate] = useState(new Date().getTime());
    let [dateOverridden, setDateOverridden] = useState(false);
    let [currentUser, setCurrentUser] = useState<{ id: string; name: string; permissions: number } | null>(null);
    let [serverDetails, setServerDetails] = useState<Record<string, { name: string; ip: string; port: number; color: string; bedrock: boolean }>>({});
    let [users, setUsers] = useState<Array<{ id: string; name: string; permissions: number }>>([]);

    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
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
        cannotChangePassword: false,
    });
    const [userError, setUserError] = useState("");
    const [userPasswordTarget, setUserPasswordTarget] = useState<{ id: string; name: string } | null>(null);
    const [userPassword, setUserPassword] = useState("");
    const [isUserSubmitting, setIsUserSubmitting] = useState(false);
    const [userPermissionTarget, setUserPermissionTarget] = useState<{ id: string; name: string; permissions: number } | null>(null);
    const [editUserPermissions, setEditUserPermissions] = useState({
        manageServers: false,
        manageUsers: false,
        addServer: false,
        cannotChangePassword: false,
    });

    const rangeMs = 1 * 60 * 60 * 1000;
    const pingRate = 10000;

    const fromDateRef = useRef(fromDate);
    const toDateRef = useRef(toDate);
    const dateOverriddenRef = useRef(dateOverridden);

    useEffect(() => {
        fromDateRef.current = fromDate;
    }, [fromDate]);

    useEffect(() => {
        toDateRef.current = toDate;
    }, [toDate]);

    useEffect(() => {
        dateOverriddenRef.current = dateOverridden;
    }, [dateOverridden]);

    const canAddServer = currentUser ? hasPermission(currentUser.permissions, Permissions.ADD_SERVER) || hasPermission(currentUser.permissions, Permissions.SERVER_MANAGEMENT) : false;
    const canManageServers = currentUser ? hasPermission(currentUser.permissions, Permissions.SERVER_MANAGEMENT) : false;
    const canManageUsers = currentUser ? hasPermission(currentUser.permissions, Permissions.USER_MANAGEMENT) : false;
    const canChangeOwnPassword = currentUser ? !hasPermission(currentUser.permissions, Permissions.CANNOT_CHANGE_PASSWORD) : false;

    const formatRange = (value: number) => new Date(value).toLocaleString();
    const now = Date.now();
    const isLiveRange = !dateOverridden;
    const canGoToNextRange = dateOverridden && toDate < now - 5000;

    const fetchChartRange = async (baseUrl: string, sessionToken: string, rangeFrom: number, rangeTo: number) => {
        const response = await requestBackend(baseUrl, sessionToken, '/api/stats/all?from=' + rangeFrom + '&to=' + rangeTo, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const dat = await response.json();
        setData((prev: any) => ({ type: prev.type, from: rangeFrom, to: rangeTo, ...dat }));
    };

    const handleRangeShift = async (direction: "prev" | "next") => {
        if (!url || !token) return;

        const currentFrom = fromDateRef.current;
        const currentTo = toDateRef.current;
        let nextFrom = currentFrom;
        let nextTo = currentTo;
        const rangeNow = Date.now();

        if (direction === "prev") {
            nextFrom = currentFrom - rangeMs;
            nextTo = currentTo - rangeMs;
            setDateOverridden(true);
        } else {
            nextFrom = Math.min(currentFrom + rangeMs, rangeNow - rangeMs);
            nextTo = Math.min(currentTo + rangeMs, rangeNow);
            if (nextTo >= rangeNow - 5000) {
                nextFrom = rangeNow - rangeMs;
                nextTo = rangeNow;
                setDateOverridden(false);
            } else {
                setDateOverridden(true);
            }
        }

        setFromDate(nextFrom);
        setToDate(nextTo);
        fromDateRef.current = nextFrom;
        toDateRef.current = nextTo;
        await fetchChartRange(url, token, nextFrom, nextTo);
    };

    const handleRangeReset = async () => {
        if (!url || !token) return;
        setDateOverridden(false);
        const rangeNow = Date.now();
        const liveFrom = rangeNow - rangeMs;
        const liveTo = rangeNow;
        setFromDate(liveFrom);
        setToDate(liveTo);
        fromDateRef.current = liveFrom;
        toDateRef.current = liveTo;
        await fetchChartRange(url, token, liveFrom, liveTo);
    };

    const requestBackend = async (activeUrl: string, activeToken: string, path: string, init?: RequestInit) => {
        try {
            const response = await fetch(activeUrl + path, {
                ...init,
                headers: {
                    "authorization": "Bearer " + activeToken,
                    ...(init?.headers || {}),
                }
            });
            setBackendReachable(true);
            setBackendError("");
            return response;
        } catch (error) {
            setBackendReachable(false);
            setBackendError(error instanceof Error ? error.message : "Unable to reach backend.");
            throw error;
        }
    };

    const loadCurrentUser = async (activeUrl: string, activeToken: string) => {
        const response = await requestBackend(activeUrl, activeToken, "/api/usersmanage/me", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            return;
        }

        const json = await response.json();
        setCurrentUser({
            id: json.id,
            name: json.name,
            permissions: Number(json.permissions)
        });
    };

    const loadServerDetails = async (activeUrl: string, activeToken: string) => {
        const response = await requestBackend(activeUrl, activeToken, "/api/servermanage/list", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) return;

        const json = await response.json();
        const details = json.reduce((acc: any, server: any) => {
            acc[server._id] = {
                name: server.name,
                ip: server.ip,
                port: server.port,
                color: server.color,
                bedrock: server.bedrock !== false
            };
            return acc;
        }, {});
        setServerDetails(details);
    };

    const loadUsers = async (activeUrl: string, activeToken: string) => {
        const response = await requestBackend(activeUrl, activeToken, "/api/usersmanage/list", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        if (!response.ok) return;
        const json = await response.json();
        setUsers(json);
    };

    const closeOpenModals = () => {
        let closedAny = false;

        if (isAccountModalOpen) {
            setIsAccountModalOpen(false);
            closedAny = true;
        }

        if (isUserManagementOpen) {
            setIsUserManagementOpen(false);
            closedAny = true;
        }

        if (userPermissionTarget) {
            setUserPermissionTarget(null);
            closedAny = true;
        }

        if (userPasswordTarget) {
            setUserPasswordTarget(null);
            closedAny = true;
        }

        return closedAny;
    };

    const handleBack = async () => {
        if (closeOpenModals()) {
            return;
        }
        router.push("/");
    };

    const handlePasswordChange = async () => {
        if (!url || !token || !canChangeOwnPassword) return;
        if (!currentPassword || !newPassword || newPassword !== confirmPassword) {
            setAccountError("Please provide matching passwords.");
            return;
        }

        setIsAccountSubmitting(true);
        setAccountError("");
        const response = await requestBackend(url, token, "/api/usersmanage/change-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
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

    const getPermissionsFromSelection = (selection: { manageServers: boolean; manageUsers: boolean; addServer: boolean; cannotChangePassword: boolean; }) => {
        const permissions =
            (selection.manageServers ? Permissions.SERVER_MANAGEMENT : 0) |
            (selection.manageUsers ? Permissions.USER_MANAGEMENT : 0) |
            (selection.addServer ? Permissions.ADD_SERVER : 0) |
            (selection.cannotChangePassword ? Permissions.CANNOT_CHANGE_PASSWORD : 0);

        return normalizePermissions(permissions);
    };

    const setSelectionFromPermissions = (permissions: number) => {
        const normalized = normalizePermissions(permissions);
        return {
            manageServers: hasPermission(normalized, Permissions.SERVER_MANAGEMENT),
            manageUsers: hasPermission(normalized, Permissions.USER_MANAGEMENT),
            addServer: hasPermission(normalized, Permissions.ADD_SERVER),
            cannotChangePassword: hasPermission(normalized, Permissions.CANNOT_CHANGE_PASSWORD),
        };
    };

    const handleCreateUser = async () => {
        if (!url || !token) return;
        setUserError("");
        setIsUserSubmitting(true);
        const permissions = getPermissionsFromSelection(newUserPermissions);

        const response = await requestBackend(url, token, "/api/usersmanage/create", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
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
        setNewUserPermissions({ manageServers: false, manageUsers: false, addServer: false, cannotChangePassword: false });
        setIsUserSubmitting(false);
        await loadUsers(url, token);
    };

    const handleDeleteUser = async (userId: string) => {
        if (!url || !token) return;
        const shouldDelete = window.confirm("Delete this user?");
        if (!shouldDelete) return;

        await requestBackend(url, token, "/api/usersmanage/" + userId, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            }
        });

        await loadUsers(url, token);
    };

    const handleResetUserPassword = async () => {
        if (!url || !token || !userPasswordTarget) return;
        setIsUserSubmitting(true);
        const response = await requestBackend(url, token, "/api/usersmanage/" + userPasswordTarget.id + "/password", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
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


    const handleUpdateUserPermissions = async () => {
        if (!url || !token || !userPermissionTarget) return;

        setIsUserSubmitting(true);
        setUserError("");

        const response = await requestBackend(url, token, "/api/usersmanage/" + userPermissionTarget.id + "/permissions", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                permissions: getPermissionsFromSelection(editUserPermissions)
            })
        });

        const json = await response.json();
        if (!response.ok) {
            setUserError(json.error || "Unable to update permissions.");
            setIsUserSubmitting(false);
            return;
        }

        setIsUserSubmitting(false);
        setUserPermissionTarget(null);
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
                    const effectiveFrom = dateOverriddenRef.current ? fromDateRef.current : now - rangeMs;
                    const effectiveTo = dateOverriddenRef.current ? toDateRef.current : now;

                    if (!dateOverriddenRef.current) {
                        setFromDate(effectiveFrom);
                        setToDate(effectiveTo);
                    }

                    const response = await requestBackend(ur, tok, "/api/stats/latest", {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });
                    const dat = await response.json();
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

                    if (!dateOverriddenRef.current) {
                        await fetchChartRange(ur, tok, effectiveFrom, effectiveTo);
                    }
                }
            }
        });
    }

    useEffect(() => {
        const intervalId = setInterval(async () => {
            try {
                await reloadData();
            } catch (e) {
                console.log(e)
            }
        }, pingRate);

        console.log("pirst ping")
        reloadData().catch((error) => {
            console.log(error);
        });

        return () => clearInterval(intervalId);
    }, [router.query, router]);

    useEffect(() => {
        router.beforePopState(() => {
            if (closeOpenModals()) {
                return false;
            }
            return true;
        });

        return () => {
            router.beforePopState(() => true);
        };
    }, [router, isAccountModalOpen, isUserManagementOpen, userPermissionTarget, userPasswordTarget]);


    useEffect(() => {
        if (!token || !url) return;
        loadCurrentUser(url, token).catch((error) => {
            console.log(error);
        });
    }, [token, url]);

    useEffect(() => {
        if (!token || !url || !currentUser) return;
        if (hasPermission(currentUser.permissions, Permissions.SERVER_MANAGEMENT)) {
            loadServerDetails(url, token).catch((error) => {
                console.log(error);
            });
        }
        if (hasPermission(currentUser.permissions, Permissions.USER_MANAGEMENT)) {
            loadUsers(url, token).catch((error) => {
                console.log(error);
            });
        }
    }, [currentUser, token, url]);


    if (!backendReachable) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-xl">
                    <CardHeader className="flex flex-col items-start gap-1">
                        <h2 className="text-xl font-semibold">Connection lost</h2>
                        <p className="text-sm text-default-500">The backend is currently unreachable.</p>
                    </CardHeader>
                    <CardBody>
                        <p className="text-sm text-default-500">{backendError || "Please check the backend status and network connection."}</p>
                    </CardBody>
                    <CardFooter>
                        <Button color="primary" onPress={reloadData}>
                            Retry now
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (!token) {
        return (<div className="flex flex-col items-center justify-center py-2 h-screen min-w-96 w-96 max-w-96">Loading
            server...</div>)
    }

    return (
        <>
            <div className="flex flex-col min-h-screen p-3 pt-[max(env(safe-area-inset-top),1.75rem)] sm:p-4 space-y-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col">
                    <span className="text-sm text-default-400">Signed in as</span>
                    <span className="text-lg font-semibold">{currentUser?.name || "Loading user..."}</span>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    {canChangeOwnPassword ? (
                        <Button variant="flat" onPress={() => setIsAccountModalOpen(true)}>
                            Change password
                        </Button>
                    ) : null}
                    {canManageUsers ? (
                        <Button variant="flat" color="secondary" onPress={() => setIsUserManagementOpen(true)}>
                            User management
                        </Button>
                    ) : null}
                    <Button color="danger" variant="flat" onPress={handleBack}>
                        Back
                    </Button>
                </div>
            </div>

            <Card className="min-h-[306px] md:h-[420px]">
                <CardHeader>
                    <h2 className="text-blueGray-100 mb-1 text-xl font-semibold">
                        Currently connected players
                    </h2>
                </CardHeader>
                <CardBody className="h-full p-0">
                    <OnlinePlayersChart data={data} preserveViewport={!isLiveRange} />
                </CardBody>
                <CardFooter>
                    <div className="flex w-full flex-col gap-2 text-xs text-blueGray-100">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button size="sm" variant="flat" onPress={() => handleRangeShift("prev")}>
                                Previous hour
                            </Button>
                            <Button size="sm" variant="flat" isDisabled={!canGoToNextRange} onPress={() => handleRangeShift("next")}>
                                Next hour
                            </Button>
                            <Button size="sm" color="primary" variant="flat" onPress={handleRangeReset}>
                                Now
                            </Button>
                            {!isLiveRange ? (
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

            </div>


            <Modal isOpen={isAccountModalOpen} onOpenChange={setIsAccountModalOpen} placement="top-center">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Change password</ModalHeader>
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
            <Modal
                isOpen={isUserManagementOpen}
                onOpenChange={setIsUserManagementOpen}
                placement="top-center"
                scrollBehavior="inside"
                size="5xl"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                User management
                                <span className="text-sm font-normal text-default-400">Add, remove, or reset passwords.</span>
                            </ModalHeader>
                            <ModalBody className="space-y-4">
                                {userError ? <p className="text-red-500">{userError}</p> : null}
                                <div className="grid gap-3 lg:grid-cols-3">
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
                                                setNewUserPermissions((prev) => ({
                                                    ...prev,
                                                    manageServers: value,
                                                    addServer: value ? true : prev.addServer,
                                                }))
                                            }
                                        >
                                            Manage servers
                                        </Checkbox>
                                        <Checkbox
                                            isSelected={newUserPermissions.addServer}
                                            isDisabled={newUserPermissions.manageServers}
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
                                        <Checkbox
                                            isSelected={newUserPermissions.cannotChangePassword}
                                            onValueChange={(value) =>
                                                setNewUserPermissions((prev) => ({ ...prev, cannotChangePassword: value }))
                                            }
                                        >
                                            Cannot change password
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
                                                <TableCell>{describePermissions(user.permissions)}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            onPress={() => setUserPasswordTarget({ id: user.id, name: user.name })}
                                                        >
                                                            Reset password
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            onPress={() => {
                                                                setUserPermissionTarget({ id: user.id, name: user.name, permissions: user.permissions });
                                                                setEditUserPermissions(setSelectionFromPermissions(user.permissions));
                                                            }}
                                                        >
                                                            Edit permissions
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            color="danger"
                                                            variant="flat"
                                                            isDisabled={currentUser?.id === user.id}
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
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="flat" onPress={onClose}>Close</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
            <Modal isOpen={!!userPermissionTarget} onOpenChange={() => setUserPermissionTarget(null)} placement="top-center">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Edit permissions for {userPermissionTarget?.name}
                            </ModalHeader>
                            <ModalBody>
                                <Checkbox
                                    isSelected={editUserPermissions.manageServers}
                                    onValueChange={(value) =>
                                        setEditUserPermissions((prev) => ({
                                            ...prev,
                                            manageServers: value,
                                            addServer: value ? true : prev.addServer,
                                        }))
                                    }
                                >
                                    Manage servers
                                </Checkbox>
                                <Checkbox
                                    isSelected={editUserPermissions.addServer}
                                    isDisabled={editUserPermissions.manageServers}
                                    onValueChange={(value) =>
                                        setEditUserPermissions((prev) => ({ ...prev, addServer: value }))
                                    }
                                >
                                    Add servers
                                </Checkbox>
                                <Checkbox
                                    isSelected={editUserPermissions.manageUsers}
                                    onValueChange={(value) =>
                                        setEditUserPermissions((prev) => ({ ...prev, manageUsers: value }))
                                    }
                                >
                                    Manage users
                                </Checkbox>
                                <Checkbox
                                    isSelected={editUserPermissions.cannotChangePassword}
                                    onValueChange={(value) =>
                                        setEditUserPermissions((prev) => ({ ...prev, cannotChangePassword: value }))
                                    }
                                >
                                    Cannot change password
                                </Checkbox>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="flat" onPress={onClose} isDisabled={isUserSubmitting}>
                                    Cancel
                                </Button>
                                <Button color="primary" onPress={handleUpdateUserPermissions} isLoading={isUserSubmitting}>
                                    Save permissions
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
        </>
    );
}
