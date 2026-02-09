export const Permissions = {
    SERVER_MANAGEMENT: 0x1,
    USER_MANAGEMENT: 0x2,
    ADD_SERVER: 0x4,
};

export const hasPermission = (permissions: number, permission: number) =>
    (permissions & permission) === permission;
