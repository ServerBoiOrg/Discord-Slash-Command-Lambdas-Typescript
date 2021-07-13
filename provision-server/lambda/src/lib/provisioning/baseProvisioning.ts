import { v4 as uuidv4 } from "uuid";

export interface ProvisioningBaseProps {
    userId: string;
    service: string;
    name: string;
    game: string;
    interactionToken: string;
    applicationId: string;
    executionName: string;
    url: string
}

export interface ProvisionServerResponse {
    readonly port: number
}

export class ProvisioningBase {
    readonly serverId: string;
    readonly userId: string;
    readonly service: string;
    readonly name: string;
    readonly game: string;
    readonly interactionToken: string;
    readonly applicationId: string;
    readonly executionName: string;
    readonly url: string
  
    constructor(props: ProvisioningBaseProps) {
        this.serverId = uuidv4().slice(-4);
        this.userId = props.userId;
        this.service = props.service;
        this.name = props.name;
        this.game = props.game;
        this.interactionToken = props.interactionToken;
        this.applicationId = props.applicationId;
        this.executionName = props.executionName;
        this.url = props.url
    }

    provisionServer = async(): Promise<ProvisionServerResponse> => {
        return {
            port: 0
        }
    }
}