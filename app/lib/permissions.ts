export const Permissions = {
    SERVER_MANAGEMENT: 0x1,
    USER_MANAGEMENT: 0x2,
    ADD_SERVER: 0x4,
};

export const hasPermission = (permissions: number, permission: number) =>
    (permissions & permission) === permission;

export const normalizePermissions = (permissions: number) => {
    if (hasPermission(permissions, Permissions.SERVER_MANAGEMENT)) {
        return permissions | Permissions.ADD_SERVER;
    }

    return permissions;
};

export const describePermissions = (permissions: number) => {
    const values = normalizePermissions(permissions);
    const labels: string[] = [];

    if (hasPermission(values, Permissions.SERVER_MANAGEMENT)) labels.push("Manage servers");
    if (hasPermission(values, Permissions.ADD_SERVER)) labels.push("Add servers");
    if (hasPermission(values, Permissions.USER_MANAGEMENT)) labels.push("Manage users");

    return labels.length > 0 ? labels.join(", ") : "No permissions";
};
