import type { NextApiRequest, NextApiResponse } from 'next'
import axios from "axios";
import OpenAI from 'openai';
import messagesService from '../../utils/messages'
import usersService from '../../utils/users'

// Assert that required environment variables are provided
if (!process.env.OPENAI_API_KEY || !process.env.UPSTASH_TOKEN || !process.env.ASSISTANT_ID || !process.env.BASE_URL) {
  throw new Error('Required environment variables are missing');
}
console.log("Required environment variables are present");

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});
console.log("OpenAI API Key is present");

// Other constants
const assistant_id = process.env.ASSISTANT_ID!;
const base_url = process.env.BASE_URL!;
const upstash_token = process.env.UPSTASH_TOKEN!;
console.log("Upstash token is present");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("Received request");
  const verify_token = process.env.FB_VERIFY_TOKEN;
  const { method, query, body } = req;

  let mode = query["hub.mode"];
  let token = query["hub.verify_token"];
  let challenge = query["hub.challenge"];
  console.log("mode", mode);

  switch (method) {
    case 'GET': {
      console.log("Received GET request");
      if (mode && token) {
        // Check the mode and token sent are correct
        if (mode === "subscribe" && token === verify_token) {
          // Respond with 200 OK and challenge token from the request
          console.log("WEBHOOK_VERIFIED");
          res.status(200).send(challenge);
          return res.end();
        } else {
          // Responds with '403 Forbidden' if verify tokens do not match
          return res.status(403).end()
        }
      }
    }
    case 'POST': {
      if (body.object) {
        // TODO Define SChema with Zod and validate by parsing the body
        if (
          body.entry &&
          body.entry[0].changes &&
          body.entry[0].changes[0] &&
          body.entry[0].changes[0].value.messages &&
          body.entry[0].changes[0].value.messages[0]
        ) {
          console.log("Received message");
          const phone_number_id =
            body.entry[0].changes[0].value.metadata.phone_number_id;
          const from = body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
          const to = body.entry[0].changes[0].value.metadata.display_phone_number;
          const msg_body = body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload
          const name = body.entry[0].changes[0].value.contacts[0].profile.name;
          //const user: any = await ;
          let user = await usersService.getUserByPhoneNumber(from);
          let thread_id;
          // Create a new thread if user is not found
          if (user) {
            thread_id = user.thread_id;
          }
          if (!user || user === null) {
            const thread = await openai.beta.threads.create();
            user = {
              username: name,
              phone_number: from,
              thread_id: thread.id,
            }
            user = await usersService.saveUser(user);
            thread_id = thread.id;
          }
          if (!thread_id) {
            return res.status(500).end()
          }

          await messagesService.saveMessage({
            user_id: user.user_id || 0,
            sender_phone: from,
            receiver_phone: to,
            message_text: body.entry[0].changes[0].value.messages[0].text.body,
            raw_message: JSON.stringify(body),
          });

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
          await axios({
            method: "POST",
            url:
              "https://qstash.upstash.io/v2/publish/" +
              base_url + "/api/reply",
            data: {
              phone_number_id,
              to: from,
              from: to,
              run,
              user_id: user.user_id
            },
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + upstash_token,
              "Upstash-Delay": "2s",
            },
          }).catch((error) => {
            console.log("error", error);
            return res.status(500).json({ success: false });
          });
          res.json({ success: true });
          return res.status(200).end()
        }
        else {
          return res.status(200).end();
        }
      } else {
        return res.status(404).end();
      }
    }
    default: {
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).end(`Method ${method} Not Allowed`)
    }
  }
}