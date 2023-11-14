import type { NextApiRequest, NextApiResponse } from 'next'
import axios from "axios";
import OpenAI from 'openai';
import { Redis } from '@upstash/redis'

// Assert that required environment variables are provided
if (!process.env.OPENAI_API_KEY || !process.env.UPSTASH_TOKEN || !process.env.REDIS_URL || !process.env.REDIS_TOKEN || !process.env.ASSISTANT_ID || !process.env.BASE_URL) {
  throw new Error('Required environment variables are missing');
}

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Redis configuration
const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
})

// Other constants
const assistant_id = process.env.ASSISTANT_ID!;
const base_url = process.env.BASE_URL!;
const upstash_token = process.env.UPSTASH_TOKEN!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const verify_token = process.env.FB_VERIFY_TOKEN;
  const { method, query, body } = req;

  let mode = query["hub.mode"];
  let token = query["hub.verify_token"];
  let challenge = query["hub.challenge"];

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
      else {
        const thread = await openai.beta.threads.create();
        console.log(thread);
      }
    }
    case 'POST': {
      if (body.object) {
        if (
          body.entry &&
          body.entry[0].changes &&
          body.entry[0].changes[0] &&
          body.entry[0].changes[0].value.messages &&
          body.entry[0].changes[0].value.messages[0]
        ) {
          console.log(JSON.stringify(body, null, 2));
          const phone_number_id =
            body.entry[0].changes[0].value.metadata.phone_number_id;
          const user: any = await redis.get(phone_number_id);
          let thread_id = "";
          // Create a new thread if user is not found
          if (!user || !user.thread_id) {
            const thread = await openai.beta.threads.create();
            await redis.set(phone_number_id, { thread_id: thread.id });
            thread_id = thread.id;
          }
          else {
            thread_id = user.thread_id;
          }

          const from = body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
          const msg_body = body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload
          const name = body.entry[0].changes[0].value.contacts[0].profile.name;

          await openai.beta.threads.messages.create(
            thread_id,
            {
              role: "user",
              content: msg_body
            }
          );
          const run = await openai.beta.threads.runs.create(
            thread_id,
            {
              assistant_id: assistant_id
            }
          );
          console.log(run);
          axios({
            method: "POST",
            url:
              "https://qstash.upstash.io/v2/publish/" +
              base_url + "/api/reply",
            data: {
              phone_number_id,
              to: from.replace(/^521/, "52"),
              run,
            },
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + upstash_token,
              "Upstash-Delay": "2s",
            },
          }).then(() => {
            res.json({ success: true });
          }).catch((error) => {
            console.log("error", error);
            res.status(500).json({ success: false });
          });
        }
      } else {
        res.status(404);
      }
    }
    default: {
      res.setHeader('Allow', ['GET', 'POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
    }
  }
}