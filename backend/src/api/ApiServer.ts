import express from 'express';
import { Request, Response } from 'express';
import fs from 'fs';
import http from 'http';
import https from 'https';
import cors from 'cors';
import Sessions from "../models/Sessions";
import Users from "../models/Users";

const app = express();
const port = Number(process.env.backend_port) || 3001;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

fs.readdirSync(__dirname + '/routes').forEach((file) => {
  if (file.endsWith('.ts') || file.endsWith('.js')) {
    const route = require(`./routes/${file}`);
    app.use("/api/" + file.split(".")[0].toLowerCase(), route.default);
  }
});

const httpsEnabled = process.env.backend_https_enabled === "true";
const httpsKeyPath = process.env.backend_https_key_path;
const httpsCertPath = process.env.backend_https_cert_path;

if (httpsEnabled && (!httpsKeyPath || !httpsCertPath)) {
  throw new Error("HTTPS is enabled, but backend_https_key_path/backend_https_cert_path are not configured");
}

if (httpsEnabled && (!fs.existsSync(httpsKeyPath as string) || !fs.existsSync(httpsCertPath as string))) {
  throw new Error("HTTPS is enabled, but certificate files do not exist");
}

const server = httpsEnabled
  ? https.createServer(
      {
        key: fs.readFileSync(httpsKeyPath as string),
        cert: fs.readFileSync(httpsCertPath as string),
      },
      app
    )
  : http.createServer(app);

server.listen(port, () => {
  const protocol = httpsEnabled ? "https" : "http";
  console.log(`Server started at ${protocol}://localhost:${port}`);
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
