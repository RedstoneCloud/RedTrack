import express from 'express';
import { Request, Response } from 'express';
import fs from 'fs';
import cors from 'cors';
import Sessions from "../models/Sessions";
import Users from "../models/Users";

const app = express();
const port = Number(process.env.backend_port) || 3001;

app.use(cors({
  origin: "*",  // Allows all origins
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // Allowed methods
  allowedHeaders: ["Content-Type", "Authorization"] // Allowed headers
}));
app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//all routers from ./routes/*.ts (or js, if you compile them), use fs, allow nested folders
fs.readdirSync(__dirname + '/routes').forEach((file) => {
  if (file.endsWith('.ts') || file.endsWith('.js')) {
    const route = require(`./routes/${file}`);
    app.use("/api/" + file.split(".")[0].toLowerCase(), route.default);

    console.log(`Route ${file} loaded`);
  }
});


app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});

async function requiresAuth(req: Request, res: Response, next: Function) {
  if (!req.headers.authorization) {
    res.status(401).send({ message: 'Unauthorized - no auth header' });
    return;
  }

  if (req.headers.authorization.split(' ')[0] !== 'Bearer') {
    res.status(401).send({ message: 'Unauthorized - invalid auth header' });
    return;
  }

  let sessionToken = req.headers.authorization.split(' ')[1];

  const nowSeconds = Math.floor(Date.now() / 1000);
  let session = await Sessions.findOne({ token: sessionToken, expiresAt: { $gt: nowSeconds } });
  if (!session) {
    res.status(401).send({ message: 'Unauthorized' });
    return
  }

  let user = await Users.findOne({ _id: session.userId });
  if (!user) {
    res.status(401).send({ message: 'Unauthorized' });
    return
  }

  // @ts-ignore
  req.user = user;

  next();

}

export default app;
export { requiresAuth }
