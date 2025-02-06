import { Button, Input, Form, Card, CardBody, CardHeader, CardFooter } from '@heroui/react';
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { Preferences } from '@capacitor/preferences';
import {useRouter} from "next/router";
import {TrashIcon} from "lucide-react";
import {Capacitor} from "@capacitor/core";

export default function Home() {
  async function deleteServer(index: any) {
    let servers = JSON.parse((await Preferences.get({key: "servers"})).value || "[]");
    servers.splice(index, 1);
    await Preferences.set({key: "servers", value: JSON.stringify(servers)});
    setServers(servers);

  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    try {
        e.preventDefault();
        setSubmitting(true)
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

        setSubmitting(false)

        if(!response.ok) {
            setLoginError(response.statusText + " - " + response.status);
            return;
        }

        const json = await response.json();
        if (json.success) {
            let servers = JSON.parse((await Preferences.get({key: "servers"})).value || "[]");
            servers.push({
                url: url,
                token: json.sessionId
            });
            await Preferences.set({key: "servers", value: JSON.stringify(servers)});
            setServers(servers);
            setPage(0);
        } else {
            setLoginError(json.message);
        }
    } catch (error : any) {
        setSubmitting(false)
        setLoginError(error.message);
    }
  }

  let [page, setPage] = useState(0);
  let [servers, setServers] = useState([]);
  let [loginError, setLoginError] = useState("");
  let [submitting, setSubmitting] = useState(false);

  let router = useRouter();

  useEffect(() => {
      Preferences.get({key: "servers"}).then(data => {
          setServers(data.value ? JSON.parse(data.value) : []);
      })
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-2 w-full h-screen">
      {
        page === 0 ? (
          <Card className={"page-card"}>
            <CardHeader className="flex flex-col items-center gap-3">
              <Image src="/logo.png" alt="logo" width={200} height={200} className="rounded-lg" />
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
                    <div className="inline-flex gap-2">
                        <Button key={index} variant="bordered" className="w-full" onPress={() => {
                            //reload the page
                            if(!Capacitor.isNativePlatform()) router.reload()
                            router.push("/dashboard?server=" + index);
                        }}>
                            {server.url}
                        </Button>
                        <Button key={"del" + index} variant="flat" color="danger" className="w-1/6" onPress={() => {
                            deleteServer(index);
                        }}>
                            <TrashIcon width={25} />
                        </Button>
                    </div>
                  ))
                }
              </div>
            </CardBody>
            <CardFooter>
              <Button color="default" startContent={<PlusIcon />} variant="faded" onPress={() => setPage(1)}>
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
                id={"addform"}
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
                  disabled={submitting}
                  className="border-25 border-black" />

                <div className='flex justify-between gap-2'>
                  <Input
                    type="text"
                    name="username"
                    label={"Username"}
                    placeholder="admin"
                    errorMessage="Please enter a username"
                    labelPlacement="outside"
                    disabled={submitting}
                    className="border-25 border-black" />

                  <Input
                    type="password"
                    name="password"
                    label={"Password"}
                    placeholder="changeme"
                    errorMessage="Please enter a password"
                    labelPlacement="outside"
                    disabled={submitting}
                    className="border-25 border-black" />
                </div>
              </Form>
            </CardBody>
            <CardFooter className='flex justify-between gap-2'>
              <Button type="submit" onClick={() => (document.getElementById("addform") as HTMLFormElement).requestSubmit()} variant="flat" color="success" disabled={submitting}>
                {submitting ? "Loading..." : "Submit"}
              </Button>

              <Button onPress={() => setPage(0)} variant="bordered" disabled={submitting}>
                Back to list
              </Button>
            </CardFooter>
          </Card>
        ) : (<></>)
      }
    </div>
  );
}
