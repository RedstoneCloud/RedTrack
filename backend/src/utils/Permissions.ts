export default class Permissions {
    public static SERVER_MANAGEMENT = 0x1;
    public static USER_MANAGEMENT = 0x2;
    public static ADD_SERVER = 0x4;
    public static CANNOT_CHANGE_PASSWORD = 0x8;

    public static all = Permissions.SERVER_MANAGEMENT | Permissions.USER_MANAGEMENT | Permissions.ADD_SERVER;
    public static none = 0;

    public static hasPermission(permissions: number, permission: number) {
        return (permissions & permission) === permission;
    }

    public static canCreateServer(permissions: number) {
        return Permissions.hasPermission(permissions, Permissions.ADD_SERVER)
            || Permissions.hasPermission(permissions, Permissions.SERVER_MANAGEMENT);
    }

    public static normalize(permissions: number) {
        if (Permissions.hasPermission(permissions, Permissions.SERVER_MANAGEMENT)) {
            return Permissions.addPermission(permissions, Permissions.ADD_SERVER);
        }

        return permissions;
    }

    public static addPermission(permissions: number, permission: number) {
        return permissions | permission;
    }

    public static removePermission(permissions: number, permission: number) {
        return permissions & ~permission;
    }

    public static togglePermission(permissions: number, permission: number) {
        return permissions ^ permission;
    }
}
