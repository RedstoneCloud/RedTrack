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
import { OnlinePlayersChart, OnlinePlayersChartHandle } from "@/components/charts/OnlinePlayersChart";
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
    let [token, setToken] = useState<string | null>(null);
    let [url, setUrl] = useState<string | null>(null);
    let router = useRouter();

    let [data, setData] = useState({
        type: "day"
    } as any);

    let [tableData, setTableData] = useState<TableRow[]>([]);
    const [hiddenServers, setHiddenServers] = useState<Set<string>>(new Set());
    let [backendReachable, setBackendReachable] = useState(true);
    let [backendError, setBackendError] = useState("");
    const [authError, setAuthError] = useState("");
    const [serverConfig, setServerConfig] = useState<{ token: string; url: string } | null>(null);
    const [activeServerIndex, setActiveServerIndex] = useState(0);
    let [fromDate, setFromDate] = useState(new Date().getTime() - 60 * 1000 * 60 * 6)
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
        canSeePrediction: false,
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
        canSeePrediction: false,
    });

    const modalClassNames = {
        wrapper: "items-start p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:p-6",
        base: "my-2 sm:my-8",
    };

    const liveRangeOptions = [1, 2, 4, 8, 12, 24];
    const [liveRangeHours, setLiveRangeHours] = useState(1);
    const liveRangeMs = liveRangeHours * 60 * 60 * 1000;
    const rangeShiftMs = 2 * 60 * 60 * 1000;
    const pingRate = 10000;

    const formatDateTimeLocal = (value: number) => {
        const date = new Date(value);
        const tzOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    };

    const parseDateTimeLocal = (value: string) => {
        const parsed = new Date(value).getTime();
        return Number.isFinite(parsed) ? parsed : NaN;
    };

    const getClampedRange = (rangeFrom: number, rangeTo: number) => {
        const nowTs = Date.now();
        const clampedTo = Math.min(rangeTo, nowTs);
        const clampedFrom = Math.min(rangeFrom, clampedTo - 1);
        return {
            from: clampedFrom,
            to: clampedTo,
        };
    };

    const chartRef = useRef<OnlinePlayersChartHandle>(null);
    const fromDateRef = useRef(fromDate);
    const toDateRef = useRef(toDate);
    const dateOverriddenRef = useRef(dateOverridden);
    const liveRangeMsRef = useRef(liveRangeMs);
    const [customFromInput, setCustomFromInput] = useState(formatDateTimeLocal(fromDate));
    const [customToInput, setCustomToInput] = useState(formatDateTimeLocal(toDate));
    const [rangeError, setRangeError] = useState("");
    const [isCustomRangeEditing, setIsCustomRangeEditing] = useState(false);
    const [isChartLoading, setIsChartLoading] = useState(true);
    const [isTableLoading, setIsTableLoading] = useState(true);
    const [isTableCached, setIsTableCached] = useState(false);
    const [isTableSlow, setIsTableSlow] = useState(false);
    const hasLoadedChartRef = useRef(false);
    const hasLoadedTableRef = useRef(false);
    const hasLoadedServerPrefsRef = useRef(false);

    useEffect(() => {
        fromDateRef.current = fromDate;
    }, [fromDate]);

    useEffect(() => {
        toDateRef.current = toDate;
    }, [toDate]);

    useEffect(() => {
        dateOverriddenRef.current = dateOverridden;
    }, [dateOverridden]);

    useEffect(() => {
        liveRangeMsRef.current = liveRangeMs;
    }, [liveRangeMs]);

    useEffect(() => {
        if (isCustomRangeEditing) return;
        setCustomFromInput(formatDateTimeLocal(fromDate));
        setCustomToInput(formatDateTimeLocal(toDate));
    }, [fromDate, toDate, isCustomRangeEditing]);

    const canAddServer = currentUser ? hasPermission(currentUser.permissions, Permissions.ADD_SERVER) || hasPermission(currentUser.permissions, Permissions.SERVER_MANAGEMENT) : false;
    const canManageServers = currentUser ? hasPermission(currentUser.permissions, Permissions.SERVER_MANAGEMENT) : false;
    const canManageUsers = currentUser ? hasPermission(currentUser.permissions, Permissions.USER_MANAGEMENT) : false;
    const canChangeOwnPassword = currentUser ? !hasPermission(currentUser.permissions, Permissions.CANNOT_CHANGE_PASSWORD) : false;
    const canSeePrediction = currentUser ? hasPermission(currentUser.permissions, Permissions.CAN_SEE_PREDICTION) : false;

    const buildPlaceholderRows = React.useCallback((details: Record<string, { name: string; ip: string; port: number; color: string; bedrock: boolean }>) => {
        return Object.entries(details).map(([id, detail]) => ({
            internalId: id,
            server: detail.name,
            playerCount: 0,
            playerCountDevelopment: "stagnant",
            dailyPeak: 0,
            dailyPeakTimestamp: 0,
            record: 0,
            recordTimestamp: 0,
            invalidPings: false,
            outdated: false,
        })) as TableRow[];
    }, []);

    const handleToggleServer = (serverName: string) => {
        setHiddenServers(prev => {
            const next = new Set(prev);
            if (next.has(serverName)) {
                next.delete(serverName);
            } else {
                next.add(serverName);
            }
            return next;
        });
    };

    useEffect(() => {
        if (!hasLoadedServerPrefsRef.current) return;
        Preferences.set({
            key: `hiddenServers:${activeServerIndex}`,
            value: JSON.stringify(Array.from(hiddenServers)),
        }).catch(() => {
        });
    }, [hiddenServers, activeServerIndex]);

    useEffect(() => {
        if (!hasLoadedServerPrefsRef.current) return;
        Preferences.set({
            key: `liveRangeHours:${activeServerIndex}`,
            value: String(liveRangeHours),
        }).catch(() => {
        });
    }, [liveRangeHours, activeServerIndex]);

    const handleToggleAll = (allServerNames: string[]) => {
        setHiddenServers(prev => {
            const anyVisible = allServerNames.some(name => !prev.has(name));
            if (anyVisible) {
                return new Set(allServerNames);
            } else {
                return new Set();
            }
        });
    };

    const sortedTableData = React.useMemo(() => {
        return [...tableData].sort((a, b) => b.playerCount - a.playerCount);
    }, [tableData]);

    const formatRange = (value: number) => new Date(value).toLocaleString();
    const now = Date.now();
    const isLiveRange = !dateOverridden;
    const canGoToNextRange = dateOverridden && toDate < now - 5000;
    const maxSelectableDateTime = formatDateTimeLocal(now);
    const fromInputMax = customToInput && customToInput < maxSelectableDateTime ? customToInput : maxSelectableDateTime;

    const fetchChartRange = async (
        baseUrl: string,
        sessionToken: string,
        rangeFrom: number,
        rangeTo: number,
        options: { showLoading?: boolean } = {}
    ) => {
        const clamped = getClampedRange(rangeFrom, rangeTo);
        if (options.showLoading) {
            setIsChartLoading(true);
        }
        const response = await requestBackend(baseUrl, sessionToken, '/api/stats/range?from=' + clamped.from + '&to=' + clamped.to, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const dat = await response.json();
        setData((prev: any) => ({ type: prev.type, from: clamped.from, to: clamped.to, ...dat }));
        hasLoadedChartRef.current = true;
        setIsChartLoading(false);
    };

    const handleRangeShift = async (direction: "prev" | "next") => {
        if (!url || !token) return;
        setIsCustomRangeEditing(false);

        const currentFrom = fromDateRef.current;
        const currentTo = toDateRef.current;
        let nextFrom = currentFrom;
        let nextTo = currentTo;
        const rangeNow = Date.now();

        if (direction === "prev") {
            nextFrom = currentFrom - rangeShiftMs;
            nextTo = currentTo - rangeShiftMs;
            setDateOverridden(true);
        } else {
            nextFrom = Math.min(currentFrom + rangeShiftMs, rangeNow - (currentTo - currentFrom));
            nextTo = Math.min(currentTo + rangeShiftMs, rangeNow);
            if (nextTo >= rangeNow - 5000) {
                const activeWindow = currentTo - currentFrom;
                nextFrom = rangeNow - activeWindow;
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
        await fetchChartRange(url, token, nextFrom, nextTo, { showLoading: true });
    };

    const handleRangeReset = async () => {
        if (!url || !token) return;
        setIsCustomRangeEditing(false);
        setDateOverridden(false);
        setRangeError("");
        const rangeNow = Date.now();
        const liveFrom = rangeNow - liveRangeMs;
        const liveTo = rangeNow;
        setFromDate(liveFrom);
        setToDate(liveTo);
        fromDateRef.current = liveFrom;
        toDateRef.current = liveTo;
        chartRef.current?.resetZoom();
        await fetchChartRange(url, token, liveFrom, liveTo, { showLoading: true });
    };

    const handleLiveRangeChange = async (hours: number) => {
        setIsCustomRangeEditing(false);
        const snapped = liveRangeOptions.reduce((closest, option) => {
            if (Math.abs(option - hours) < Math.abs(closest - hours)) return option;
            return closest;
        }, liveRangeOptions[0]);
        setLiveRangeHours(snapped);
        if (!url || !token || dateOverriddenRef.current) return;

        const rangeNow = Date.now();
        const liveFrom = rangeNow - snapped * 60 * 60 * 1000;
        const liveTo = rangeNow;
        setFromDate(liveFrom);
        setToDate(liveTo);
        fromDateRef.current = liveFrom;
        toDateRef.current = liveTo;
        await fetchChartRange(url, token, liveFrom, liveTo, { showLoading: true });
    };

    const handleApplyCustomRange = async () => {
        if (!url || !token) return;

        const parsedFrom = parseDateTimeLocal(customFromInput);
        const parsedTo = parseDateTimeLocal(customToInput);

        if (!Number.isFinite(parsedFrom) || !Number.isFinite(parsedTo)) {
            setRangeError("Please choose a valid start and end date/time.");
            return;
        }

        if (parsedFrom >= parsedTo) {
            setRangeError("The start date/time must be before the end date/time.");
            return;
        }

        if (parsedFrom > Date.now() || parsedTo > Date.now()) {
            setRangeError("Future date/time is not allowed.");
            return;
        }

        setRangeError("");
        setIsCustomRangeEditing(false);
        setDateOverridden(true);
        setFromDate(parsedFrom);
        setToDate(parsedTo);
        fromDateRef.current = parsedFrom;
        toDateRef.current = parsedTo;
        Preferences.set({
            key: `customRangeMs:${activeServerIndex}`,
            value: String(parsedTo - parsedFrom),
        }).catch(() => {
        });
        await fetchChartRange(url, token, parsedFrom, parsedTo, { showLoading: true });
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
            if (response.status === 401 || response.status === 403) {
                setAuthError("Authentication failed for this server. Please re-authenticate.");
            } else if (response.ok) {
                setAuthError("");
            }
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

    const loadServerDetails = async (activeUrl: string, activeToken: string, serverIndex?: number) => {
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
        if (typeof serverIndex === "number") {
            Preferences.set({ key: `serverDetails:${serverIndex}`, value: JSON.stringify(details) }).catch(() => {
            });
        }
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

    const getPermissionsFromSelection = (selection: { manageServers: boolean; manageUsers: boolean; addServer: boolean; cannotChangePassword: boolean; canSeePrediction: boolean; }) => {
        const permissions =
            (selection.manageServers ? Permissions.SERVER_MANAGEMENT : 0) |
            (selection.manageUsers ? Permissions.USER_MANAGEMENT : 0) |
            (selection.addServer ? Permissions.ADD_SERVER : 0) |
            (selection.cannotChangePassword ? Permissions.CANNOT_CHANGE_PASSWORD : 0) |
            (selection.canSeePrediction ? Permissions.CAN_SEE_PREDICTION : 0);

        return normalizePermissions(permissions);
    };

    const setSelectionFromPermissions = (permissions: number) => {
        const normalized = normalizePermissions(permissions);
        return {
            manageServers: hasPermission(normalized, Permissions.SERVER_MANAGEMENT),
            manageUsers: hasPermission(normalized, Permissions.USER_MANAGEMENT),
            addServer: hasPermission(normalized, Permissions.ADD_SERVER),
            cannotChangePassword: hasPermission(normalized, Permissions.CANNOT_CHANGE_PASSWORD),
            canSeePrediction: hasPermission(normalized, Permissions.CAN_SEE_PREDICTION),
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
        setNewUserPermissions({ manageServers: false, manageUsers: false, addServer: false, cannotChangePassword: false, canSeePrediction: false });
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

    const applyCachedTableData = async (serverIndex: number) => {
        try {
            const cached = await Preferences.get({ key: `latestStats:${serverIndex}` });
            if (!cached.value) return false;
            const parsed = JSON.parse(cached.value) as TableRow[];
            if (!Array.isArray(parsed) || parsed.length === 0) return false;
            setTableData(parsed.map((item) => ({
                ...item,
                playerCountDevelopment: "stagnant",
            })));
            hasLoadedTableRef.current = true;
            setIsTableLoading(false);
            setIsTableCached(true);
            return true;
        } catch {
            return false;
        }
    };

    async function reloadData() {
        const config = serverConfig;
        if (!config?.token || !config?.url) return;
        const tok = config.token as any;
        const ur = config.url as any;
        const serverIndex = parseInt(router.query.server as string) || 0;

        setToken(tok);
        setUrl(ur);
        setAuthError("");

        const now = Date.now();
        const effectiveFrom = dateOverriddenRef.current ? fromDateRef.current : now - liveRangeMsRef.current;
        const effectiveTo = dateOverriddenRef.current ? toDateRef.current : now;

        if (!dateOverriddenRef.current) {
            setFromDate(effectiveFrom);
            setToDate(effectiveTo);
        }

        if (!hasLoadedTableRef.current) {
            setIsTableLoading(true);
            setIsTableSlow(false);
        }

        const latestPromise = requestBackend(ur, tok, "/api/stats/latest", {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        }).then(async (response) => {
            if (response.status === 401 || response.status === 403) return;
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
            });
            hasLoadedTableRef.current = true;
            setIsTableLoading(false);
            setIsTableCached(false);
            const serverIndex = parseInt(router.query.server as string) || 0;
            Preferences.set({ key: `latestStats:${serverIndex}`, value: JSON.stringify(dat) }).catch(() => {
            });
            setIsTableSlow(false);
        }).catch(async () => {
            await applyCachedTableData(serverIndex);
        });

        const latestTimeoutMs = 5000;
        let latestTimeoutId: ReturnType<typeof setTimeout> | null = null;
        const timeoutPromise = new Promise<"timeout">((resolve) => {
            latestTimeoutId = setTimeout(() => resolve("timeout"), latestTimeoutMs);
        });

        const chartPromise = !dateOverriddenRef.current
            ? fetchChartRange(ur, tok, effectiveFrom, effectiveTo, { showLoading: !hasLoadedChartRef.current })
            : Promise.resolve();

        const latestResult = await Promise.race([latestPromise.then(() => "ok" as const), timeoutPromise]);
        if (latestTimeoutId) {
            clearTimeout(latestTimeoutId);
        }
        if (latestResult === "timeout") {
            setIsTableLoading(false);
            setIsTableSlow(true);
            const appliedCached = await applyCachedTableData(serverIndex);
            if (!appliedCached && !hasLoadedTableRef.current && Object.keys(serverDetails).length > 0) {
                const placeholderRows = buildPlaceholderRows(serverDetails);
                if (placeholderRows.length > 0) {
                    setTableData(placeholderRows);
                    setIsTableCached(true);
                    hasLoadedTableRef.current = true;
                }
            }
        }

        await Promise.allSettled([latestPromise, chartPromise]);
    }

    useEffect(() => {
        const intervalId = setInterval(async () => {
            try {
                await reloadData();
            } catch {
            }
        }, pingRate);

        reloadData().catch(() => {
        });

        return () => clearInterval(intervalId);
    }, [router.query, router, serverConfig]);

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
        loadCurrentUser(url, token).catch(() => {
        });
    }, [token, url]);

    useEffect(() => {
        let active = true;
        hasLoadedServerPrefsRef.current = false;

        const loadPrefs = async () => {
            try {
                const dat = await Preferences.get({ key: "servers" });
                if (!active) return;
                const servers = JSON.parse(dat.value || "[]");
                const id = parseInt(router.query.server as string) || 0;
                const server = servers[id];
                if (!server?.token || !server?.url) {
                    hasLoadedServerPrefsRef.current = true;
                    return;
                }

                setActiveServerIndex(id);
                setServerConfig({ token: server.token, url: server.url });

                const [latestStats, serverDetailsCache, hiddenServersCache, customRangeCache, liveRangeCache] = await Promise.all([
                    Preferences.get({ key: `latestStats:${id}` }),
                    Preferences.get({ key: `serverDetails:${id}` }),
                    Preferences.get({ key: `hiddenServers:${id}` }),
                    Preferences.get({ key: `customRangeMs:${id}` }),
                    Preferences.get({ key: `liveRangeHours:${id}` }),
                ]);

                if (!active) return;

                if (latestStats.value) {
                    try {
                        const parsed = JSON.parse(latestStats.value) as TableRow[];
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            setTableData(parsed.map((item) => ({
                                ...item,
                                playerCountDevelopment: "stagnant",
                            })));
                            hasLoadedTableRef.current = true;
                            setIsTableLoading(false);
                            setIsTableCached(true);
                        }
                    } catch {
                    }
                }

                if (serverDetailsCache.value) {
                    try {
                        const parsed = JSON.parse(serverDetailsCache.value);
                        if (parsed && typeof parsed === "object") {
                            setServerDetails(parsed);
                            if (!hasLoadedTableRef.current) {
                                const placeholderRows = buildPlaceholderRows(parsed);
                                if (placeholderRows.length > 0) {
                                    setTableData(placeholderRows);
                                    setIsTableCached(true);
                                    hasLoadedTableRef.current = true;
                                    setIsTableLoading(false);
                                }
                            }
                        }
                    } catch {
                    }
                }

                if (hiddenServersCache.value) {
                    try {
                        const parsed = JSON.parse(hiddenServersCache.value) as string[];
                        if (Array.isArray(parsed)) {
                            setHiddenServers(new Set(parsed));
                        }
                    } catch {
                    }
                }

                if (customRangeCache.value) {
                    try {
                        const parsed = Number(customRangeCache.value);
                        if (Number.isFinite(parsed) && parsed > 0) {
                            const now = Date.now();
                            setCustomFromInput(formatDateTimeLocal(now - parsed));
                            setCustomToInput(formatDateTimeLocal(now));
                        }
                    } catch {
                    }
                }

                if (liveRangeCache.value) {
                    const parsed = Number(liveRangeCache.value);
                    if (Number.isFinite(parsed) && parsed > 0) {
                        setLiveRangeHours(parsed);
                    }
                }

                hasLoadedServerPrefsRef.current = true;
            } catch {
                if (active) {
                    hasLoadedServerPrefsRef.current = true;
                }
            }
        };

        loadPrefs();

        return () => {
            active = false;
        };
    }, [router.query.server, buildPlaceholderRows]);

    useEffect(() => {
        if (!token || !url || !currentUser) return;
        if (hasPermission(currentUser.permissions, Permissions.SERVER_MANAGEMENT)) {
            const serverIndex = parseInt(router.query.server as string) || 0;
            loadServerDetails(url, token, serverIndex).catch(() => {
            });
        }
        if (hasPermission(currentUser.permissions, Permissions.USER_MANAGEMENT)) {
            loadUsers(url, token).catch(() => {
            });
        }
    }, [currentUser, token, url, router.query.server]);


    if (authError) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-xl border border-default-200/60 bg-content1/80 shadow-md backdrop-blur">
                    <CardHeader className="flex flex-col items-start gap-1">
                        <h2 className="text-xl font-semibold">Authentication failed</h2>
                        <p className="text-sm text-default-500">{authError}</p>
                    </CardHeader>
                    <CardBody>
                        <p className="text-sm text-default-500">Return to the server list and re-add or update credentials.</p>
                    </CardBody>
                    <CardFooter className="flex gap-2">
                        <Button variant="flat" onPress={handleBack}>
                            Back to servers
                        </Button>
                        <Button color="primary" onPress={reloadData}>
                            Retry now
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (!backendReachable) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-xl border border-default-200/60 bg-content1/80 shadow-md backdrop-blur">
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
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-sm border border-default-200/60 bg-content1/80 shadow-md backdrop-blur">
                    <CardBody className="text-center text-sm text-default-400">
                        Loading server...
                    </CardBody>
                </Card>
            </div>
        );
    }

    return (
        <>
            <div className="flex w-full max-w-[1400px] flex-col space-y-5 p-4 pt-[max(env(safe-area-inset-top),1.75rem)] sm:p-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-default-200/60 bg-content1/70 px-4 py-3 shadow-sm backdrop-blur">
                <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wide text-default-400">Signed in as</span>
                    <span className="text-lg font-semibold text-foreground">{currentUser?.name || "Loading user..."}</span>
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
                    <Button color="danger" variant="flat" onClick={handleBack}>
                        Back
                    </Button>
                </div>
            </div>

            <Card className="min-h-[520px] md:min-h-[560px] overflow-hidden border border-default-200/60 bg-content1/80 shadow-md backdrop-blur">
                <CardHeader className="border-b border-default-200/60 bg-default-100/10">
                    <div>
                        <h2 className="mb-1 text-xl font-semibold text-foreground">
                        Currently connected players
                        </h2>
                        <p className="text-xs text-default-400">Live view of online players and range controls.</p>
                    </div>
                </CardHeader>
                <CardBody className="h-[280px] md:h-[320px] p-0 overflow-hidden bg-default-100/5">
                    {isChartLoading ? (
                        <div className="flex h-full w-full items-center justify-center p-6">
                            <div className="w-full animate-pulse space-y-3">
                                <div className="h-3 w-32 rounded-full bg-default-200/60" />
                                <div className="grid h-[200px] w-full grid-cols-12 gap-2">
                                    {Array.from({ length: 24 }).map((_, index) => (
                                        <div
                                            key={index}
                                            className="h-full rounded-md bg-default-200/40"
                                            style={{ opacity: 0.35 + (index % 6) * 0.1 }}
                                        />
                                    ))}
                                </div>
                                <div className="h-2 w-48 rounded-full bg-default-200/50" />
                            </div>
                        </div>
                    ) : Object.values(data?.data || {}).some((server: any) => (server?.pings || []).length > 0) ? (
                        <OnlinePlayersChart ref={chartRef} data={data} hiddenServers={hiddenServers} />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-default-400">
                            No data to display yet.
                        </div>
                    )}
                </CardBody>
                <CardFooter className="border-t border-default-200/60 bg-default-100/10">
                    <div className="flex w-full flex-col gap-2 text-xs text-default-400">
                        <div className="flex flex-wrap items-center gap-2 text-default-500">
                            <Button size="sm" variant="flat" onPress={() => handleRangeShift("prev")}>
                                Previous 2h
                            </Button>
                            <Button size="sm" variant="flat" isDisabled={!canGoToNextRange} onPress={() => handleRangeShift("next")}>
                                Next 2h
                            </Button>
                            <Button size="sm" color="primary" variant="flat" onPress={handleRangeReset}>
                                Now
                            </Button>
                            <label className="flex items-center gap-2">
                                <span className="text-default-400">Live window</span>
                                <input
                                    aria-label="Live window range"
                                    className="h-2 w-36 cursor-pointer accent-primary"
                                    type="range"
                                    min={1}
                                    max={24}
                                    step={1}
                                    value={liveRangeHours}
                                    list="live-range-options"
                                    onChange={(event) => handleLiveRangeChange(Number(event.target.value))}
                                />
                                <datalist id="live-range-options">
                                    {liveRangeOptions.map((hours) => (
                                        <option key={hours} value={hours} />
                                    ))}
                                </datalist>
                                <span className="text-default-400">{liveRangeHours}h</span>
                            </label>
                            {!isLiveRange ? (
                                <span className="text-default-400">Custom range</span>
                            ) : (
                                <span className="text-default-400">Live range</span>
                            )}
                        </div>
                        <span>
                            Showing {formatRange(fromDate)} → {formatRange(toDate)}
                        </span>
                        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                            <Input
                                type="datetime-local"
                                label="From"
                                labelPlacement="outside"
                                size="sm"
                                value={customFromInput}
                                max={fromInputMax}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    const parsed = parseDateTimeLocal(value);
                                    if (!Number.isFinite(parsed) || parsed > Date.now()) return;
                                    if (customToInput) {
                                        const parsedTo = parseDateTimeLocal(customToInput);
                                        if (Number.isFinite(parsedTo) && parsed >= parsedTo) return;
                                    }
                                    setIsCustomRangeEditing(true);
                                    setCustomFromInput(value);
                                }}
                            />
                            <Input
                                type="datetime-local"
                                label="To"
                                labelPlacement="outside"
                                size="sm"
                                value={customToInput}
                                min={customFromInput}
                                max={maxSelectableDateTime}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    const parsed = parseDateTimeLocal(value);
                                    if (!Number.isFinite(parsed) || parsed > Date.now()) return;
                                    const parsedFrom = parseDateTimeLocal(customFromInput);
                                    if (Number.isFinite(parsedFrom) && parsed <= parsedFrom) return;
                                    setIsCustomRangeEditing(true);
                                    setCustomToInput(value);
                                }}
                            />
                            <Button size="sm" color="secondary" variant="flat" className="self-end" onPress={handleApplyCustomRange}>
                                Apply custom range
                            </Button>
                        </div>
                        {rangeError ? <span className="text-danger-500">{rangeError}</span> : null}
                        <span className="text-default-400">Applying a custom range disables live chart auto-updates until you press "Now".</span>
                    </div>
                </CardFooter>
            </Card>

            <div>
                <Card className="border border-default-200/60 bg-content1/80 shadow-md backdrop-blur">
                    <CardHeader className="border-b border-default-200/60 bg-default-100/10">
                        <div className="flex w-full items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">Servers</h3>
                                <p className="text-xs text-default-400">Search, filter, and manage visibility.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {isTableCached ? (
                                    <span className="rounded-full border border-warning-300/60 bg-warning-50/10 px-3 py-1 text-[11px] uppercase tracking-wide text-warning-400">
                                        Cached data shown
                                    </span>
                                ) : null}
                                {isTableSlow && !isTableLoading ? (
                                    <span className="rounded-full border border-warning-300/60 bg-warning-50/10 px-3 py-1 text-[11px] uppercase tracking-wide text-warning-400">
                                        Fetching latest…
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </CardHeader>
                    <CardBody className="p-2 sm:p-4">
                        {isTableLoading ? (
                            <div className="w-full animate-pulse space-y-3 px-2 py-4">
                                <div className="h-8 w-full rounded-lg bg-default-200/50" />
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <div key={index} className="h-10 w-full rounded-lg bg-default-200/40" />
                                ))}
                            </div>
                        ) : sortedTableData.length > 0 ? (
                            <ServerTable
                                url={url}
                                token={token}
                                data={sortedTableData}
                                canAddServer={canAddServer}
                                canManageServers={canManageServers}
                                canSeePrediction={canSeePrediction}
                                serverDetails={serverDetails}
                                isCached={isTableCached}
                                onServersChanged={() => {
                                    if (url && token && canManageServers) {
                                        const serverIndex = parseInt(router.query.server as string) || 0;
                                        loadServerDetails(url, token, serverIndex);
                                    }
                                    reloadData();
                                }}
                                hiddenServers={hiddenServers}
                                onToggleServer={handleToggleServer}
                                onToggleAll={handleToggleAll}
                            />
                        ) : (
                            <div className="flex w-full items-center justify-center py-10 text-sm text-default-400">
                                No data to display yet.
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>

            </div>


            <Modal
                isOpen={isAccountModalOpen}
                onOpenChange={setIsAccountModalOpen}
                placement="top-center"
                classNames={modalClassNames}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Change password
                                <span className="text-sm font-normal text-default-400">Update your account credentials.</span>
                            </ModalHeader>
                            <ModalBody className="space-y-3">
                                {accountError ? <p className="text-red-500">{accountError}</p> : null}
                                <Input
                                    label="Current password"
                                    type="password"
                                    variant="bordered"
                                    size="sm"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                                <Input
                                    label="New password"
                                    type="password"
                                    variant="bordered"
                                    size="sm"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <Input
                                    label="Confirm new password"
                                    type="password"
                                    variant="bordered"
                                    size="sm"
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
                classNames={modalClassNames}
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
                                        size="sm"
                                        value={newUserName}
                                        onChange={(e) => setNewUserName(e.target.value)}
                                    />
                                    <Input
                                        label="Temporary password"
                                        variant="bordered"
                                        type="password"
                                        size="sm"
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                    />
                                    <div className="flex flex-col gap-2 rounded-lg border border-default-200/60 bg-default-100/10 p-3">
                                        <span className="text-xs uppercase tracking-wide text-default-400">Permissions</span>
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
                                        <Checkbox
                                            isSelected={newUserPermissions.canSeePrediction}
                                            onValueChange={(value) =>
                                                setNewUserPermissions((prev) => ({ ...prev, canSeePrediction: value }))
                                            }
                                        >
                                            Can see prediction
                                        </Checkbox>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-default-400">Users can be edited or reset below.</span>
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
                                                            isDisabled={currentUser?.id === user.id}
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
            <Modal
                isOpen={!!userPermissionTarget}
                onOpenChange={() => setUserPermissionTarget(null)}
                placement="top-center"
                classNames={modalClassNames}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Edit permissions for {userPermissionTarget?.name}
                                <span className="text-sm font-normal text-default-400">Adjust access levels and visibility.</span>
                            </ModalHeader>
                            <ModalBody className="space-y-3">
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
                                <Checkbox
                                    isSelected={editUserPermissions.canSeePrediction}
                                    onValueChange={(value) =>
                                        setEditUserPermissions((prev) => ({ ...prev, canSeePrediction: value }))
                                    }
                                >
                                    Can see prediction
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
            <Modal
                isOpen={!!userPasswordTarget}
                onOpenChange={() => setUserPasswordTarget(null)}
                placement="top-center"
                classNames={modalClassNames}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Reset password for {userPasswordTarget?.name}
                                <span className="text-sm font-normal text-default-400">Set a temporary password and share it securely.</span>
                            </ModalHeader>
                            <ModalBody className="space-y-3">
                                <Input
                                    label="Temporary password"
                                    type="password"
                                    variant="bordered"
                                    size="sm"
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
