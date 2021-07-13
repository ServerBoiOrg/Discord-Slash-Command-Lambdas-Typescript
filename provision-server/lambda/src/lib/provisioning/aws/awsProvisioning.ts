import { ProvisioningBase, ProvisioningBaseProps, ProvisionServerResponse } from "../baseProvisioning";
import { createSTSClient, createEC2Client } from "../../utils/awsSdkUtils";
import { getBuildInfo } from "../../utils/build";
import { Credentials } from "@aws-sdk/types";
import { formBootScript } from "../../utils/generateBootScript";
import { AssumeRoleCommand} from "@aws-sdk/client-sts";
import { AuthorizeSecurityGroupEgressCommand, AuthorizeSecurityGroupEgressCommandInput, AuthorizeSecurityGroupIngressCommand, AuthorizeSecurityGroupIngressCommandInput, BlockDeviceMapping, CreateSecurityGroupCommand, CreateSecurityGroupCommandInput, DescribeImagesCommand, EC2Client, IpPermission, RunInstancesCommand, RunInstancesCommandInput, SecurityGroup } from "@aws-sdk/client-ec2";

export interface AWSProvisioningProps extends ProvisioningBaseProps {
    accountId: string
    instanceType?: string
}
  
export interface AWSUserListResponse {
    readonly AWSAccountID: string
    readonly UserID: string
}

export interface AWSProvisionServerResponse extends ProvisionServerResponse {
    readonly instanceId: string
    readonly region: string
    readonly accountId: string
}

export class AWSProvision extends ProvisioningBase {
    readonly tableName: string;
    readonly region: string;
    readonly accountId: string;
    readonly instanceType?: string

    constructor(props: AWSProvisioningProps) {
        super(props);
        this.tableName = process.env.AWS_TABLE;
        this.region = process.env.AWS_REGION;
        this.accountId = props.accountId

        if (props.instanceType) {
            this.instanceType = props.instanceType
        }
    }

