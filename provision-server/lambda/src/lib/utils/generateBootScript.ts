export async function formBootScript(dockerCommandInput: FormDockerCommandInput): Promise<string> {
    const dockerCommand = await formDockerCommand(dockerCommandInput)

    return `#!/bin/bash
    sudo apt-get update && sudo apt-get upgrade -y
    sudo apt-get install \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release -y
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo \
      "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install docker-ce docker-ce-cli containerd.io -y
    ${dockerCommand}`
}

export interface FormDockerCommandInput{
    game: string,
    interactionToken: string,
    applicationId: string,
    executionName: string,
    url: string,
    serverName: string,
    container: string
    extraEnv?: Map<string, string>
}

async function formDockerCommand(input: FormDockerCommandInput): Promise<string> {
    let command = `sudo docker run -t -d \
    --net=host \
    --name serverboi-${input.game.toLowerCase()} \
    -e INTERACTION_TOKEN=${input.interactionToken} \
    -e APPLICATION_ID=${input.applicationId} \
    -e EXECUTION_NAME=${input.executionName} \
    -e WORKFLOW_ENDPOINT=${input.url} \
    -e SERVER_NAME='${input.serverName}' `

    if (input.extraEnv) {

        input.extraEnv.forEach((value, key) => {
            key.replace("-", "_")
            command = `${command}-e ${key.toUpperCase}=${value}`
        })
    }

    command = `${command}${input.container}`

    return command
}