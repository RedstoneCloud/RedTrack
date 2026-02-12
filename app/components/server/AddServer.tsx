import React from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    useDisclosure,
    Input,
    Checkbox,
} from "@heroui/react";

import { PlusIcon } from "@/components/icons";

export function AddServer({
    url,
    token,
    onServerAdded,
}: {
    url: string,
    token: string,
    onServerAdded?: () => void,
}) {

    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [serverName, setServerName] = React.useState("");
    const [serverIP, setServerIP] = React.useState("");
    const [serverPort, setServerPort] = React.useState("");
    const [isBedrockServer, setIsBedrockServer] = React.useState(true);
    const [serverColor, setServerColor] = React.useState(`#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`);
    const [error, setError] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const modalClassNames = {
        wrapper: "items-start p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:p-6",
        base: "my-2 sm:my-8",
    };

    const resetForm = () => {
        setServerName("");
        setServerIP("");
        setServerPort("");
        setIsBedrockServer(true);
        setServerColor(`#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`);
        setError("");
        setIsSubmitting(false);
    };

    const validateForm = () => {
        const trimmedName = serverName.trim();
        const trimmedIP = serverIP.trim();
        const parsedPort = Number(serverPort);

        if (!trimmedName || !trimmedIP || !serverPort) {
            setError("All fields are required.");
            return null;
        }

        if (trimmedName.length < 2 || trimmedName.length > 64) {
            setError("Server name must be between 2 and 64 characters.");
            return null;
        }

        if (Number.isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
            setError("Server port must be between 1 and 65535.");
            return null;
        }

        const colorRegex = /^#[0-9A-Fa-f]{6}$/;
        if (!colorRegex.test(serverColor)) {
            setError("Server color must be a valid hex color.");
            return null;
        }

        return {
            serverName: trimmedName,
            serverIP: trimmedIP,
            serverPort: parsedPort,
            bedrock: isBedrockServer,
            color: serverColor,
        };
    };

    const handleAddServer = async () => {
        if (!url) {
            setError("Server URL is missing.");
            return;
        }

        const formData = validateForm();
        if (!formData) return;

        try {
            setIsSubmitting(true);
            setError("");
            fetch(url + "/api/servermanage/create", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authorization': 'Bearer ' + token
                },
                body: JSON.stringify(formData)
            }).then(d => d.json()).then(data => {
                if (data.error) {
                    setError(data.error);
                } else {
                    onOpenChange();
                    resetForm();
                    onServerAdded?.();
                }
                setIsSubmitting(false);
            });
        } catch (e: any) {
            setError(e.toString());
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Button color="primary" onPress={onOpen} endContent={<PlusIcon />}>
                Add server
            </Button>
            <Modal
                isOpen={isOpen}
                onOpenChange={() => {
                    onOpenChange();
                    resetForm();
                }}
                placement="top-center"
                classNames={modalClassNames}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Add server
                                <span className="text-sm font-normal text-default-400">Create a new server entry for monitoring.</span>
                            </ModalHeader>
                            <ModalBody className="space-y-3">
                                {error ? <p className="text-red-500">{error}</p> : null}
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Input
                                        label="Server Name"
                                        placeholder="Survival Realm"
                                        variant="bordered"
                                        size="sm"
                                        onChange={(e) => setServerName(e.target.value)}
                                        value={serverName}
                                    />
                                    <Input
                                        label="Server Address"
                                        placeholder="hivebedrock.network"
                                        variant="bordered"
                                        size="sm"
                                        onChange={(e) => setServerIP(e.target.value)}
                                        value={serverIP}
                                    />
                                    <Input
                                        label="Port"
                                        placeholder="19132"
                                        variant="bordered"
                                        size="sm"
                                        onChange={(e) => setServerPort(e.target.value)}
                                        value={serverPort}
                                        description="Default Bedrock: 19132, Java: 25565"
                                    />
                                    <div className="flex flex-col gap-2">
                                        <Checkbox isSelected={isBedrockServer} onValueChange={setIsBedrockServer}>
                                            Bedrock server (disable for Java)
                                        </Checkbox>
                                        <Input
                                            type="color"
                                            label="Server color"
                                            variant="bordered"
                                            size="sm"
                                            onChange={(e) => setServerColor(e.target.value)}
                                            value={serverColor}
                                        />
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="flat" onPress={onClose} isDisabled={isSubmitting}>
                                    Close
                                </Button>
                                <Button color="primary" onPress={handleAddServer} isLoading={isSubmitting}>
                                    Add server
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
}
