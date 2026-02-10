import { Router, Request, Response } from 'express';
import { requiresAuth } from "../ApiServer";
import Server from "../../models/Server";
import Permissions from "../../utils/Permissions";

const router = Router();

const parseBedrockFlag = (value: unknown, fallback = true): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;
    }
    return fallback;
};

const isValidHostname = (value: string): boolean => {
    const hostnameRegex = /^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$/;
    return hostnameRegex.test(value);
};

const isValidIpAddress = (value: string): boolean => {
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1)$/;
    return ipv4Regex.test(value) || ipv6Regex.test(value);
};

const isValidHexColor = (value: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(value);
};

router.post('/create', requiresAuth, async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    if (!Permissions.canCreateServer(req.user.permissions)) {
        res.status(403).json({ error: "You do not have permission to create a server" });
        return;
    }
    try {
        const { serverName, serverIP, serverPort, bedrock, color } = req.body;
        const trimmedServerName = typeof serverName === "string" ? serverName.trim() : "";
        const trimmedServerIP = typeof serverIP === "string" ? serverIP.trim() : "";
        const parsedPort = typeof serverPort === "string" ? parseInt(serverPort, 10) : Number(serverPort);
        const isBedrockServer = parseBedrockFlag(bedrock, true);
        const parsedColor = typeof color === "string" ? color.trim() : "";

        if (!trimmedServerName || !trimmedServerIP || !serverPort || Number.isNaN(parsedPort)) {
            res.status(400).json({ error: "All fields are required" });
            console.log("All fields are required");
            return;
        }

        if (trimmedServerName.length < 2 || trimmedServerName.length > 64) {
            res.status(400).json({ error: "Server name must be between 2 and 64 characters" });
            return;
        }

        if (!isValidHostname(trimmedServerIP) && !isValidIpAddress(trimmedServerIP)) {
            res.status(400).json({ error: "Server address must be a valid hostname or IP" });
            return;
        }

        if (parsedPort < 1 || parsedPort > 65535) {
            res.status(400).json({ error: "Server port must be between 1 and 65535" });
            return;
        }

        if (parsedColor && !isValidHexColor(parsedColor)) {
            res.status(400).json({ error: "Server color must be a valid hex color" });
            return;
        }

        await new Server({
            name: trimmedServerName,
            ip: trimmedServerIP,
            port: parsedPort,
            bedrock: isBedrockServer,
            ...(parsedColor ? { color: parsedColor } : {}),
        }).save();

        console.log("Server created successfully");

        res.status(201).json({ message: "Server created successfully" });
        return;
    } catch (error) {
        console.error("Error creating server:", error);
        res.status(500).json({ error: "An error occurred while creating the server" });
    }
});

router.get('/list', requiresAuth, async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    if (!Permissions.hasPermission(req.user.permissions, Permissions.SERVER_MANAGEMENT)) {
        res.status(403).json({ error: "You do not have permission to view servers" });
        return;
    }

    try {
        const servers = await Server.find().sort({ name: 1 });
        res.status(200).json(servers);
    } catch (error) {
        console.error("Error listing servers:", error);
        res.status(500).json({ error: "An error occurred while listing servers" });
    }
});

router.patch('/:id', requiresAuth, async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    if (!Permissions.hasPermission(req.user.permissions, Permissions.SERVER_MANAGEMENT)) {
        res.status(403).json({ error: "You do not have permission to update servers" });
        return;
    }

    try {
        const { id } = req.params;
        const { serverName, serverIP, serverPort, bedrock, color } = req.body;
        const trimmedServerName = typeof serverName === "string" ? serverName.trim() : "";
        const trimmedServerIP = typeof serverIP === "string" ? serverIP.trim() : "";
        const parsedPort = typeof serverPort === "string" ? parseInt(serverPort, 10) : Number(serverPort);
        const isBedrockServer = parseBedrockFlag(bedrock, true);
        const parsedColor = typeof color === "string" ? color.trim() : "";

        if (!trimmedServerName || !trimmedServerIP || !serverPort || Number.isNaN(parsedPort)) {
            res.status(400).json({ error: "All fields are required" });
            return;
        }

        if (trimmedServerName.length < 2 || trimmedServerName.length > 64) {
            res.status(400).json({ error: "Server name must be between 2 and 64 characters" });
            return;
        }

        if (!isValidHostname(trimmedServerIP) && !isValidIpAddress(trimmedServerIP)) {
            res.status(400).json({ error: "Server address must be a valid hostname or IP" });
            return;
        }

        if (parsedPort < 1 || parsedPort > 65535) {
            res.status(400).json({ error: "Server port must be between 1 and 65535" });
            return;
        }

        if (parsedColor && !isValidHexColor(parsedColor)) {
            res.status(400).json({ error: "Server color must be a valid hex color" });
            return;
        }

        const updatedServer = await Server.findByIdAndUpdate(
            id,
            {
                name: trimmedServerName,
                ip: trimmedServerIP,
                port: parsedPort,
                bedrock: isBedrockServer,
                ...(parsedColor ? { color: parsedColor } : {}),
            },
            { new: true }
        );

        if (!updatedServer) {
            res.status(404).json({ error: "Server not found" });
            return;
        }

        res.status(200).json(updatedServer);
    } catch (error) {
        console.error("Error updating server:", error);
        res.status(500).json({ error: "An error occurred while updating the server" });
    }
});

router.delete('/:id', requiresAuth, async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    if (!Permissions.hasPermission(req.user.permissions, Permissions.SERVER_MANAGEMENT)) {
        res.status(403).json({ error: "You do not have permission to delete servers" });
        return;
    }

    try {
        const { id } = req.params;
        const deletedServer = await Server.findByIdAndDelete(id);
        if (!deletedServer) {
            res.status(404).json({ error: "Server not found" });
            return;
        }

        res.status(200).json({ message: "Server deleted successfully" });
    } catch (error) {
        console.error("Error deleting server:", error);
        res.status(500).json({ error: "An error occurred while deleting the server" });
    }
});

export default router;
