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

    const handleAddServer = async () => {
        const formData = {
          serverName,
          serverIP,
          serverPort
        };
        
        onOpenChange();

        if (!url) { // TODO: Add toasts - not yet added within heroui
            return;
        }

        fetch(url + "/api/servermanage/create", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': 'Bearer ' + token
            },
            body: JSON.stringify(formData)
        })
    };

    return (
        <>
            <Button color="primary" onPress={onOpen} endContent={<PlusIcon />}>
                Add server
            </Button>
            <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="top-center">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Add server</ModalHeader>
                            <ModalBody>
                                <Input
                                    label="Server Name"
                                    placeholder="The name of the server"
                                    variant="bordered"
                                    onChange={(e) => setServerName(e.target.value)}
                                />
                                <Input
                                    label="Server Address"
                                    placeholder="Enter the server's address, e.g. hivebedrock.network"
                                    variant="bordered"
                                    onChange={(e) => setServerIP(e.target.value)}
                                />
                                <Input
                                    label="Port"
                                    placeholder="Enter the server's port"
                                    variant="bordered"
                                    onChange={(e) => setServerPort(e.target.value)}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="flat" onPress={onClose}>
                                    Close
                                </Button>
                                <Button color="primary" onPress={handleAddServer}>
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