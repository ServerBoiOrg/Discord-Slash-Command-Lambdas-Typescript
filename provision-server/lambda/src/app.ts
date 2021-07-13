import { PutItemCommandInput } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb";
import { AWSProvision, AWSProvisionServerResponse } from "./lib/provisioning/aws/awsProvisioning"; 
import { ProvisioningBase } from "./lib/provisioning/baseProvisioning";
import { createDynamoClient } from "./lib/utils/awsSdkUtils"

interface ProvisionServerEvent {
  service: string;
  username: string
  userId: string;
  name: string;
  game: string;
  interactionToken: string
  applicationId: string
  url: string
}

interface ProvisionServerResponse extends ProvisionServerEvent {
}

interface ServerItem {
  ServerID: string
  OwnerID: string
  Owner: string
  Game: string
  Name: string
  Service: string
  Port: number
  InstanceID?: string
  Region?: string
  AccountID?: string
}

export const lambdaHandler = async (
  event: ProvisionServerEvent
): Promise<ProvisioningBase> => {
  const service = event.service;

  const provisionObj = await serviceSwitchCase(service, event)

  const serverInfo = await provisionObj.provisionServer()

  const serverItem: ServerItem = {
    ServerID: provisionObj.serverId,
    OwnerID: event.userId,
    Owner: event.username,
    Game: event.game,
    Name: event.name,
    Port: serverInfo.port,
    Service: event.service
  }

  if (instanceOfAWSProvisionServerResponse(serverInfo)) {
    serverItem.InstanceID = serverInfo.instanceId
    serverItem.Region = serverInfo.region
    serverItem.AccountID = serverInfo.accountId
  }

  await writeServerInfo(serverItem)

  return provisionObj
};

const instanceOfAWSProvisionServerResponse = (object: any): object is AWSProvisionServerResponse => {
  return object
}

const writeServerInfo = async(serverItem: ServerItem) => {
  const dynamo = createDynamoClient()
  const documentClient = DynamoDBDocumentClient.from(dynamo)

  const params = {
    TableName: process.env.SERVER_TABLE,
    Item: serverItem
  }

  try {
    await documentClient.send(new PutCommand(params))
  } catch (error) {
    console.log(error)
    throw error
  }
}

const serviceSwitchCase = async(
  service: string,
  event: ProvisionServerEvent
): Promise<ProvisioningBase> => {
  switch (service) {
    case "aws":
      console.log(service);
      
      const queryInfo = await queryDynamo(event.userId)
      // Marshall this
      const accountId = queryInfo["AWSAccountID"].S

      const provisionObj = new AWSProvision({
        accountId: accountId,
        userId: event.userId,
        service: event.service,
        name: event.name,
        game: event.game,
        interactionToken: event.interactionToken,
        applicationId: event.applicationId,
        url: event.url,
        executionName: "ProvisionServer"
      })
      return provisionObj
    case "linode":
      console.log(service);
    case "vultr":
      console.log(service);
  }
}

const queryDynamo = async(userId: string) => {
  var params = {
    TableName: process.env.AWS_TABLE,
    KeyConditionExpression: `UserID = :userId`,
    ExpressionAttributeValues: {
        ':userId': { 'S': userId }
    },
  }; 
  const dynamo = createDynamoClient()
  try {
    const resp = await dynamo.query(params)
    return resp.Items[0]
  } catch (error) {
    console.log(error)
    throw error
  }
}