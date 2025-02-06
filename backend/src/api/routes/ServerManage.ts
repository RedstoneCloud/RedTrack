import { Router, Request, Response } from 'express';
import { requiresAuth } from "../ApiServer";
import Server from "../../models/Server";
import Permissions from "../../utils/Permissions";

const router = Router();

router.post('/create', requiresAuth, async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    if(!Permissions.hasPermission(req.user.permissions, Permissions.ADD_SERVER)) {
        res.status(403).json({ error: "You do not have permission to create a server" });
        return;
    }
    try {
        const { serverName, serverIP, serverPort } = req.body; // TODO: Validation

        if (!serverName || !serverIP || !serverPort || isNaN(parseInt(serverPort))) {
            res.status(400).json({ error: "All fields are required" });
            console.log("All fields are required");
            return;
        }

        await new Server({
            name: serverName,
            ip: serverIP,
            port: serverPort
        }).save();

        console.log("Server created successfully");

        res.status(201).json({ message: "Server created successfully" });
        return;
    } catch (error) {
        console.error("Error creating server:", error);
        res.status(500).json({ error: "An error occurred while creating the server" });
    }
});

export default router;