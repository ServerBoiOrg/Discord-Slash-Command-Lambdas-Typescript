#!/bin/bash

# Start local Dynamo
docker-compose up -d dynamo

# docker run -d -p 8083:8083 amazon/aws-stepfunctions-local --network lambda-local

# Start sam local api
AWS_REGION=us-west-2 sam local start-api --docker-network lambda-local

# Create need tables
aws dynamodb create-table \
    --table-name AWS-User-List \
    --attribute-definitions \
        AttributeName=UserID,AttributeType=S \
    --key-schema \
        AttributeName=UserID,KeyType=HASH \
    --provisioned-throughput \
            ReadCapacityUnits=10,WriteCapacityUnits=5 \
    --endpoint-url http://localhost:8000

# Create Test Entry
aws dynamodb put-item \
    --table-name AWS-User-List \
    --item \
        '{"UserID": {"S": "155875705417236480"}, "AWSAccountID": {"S": "742762521158"}}' \
    --endpoint-url http://localhost:8000


