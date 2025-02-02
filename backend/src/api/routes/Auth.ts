import { Router, Request, Response } from 'express';
import Users from "../../models/Users";
import {compareHashedPasswords} from "../../utils/Encryption";
import Sessions from "../../models/Sessions";

const router = Router();

router.post('/startSession', async (req: Request, res: Response) => {
    //log body
    console.log(req.body);
    let user = await Users.findOne({
        name: req.body.name,
    })

    if(!user) {
        res.status(400).send({message: "User not found"});
        return;
    }

    if(await compareHashedPasswords(req.body.password, user.password)) {
        let session = new Sessions({
            userId: user._id
        })

        await session.save();

        res.status(200).send({success: true, sessionId: session.token});
    } else {
        res.status(400).send({message: "Password incorrect"});
    }
});

export default router;