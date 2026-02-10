import { Router, Request, Response } from 'express';
import { requiresAuth } from "../ApiServer";
import Users from "../../models/Users";
import Permissions from "../../utils/Permissions";
import { compareHashedPasswords, hashPassword } from "../../utils/Encryption";

const router = Router();

router.get('/me', requiresAuth, async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    res.status(200).json({
        id: user._id,
        name: user.name,
        permissions: user.permissions
    });
});

router.get('/list', requiresAuth, async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    if (!Permissions.hasPermission(req.user.permissions, Permissions.USER_MANAGEMENT)) {
        res.status(403).json({ error: "You do not have permission to view users" });
        return;
    }

    const users = await Users.find().sort({ name: 1 });
    res.status(200).json(users.map((user) => ({
        id: user._id,
        name: user.name,
        permissions: user.permissions
    })));
});

router.post('/create', requiresAuth, async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    if (!Permissions.hasPermission(req.user.permissions, Permissions.USER_MANAGEMENT)) {
        res.status(403).json({ error: "You do not have permission to create users" });
        return;
    }

    const { name, password, permissions } = req.body;
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName || typeof password !== "string" || password.length < 6) {
        res.status(400).json({ error: "Name and password (min 6 chars) are required" });
        return;
    }

    const parsedPermissions = typeof permissions === "number" ? permissions : Permissions.none;

    const hashedPassword = await hashPassword(password);

    try {
        const user = await new Users({
            name: trimmedName,
            password: hashedPassword,
            permissions: Permissions.normalize(parsedPermissions)
        }).save();

        res.status(201).json({ id: user._id, name: user.name, permissions: user.permissions });
    } catch (error) {
        res.status(500).json({ error: "An error occurred while creating the user" });
    }
});

router.patch('/:id/permissions', requiresAuth, async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    if (!Permissions.hasPermission(req.user.permissions, Permissions.USER_MANAGEMENT)) {
        res.status(403).json({ error: "You do not have permission to update user permissions" });
        return;
    }

    const { permissions } = req.body;
    if (typeof permissions !== "number") {
        res.status(400).json({ error: "Permissions must be a number" });
        return;
    }

    const user = await Users.findById(req.params.id);
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    user.permissions = Permissions.normalize(permissions);
    await user.save();

    res.status(200).json({ id: user._id, name: user.name, permissions: user.permissions });
});

router.post('/change-password', requiresAuth, async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body;

    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || newPassword.length < 6) {
        res.status(400).json({ error: "Current and new password (min 6 chars) are required" });
        return;
    }

    // @ts-ignore
    const user = req.user;
    const matches = await compareHashedPasswords(currentPassword, user.password);
    if (!matches) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
    }

    user.password = await hashPassword(newPassword) as string;
    await user.save();
    res.status(200).json({ message: "Password updated" });
});

router.patch('/:id/password', requiresAuth, async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    if (!Permissions.hasPermission(req.user.permissions, Permissions.USER_MANAGEMENT)) {
        res.status(403).json({ error: "You do not have permission to update users" });
        return;
    }

    const { newPassword } = req.body;
    if (typeof newPassword !== "string" || newPassword.length < 6) {
        res.status(400).json({ error: "New password must be at least 6 characters" });
        return;
    }

    const user = await Users.findById(req.params.id);
    if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    user.password = await hashPassword(newPassword) as string;
    await user.save();
    res.status(200).json({ message: "Password updated" });
});

router.delete('/:id', requiresAuth, async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    if (!Permissions.hasPermission(req.user.permissions, Permissions.USER_MANAGEMENT)) {
        res.status(403).json({ error: "You do not have permission to delete users" });
        return;
    }

    // @ts-ignore
    if (req.user._id.toString() === req.params.id) {
        res.status(400).json({ error: "You cannot delete your own account" });
        return;
    }

    const deletedUser = await Users.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    res.status(200).json({ message: "User deleted" });
});

export default router;
