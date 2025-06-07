import { generateRandomAlphanumeric } from "@/lib/util";
import { NextApiRequest, NextApiResponse } from "next";

import {
  AccessTokenOptions,
  VideoGrant,
  AccessToken,
  RoomServiceClient,
} from "livekit-server-sdk";
import { TokenResult } from "../../lib/types";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL!.replace(
  "wss://",
  "https://"
);

const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);

const createToken = (userInfo: AccessTokenOptions, grant: VideoGrant) => {
  const at = new AccessToken(apiKey, apiSecret, userInfo);
  at.addGrant(grant);
  return at.toJwt();
};

export default async function handleToken(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (!apiKey || !apiSecret) {
      res.statusMessage = "Environment variables aren't set up correctly";
      res.status(500).end();
      return;
    }

    const roomName = `groq-toq-${generateRandomAlphanumeric(
      4
    )}-${generateRandomAlphanumeric(4)}`;

    const identity = `user-${generateRandomAlphanumeric(4)}`;

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
    };

    const userInfo: AccessTokenOptions = {
      identity,
    };
    
    // Build metadata object
    const metadata: { [key: string]: string } = {};
    
    const ciApiKey = req.query.ci_api_key;
    if (ciApiKey !== undefined) {
      metadata.ci_api_key = ciApiKey as string;
    }
    
    const groqApiKey = req.query.groq_api_key;
    if (groqApiKey !== undefined) {
      metadata.groq_api_key = groqApiKey as string;
    }
    
    // Only set metadata if we have any
    if (Object.keys(metadata).length > 0) {
      userInfo.metadata = JSON.stringify(metadata);
    }
    
    const token = await createToken(userInfo, grant);

    const result: TokenResult = {
      identity,
      accessToken: token,
    };

    res.status(200).json(result);
  } catch (e) {
    res.statusMessage = (e as Error).message;
    res.status(500).end();
  }
}
