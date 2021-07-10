import { v4 as uuidv4 } from "uuid";
import {
  DynamoDBClient,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  QueryOutput,
} from "@aws-sdk/client-dynamodb";
import internal = require("stream");

interface ProvisionServerEvent {
  service: string;
}

interface ProvisionServerResponse extends ProvisionServerEvent {
  service: string;
}

export const lambdaHandler = async (
  event: ProvisionServerEvent
): Promise<ProvisionServerResponse> => {
  const service = event.service;

  switch (service) {
    case "aws":
      console.log(service);
    case "linode":
      console.log(service);
    case "vultr":
      console.log(service);
  }

  return event;
};

interface ProvisioningBaseProps {
  userId: number;
  service: string;
  name: string;
  game: string;
  interactionToken: string;
  applicationId: string;
  executionName: string;
}

export class ProvisioningBase {
  readonly serverId: string;
  readonly userId: number;
  readonly service: string;
  readonly name: string;
  readonly game: string;
  readonly interactionToken: string;
  readonly applicationId: string;
  readonly executionName: string;

  constructor(props: ProvisioningBaseProps) {
    this.serverId = uuidv4().slice(-4);
    this.userId = props.userId;
    this.service = props.service;
    this.name = props.name;
    this.game = props.game;
    this.interactionToken = props.interactionToken;
    this.applicationId = props.applicationId;
    this.executionName = props.executionName;
  }

  private onQuery(err: any, data: QueryCommandOutput): QueryOutput {
    if (err) {
      console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
    } else {
      console.log("Query succeeded.");
      return data;
    }
  }

  async query_user_info(): Promise<QueryCommandOutput> {
    const dynamo = new DynamoDBClient({});

    const queryParams: QueryCommandInput = {
      TableName: process.env.USER_TABLE,
      KeyConditionExpression: `UserID = ${this.userId}`,
    };

    const run = async () => {
      try {
        const data = await dynamo.send(new QueryCommand(queryParams));
        return data;
      } catch (err) {
        console.error(err);
      }
    };
    return run();
  }
}

export interface AWSProvisioningProps extends ProvisioningBaseProps {
  readonly tableName: string;
  readonly region: string;
  test: {
    shtsht: string;
    shts: number;
  };
}

export class AWSProvision extends ProvisioningBase {
  readonly tableName: string;
  readonly region: string;
  readonly accountId: any;
  constructor(props: AWSProvisioningProps) {
    super(props);

    this.tableName = process.env.AWS_TABLE;
    this.region = props.region;

    const userInfo = this.query_user_info();

    this.accountId = userInfo.then((res) => {
      let account = res["Items"][0]["AWSAccountId"].S;
    });
  }
}
