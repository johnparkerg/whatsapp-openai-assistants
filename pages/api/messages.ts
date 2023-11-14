// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, query } = req;
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  const verify_token = process.env.FB_VERIFY_TOKEN;
  switch (method) {
    case 'GET': {
      if (mode && token) {
        // Check the mode and token sent are correct
        if (mode === "subscribe" && token === verify_token) {
          // Respond with 200 OK and challenge token from the request
          console.log("WEBHOOK_VERIFIED");
          return res.status(200).send(challenge);
        } else {
          // Responds with '403 Forbidden' if verify tokens do not match
          return res.status(403);
        }
      }
    }
    case 'POST': {
      //return handlePost(req, res);
      return res.status(200)
    }
    default: {
      return res.setHeader('Allow', ['GET', 'POST']).status(405).end(`Method ${method} Not Allowed`)
    }
  }
}