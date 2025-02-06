export default class Permissions {
    public static SERVER_MANAGEMENT = 0x1;
    public static USER_MANAGEMENT = 0x2;
    public static ADD_SERVER = 0x4;

    public static all = Permissions.SERVER_MANAGEMENT | Permissions.USER_MANAGEMENT | Permissions.ADD_SERVER;
    public static none = 0;

    public static hasPermission(permissions: number, permission: number) {
        return (permissions & permission) === permission;
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