import type { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai';
import axios from "axios";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const base_url = process.env.BASE_URL;
const upstash_token = process.env.UPSTASH_TOKEN;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {

    const wa_token = process.env.WHATSAPP_TOKEN;

    const { method, query, body } = req;

    switch (method) {
        case 'POST': {
            console.log(JSON.stringify(body, null, 2))
            const phone_number_id = body.phone_number_id
            const to = body.to
            const run = await openai.beta.threads.runs.retrieve(
                body.run.thread_id,
                body.run.id
            );
            console.log(run);
            if (run.status === "queued" || run.status === "in_progress") {
                axios({
                    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                    url:
                        "https://qstash.upstash.io/v2/publish/" +
                        base_url + "/api/reply",
                    data: {
                        phone_number_id,
                        to: to,
                        run,
                    },
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + upstash_token,
                        "Upstash-Delay": "1s",
                    },
                }).catch((error) => {
                    console.log("error", error);
                });
            }
            else if (run.status === "completed") {
                const messages = await openai.beta.threads.messages.list(
                    run.thread_id
                );
                const run_assistant_messages = messages.data.filter(
                    (message) => message.role === "assistant" && message.run_id === run.id
                );
                console.log(run_assistant_messages)
                for (let i = 0; i < run_assistant_messages.length; i++) {
                    const message = run_assistant_messages[i]
                    console.log(JSON.stringify(message, null, 2))
                    const content = message.content[0];
                    // Filter content from message to avoid MessageContentImageFile
                    if (content.type === "text") {
                        axios({
                            method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                            url:
                                "https://graph.facebook.com/v17.0/" +
                                phone_number_id +
                                "/messages",
                            data: {
                                messaging_product: "whatsapp",
                                to: to,
                                text: { body: content.text.value },
                            },
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": "Bearer " + wa_token,
                            },
                        })
                            .then(() => {
                                res.json({ success: true });
                            })
                            .catch((error) => {
                                console.log("error", error);
                            });
                    }
                }
            }
            break;
        }
        default: {
            res.setHeader('Allow', ['GET', 'POST'])
            res.status(405).end(`Method ${method} Not Allowed`)
        }
    }
}