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
} from "@heroui/react";

import { PlusIcon } from "@/components/icons";

export function AddServer({
    url,
    token
}: {
    url: string,
    token: string
}) {

    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [serverName, setServerName] = React.useState("");
    const [serverIP, setServerIP] = React.useState("");
    const [serverPort, setServerPort] = React.useState("");
    const [error, setError] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const resetForm = () => {
        setServerName("");
        setServerIP("");
        setServerPort("");
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

        return {
            serverName: trimmedName,
            serverIP: trimmedIP,
            serverPort: parsedPort
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
            <Modal isOpen={isOpen} onOpenChange={() => {
                onOpenChange();
                resetForm();
            }} placement="top-center">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                Add server
                            </ModalHeader>
                            <ModalBody>
                                {error ? <p className="text-red-500">{error}</p> : null}
                                <Input
                                    label="Server Name"
                                    placeholder="The name of the server"
                                    variant="bordered"
                                    onChange={(e) => setServerName(e.target.value)}
                                    value={serverName}
                                />
                                <Input
                                    label="Server Address"
                                    placeholder="Enter the server's address, e.g. hivebedrock.network"
                                    variant="bordered"
                                    onChange={(e) => setServerIP(e.target.value)}
                                    value={serverIP}
                                />
                                <Input
                                    label="Port"
                                    placeholder="Enter the server's port"
                                    variant="bordered"
                                    onChange={(e) => setServerPort(e.target.value)}
                                    value={serverPort}
                                />
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
