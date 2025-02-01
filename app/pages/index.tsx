import { Button, Input, Form, Divider, Card, CardBody, CardHeader, CardFooter } from '@heroui/react';
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { AddCircle } from "../components/icons"

export default function Home() {
  async function deleteServer(index: any) {
    let servers = localStorage.getItem("servers") ? JSON.parse(localStorage?.getItem("servers") || "[]") : [];
    servers.splice(index, 1);
    localStorage.setItem("servers", JSON.stringify(servers));
    setServers(servers);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const url = data.get("url") as string;
    const response = await fetch(url + "/api/auth/startSession", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.get("username"),
        password: data.get("password")
      }),
    });
    const json = await response.json();
    console.log(json);
    if (json.success) {
      let servers = localStorage.getItem("servers") ? JSON.parse(localStorage?.getItem("servers") || "[]") : [];
      servers.push({
        url: url,
        token: json.sessionId
      });
      localStorage.setItem("servers", JSON.stringify(servers));
      setServers(servers);
      setPage(0);
    } else {
      setLoginError(json.message);
    }
  }

  let [page, setPage] = useState(0);
  let [servers, setServers] = useState([]);
  let [loginError, setLoginError] = useState(null);

  useEffect(() => {
    setServers(localStorage.getItem("servers") ? JSON.parse(localStorage?.getItem("servers") || "[]") : []);
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center py-2 h-screen min-w-96 w-96 max-w-96"
    >
      {
        page === 0 ? (
          <Card className={"page-card"}>
            <CardHeader className="flex flex-col items-center gap-3">
              <Image src="https://avatars.githubusercontent.com/u/178515769?s=200&v=4" alt="logo" width={200} height={200} className="rounded-lg" />
              <h1 className="font-bold text-large">RedTrack</h1>
            </CardHeader>
            <CardBody className="px-3 py-0 text-medium text-default-400">
              <p>
                Welcome to <strong>RedTrack</strong>.
                To get started, please select or add a new server below.
              </p>

              <div className={"flex flex-col gap-2"}>
                {
                  servers.map((server: any, index: any) => (
                    <Button key={index} variant="bordered" onPress={() => window.location.href = "/dashboard?server=" + index}>
                      {server.url}
                      <Button key={"del" + index} variant="bordered" onPress={() => {
                        deleteServer(index);
                      }}>
                        Delete
                      </Button>
                    </Button>
                  ))
                }
              </div>
            </CardBody>
            <CardFooter>
              <Button color="default" startContent={<AddCircle />} variant="faded" onPress={() => setPage(1)}>
                Add new server
              </Button>
            </CardFooter>
          </Card>
        ) : (<></>)
      }

      {
        page === 1 ? (
          <Card className={"page-card"}>
            <CardHeader className="flex flex-col items-center gap-3">
              <Image src="https://avatars.githubusercontent.com/u/178515769?s=200&v=4" alt="logo" width={200} height={200} className="rounded-lg" />
              <h1 className="font-bold text-large">RedTrack</h1>
            </CardHeader>
            <CardBody>
              <Form
                onSubmit={handleSubmit}
                validationBehavior="native"
                className="flex flex-col py-2"
              >
                <p className="text-danger">
                  {loginError}
                </p>
                <Input
                  type="url"
                  name="url"
                  label={"Backend IP Address"}
                  placeholder="http://localhost:3000"
                  errorMessage="Please enter a valid backend address"
                  labelPlacement="outside"
                  className="border-25 border-black" />

                <div className='flex justify-between gap-2'>
                  <Input
                    type="text"
                    name="username"
                    label={"Username"}
                    placeholder="admin"
                    errorMessage="Please enter a username"
                    labelPlacement="outside"
                    className="border-25 border-black" />

                  <Input
                    type="password"
                    name="password"
                    label={"Password"}
                    placeholder="changeme"
                    errorMessage="Please enter a password"
                    labelPlacement="outside"
                    className="border-25 border-black" />
                </div>
              </Form>
            </CardBody>
            <CardFooter className='flex justify-between gap-2'>
              <Button type="submit" variant="flat" color="success">
                Submit
              </Button>

              <Button onPress={() => setPage(0)} variant="bordered">
                Back to list
              </Button>
            </CardFooter>
          </Card>
        ) : (<></>)
      }
    </div>
  );
}