    assumeRole = async(): Promise<Credentials> => {
        const params = {
            RoleArn: `arn:aws:iam::${this.accountId}:role/ServerBoi-Resource.Assumed-Role`,
            RoleSessionName: "ServerBoiValidateAWSAccount"
        }
        const command = new AssumeRoleCommand(params)

        const sts = createSTSClient()

        try {
            const data = await sts.send(command);
            return {
                accessKeyId: data.Credentials.AccessKeyId,
                secretAccessKey: data.Credentials.SecretAccessKey
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    createSecurityGroup = async(ec2: EC2Client, ports: Array<number>): Promise<string> => {
        const setEgress = async(securityGroupId: string) => {
            let IpPermissions = new Array<IpPermission>()

            ports.forEach((port) => {
                let tcpPermission: IpPermission = {
                    IpProtocol: "tcp",
                    FromPort: port,
                    ToPort: port,
                    IpRanges: [{"CidrIp": "0.0.0.0/0"}]
                }
                let udpPermission: IpPermission = {
                    IpProtocol: "udp",
                    FromPort: port,
                    ToPort: port,
                    IpRanges: [{"CidrIp": "0.0.0.0/0"}]
                }
                IpPermissions.push(tcpPermission)
                IpPermissions.push(udpPermission)
            })

            const params: AuthorizeSecurityGroupEgressCommandInput = {
                GroupId: securityGroupId,
                IpPermissions: IpPermissions
            }
            const command = new AuthorizeSecurityGroupEgressCommand(params)

            try {
                await ec2.send(command)
            } catch (error) {
                console.log(error)
                throw error
            }
        }

        const setIngress = async(securityGroupId: string) => {
            const IpPermissions = [
                {
                    IpProtocol: "tcp",
                    FromPort: 22,
                    ToPort: 22,
                    IpRanges: [{"CidrIp": "0.0.0.0/0"}]
                },
                {
                    IpProtocol: "tcp",
                    FromPort: 80,
                    ToPort: 80,
                    IpRanges: [{"CidrIp": "0.0.0.0/0"}]
                },
                {
                    IpProtocol: "tcp",
                    FromPort: 443,
                    ToPort: 443,
                    IpRanges: [{"CidrIp": "0.0.0.0/0"}]
                },
            ]

            const params: AuthorizeSecurityGroupIngressCommandInput = {
                GroupId: securityGroupId,
                IpPermissions: IpPermissions
            }
            const command = new AuthorizeSecurityGroupIngressCommand(params)
            try {
                await ec2.send(command)
            } catch (error) {
                console.log(error)
                throw error
            }
        }

        const securityGroupName = `ServerBoi-Security-Group-${this.game.toUpperCase()}`

        try {
            let params: CreateSecurityGroupCommandInput = {
                GroupName: securityGroupName,
                Description: `Security Group for ${this.game.toUpperCase()}`
            }
    
            let command = new CreateSecurityGroupCommand(params)
    
            const securityGroupResult = await ec2.send(command)
            
            const securityGroupId = securityGroupResult.GroupId
    
            const egress = setEgress(securityGroupId)
            const ingress = setIngress(securityGroupId)
    
            Promise.all([egress, ingress])
        } catch (error) {
            console.log(error)
        }

        return securityGroupName
        
    }

    getImageId = async(ec2: EC2Client): Promise<string> =>{
        const params = {
            Filters: [
                {"Name": "description", "Values": ["Debian 10 (20210329-591)"]},
                {"Name": "architecture", "Values": ["x86_64"]},
                {"Name": "virtualization-type", "Values": ["hvm"]}
            ],
            Owners: [
                "136693071363"
            ]
        }
        const command = new DescribeImagesCommand(params)
        try {
            const images = await ec2.send(command)
            return images.Images[0].ImageId
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    getInstanceType = async(instanceTypes: Map<string,string>): Promise<string> => {
        if (this.instanceType) {
            return this.instanceType
        } else {
            if (instanceTypes.has("aws")) {
                return instanceTypes.get("aws")
            } else {
                return "c5.large"
            }
        }
    }

    getEbsMapping = async(driveSize: number): Promise<BlockDeviceMapping> => {
        const ebsMapping = {
            DeviceName: "/dev/xvda",
            VirtualName: "ephemeral",
            Ebs: {
                DeleteOnTermination: true,
                VolumeSize: driveSize,
                VolumeType: "standard",
            },
        }

        return ebsMapping
    }

    provisionServer = async(): Promise<AWSProvisionServerResponse> => {
        const creds = await this.assumeRole()
        const ec2 = createEC2Client(creds)
        const buildInfo = getBuildInfo(this.game)

        let bootScriptResult = formBootScript({
            game: this.game,
            interactionToken: this.interactionToken,
            applicationId: this.applicationId,
            executionName: this.executionName,
            url: process.env.ENDPOINT,
            serverName: this.name,
            container: buildInfo.container
        })

        const securityGroupIdResult = this.createSecurityGroup(ec2, buildInfo.ports)
        const imageIdResult = this.getImageId(ec2)
        const ebsMappingResult = this.getEbsMapping(buildInfo.driveSize)
        const instanceTypeResult = this.getInstanceType(buildInfo.instanceType)

        const [
            bootScript,
            securityGroupId,
            imageId,
            ebsMapping,
            instanceType
        ] = await Promise.all([
            bootScriptResult,
            securityGroupIdResult,
            imageIdResult,
            ebsMappingResult,
            instanceTypeResult
        ])

        const instanceCreationParams: RunInstancesCommandInput = {
            MaxCount: 1,
            MinCount: 1,
            UserData: bootScript,
            SecurityGroupIds: [securityGroupId],
            ImageId: imageId,
            BlockDeviceMappings: [ebsMapping],
            InstanceType: instanceType
        }

        const command = new RunInstancesCommand(instanceCreationParams)

        try {
            const provisionResponse = await ec2.send(command)
            return {
                instanceId: provisionResponse.Instances[0].InstanceId,
                port: buildInfo.ports[0],
                region: this.region,
                accountId: this.accountId
            }
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}