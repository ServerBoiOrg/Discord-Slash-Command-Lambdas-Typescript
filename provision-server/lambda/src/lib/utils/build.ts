import { readFileSync } from "fs";

export interface GameList {
    valheim: BuildInfo,
    csgo: BuildInfo,
    ns2: BuildInfo,
}

export interface BuildInfo {
    container: string
    ports: Array<number>
    instanceType: Map<string, string>
    driveSize?: number
}

export function getBuildInfo(game: string): BuildInfo {
    let rawBuildData = readFileSync('.build-info/build.json', 'utf8')
    let buildData: GameList = JSON.parse(rawBuildData)

    if (isObjKey(game, buildData)) {
        return buildData[game]
    }
}

function isObjKey<T>(key: any, obj: T): key is keyof T {
    return key in obj;
}