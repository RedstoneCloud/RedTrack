import { Router, Request, Response } from 'express';
import Users from "../../models/Users";
import { compareHashedPasswords } from "../../utils/Encryption";
import Sessions from "../../models/Sessions";
import { requiresAuth } from "../ApiServer";

const router = Router();

router.post('/startSession', async (req: Request, res: Response) => {
    //log body
    console.log(req.body);
    let user = await Users.findOne({
        name: req.body.name,
    })

    if (!user) {
        res.status(400).send({ message: "User not found" });
        return;
    }

    if (await compareHashedPasswords(req.body.password, user.password)) {
        let session = new Sessions({
            userId: user._id
        })

        await session.save();

        res.status(200).send({ success: true, sessionId: session.token });
    } else {
        res.status(400).send({ message: "Password incorrect" });
    }
});

router.post('/endSession', requiresAuth, async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        res.status(400).send({ message: "Missing token" });
        return;
    }

    await Sessions.deleteOne({ token });
    res.status(200).send({ success: true });
});

export default router;
