import { Button, Input, Form, Card, CardBody, CardHeader, CardFooter } from '@heroui/react';
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { Preferences } from '@capacitor/preferences';
import { useRouter } from "next/router";
import { TrashIcon } from "lucide-react";
import { Capacitor } from "@capacitor/core";

export default function Home() {
  async function deleteServer(index: any) {
    let servers = JSON.parse((await Preferences.get({ key: "servers" })).value || "[]");
    servers.splice(index, 1);
    await Preferences.set({ key: "servers", value: JSON.stringify(servers) });
    setServers(servers);

  }


  function getBackendHost(address: string) {
    try {
      return new URL(address).host;
    } catch {
      return address.replace(/^https?:\/\//, "");
    }
  }

  function resolveServerName(server: { name?: string; username?: string; url: string }) {
    const customName = (server.name || "").trim();
    if (customName) return customName;

    const username = (server.username || "").trim();
    if (username) {
      return `${username}@${getBackendHost(server.url)}`;
    }

    return getBackendHost(server.url);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      setSubmitting(true)
      const form = e.currentTarget;
      const data = new FormData(form);
      const url = (data.get("url") as string).trim();
      const username = (data.get("username") as string).trim();
      const customName = (data.get("serverName") as string | null)?.trim() || "";
      const resolvedName = customName || `${username}@${getBackendHost(url)}`;
      const response = await fetch(url + "/api/auth/startSession", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: username,
          password: data.get("password")
        }),
      });

      setSubmitting(false)

      if (!response.ok) {
        setLoginError(response.statusText + " - " + response.status);
        return;
      }

      const json = await response.json();
      if (json.success) {
        let servers = JSON.parse((await Preferences.get({ key: "servers" })).value || "[]");
        servers.push({
          name: resolvedName,
          username,
          url,
          token: json.sessionId
        });
        await Preferences.set({ key: "servers", value: JSON.stringify(servers) });
        setServers(servers);
        setPage(0);
      } else {
        setLoginError(json.message);
      }
    } catch (error: any) {
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
    Preferences.get({ key: "servers" }).then(data => {
      setServers(data.value ? JSON.parse(data.value) : []);
    })
  }, []);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-3 pb-4 pt-[max(env(safe-area-inset-top),1rem)] dark:bg-slate-950">
      {
        page === 0 ? (
          <Card className={"page-card"}>
            <CardHeader className="flex flex-col items-center gap-3">
              <Image src="/logo.png" alt="logo" width={128} height={128} className="rounded-lg" />
              <h1 className="font-bold text-large">RedTrack</h1>
            </CardHeader>
            <CardBody className="px-3 py-0 text-medium text-default-400">
              <p>
                Welcome to <strong>RedTrack</strong>.
                To get started, please select or add a new server below.
              </p>

              <div className={"mt-2 flex max-h-[35vh] flex-col gap-2 overflow-y-auto pr-1"}>
                {
                  servers.map((server: any, index: any) => (
                    <div className="inline-flex gap-2" key={index}>
                      <Button key={index} variant="bordered" className="w-full justify-start" onPress={() => {
                        //reload the page
                        if (!Capacitor.isNativePlatform()) router.reload()
                        router.push("/dashboard?server=" + index);
                      }}>
                        <div className='flex flex-col items-start text-left'>
                          <span className='font-semibold'>{resolveServerName(server)}</span>
                          <span className='text-xs text-default-500'>{server.url}</span>
                        </div>
                      </Button>
                      <Button key={"del" + index} variant="flat" color="danger" className="min-w-10" onPress={() => {
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
              <Button color="default" className="w-full" startContent={<PlusIcon />} variant="faded" onPress={() => setPage(1)}>
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
              <Image src="/logo.png" alt="logo" width={112} height={112} className="rounded-lg" />
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

                <Input
                  type="text"
                  name="serverName"
                  label={"Server entry name (optional)"}
                  placeholder="My Production"
                  labelPlacement="outside"
                  disabled={submitting}
                  className="border-25 border-black" />

                <div className='flex flex-col gap-2 sm:flex-row sm:justify-between'>
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
            <CardFooter className='flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between'>
              <Button className='w-full sm:w-auto' type="submit" onClick={() => (document.getElementById("addform") as HTMLFormElement).requestSubmit()} variant="flat" color="success" disabled={submitting}>
                {submitting ? "Loading..." : "Submit"}
              </Button>

              <Button className='w-full sm:w-auto' onPress={() => setPage(0)} variant="bordered" disabled={submitting}>
                Back to list
              </Button>
            </CardFooter>
          </Card>
        ) : (<></>)
      }
    </div>
  );
}
