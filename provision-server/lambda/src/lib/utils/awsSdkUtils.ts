import {
  DynamoDB
} from "@aws-sdk/client-dynamodb";
import { Credentials } from "@aws-sdk/types";
import { STSClient } from "@aws-sdk/client-sts";
import { EC2Client } from "@aws-sdk/client-ec2";

export interface GenericOptions {
    region: string
    credentials?: Credentials
    endpoint?: string
}

export function createSTSClient(): STSClient {
    const sts = new STSClient({region: process.env.AWS_REGION})
    return sts
}

export function createEC2Client(credentials: Credentials = null): EC2Client {
    var options: GenericOptions = {
        region: process.env.AWS_REGION
    }
    if (credentials) {
        options.credentials = credentials
    }
    const ec2 = new EC2Client(options)
    return ec2
}

export function createDynamoClient(): DynamoDB {
    const region = process.env.AWS_REGION

    const options: GenericOptions = {
        region: region
    }
    if(process.env.AWS_SAM_LOCAL) {
        options.endpoint = 'http://dynamodb:8000'
    }
    const dynamo = new DynamoDB(options)
    return dynamo
}