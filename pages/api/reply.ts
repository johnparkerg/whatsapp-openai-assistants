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
                await axios({
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
                return res.status(200).end()
            }
            else if (run.status === "requires_action") {
                //run.required_action.submit_tool_outputs.tool_calls is an array of objects, we will iterate through it and call the functions
                //Call process.env.FUNCTIONS_URL + function.function.name and send the function.function.arguments as the body
                const tool_calls = run.required_action!.submit_tool_outputs.tool_calls;
                const tool_outputs: { tool_call_id: string; output: any; }[] = [];
                for (let i = 0; i < tool_calls.length; i++) {
                    const tool_call = tool_calls[i]
                    const function_name = tool_call.function.name
                    const function_arguments = JSON.parse(tool_call.function.arguments)
                    function_arguments["user_id"] = to
                    await axios({
                        method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                        url: process.env.FUNCTIONS_URL + function_name,
                        data: function_arguments,
                        headers: {
                            "Content-Type": "application/json",
                        },
                    }).then((response) => {
                        tool_outputs.push({
                            tool_call_id: tool_call.id,
                            output: JSON.stringify(response.data),
                        })
                    }).catch((error) => {
                        console.log("error", error);
                    });
                }
                try {
                    const run_x = await openai.beta.threads.runs.submitToolOutputs(
                        run.thread_id,
                        run.id,
                        {
                            tool_outputs: tool_outputs,
                        }
                    );
                }
                catch (e) {
                    console.log(e)
                }
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
                        await axios({
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
                        }).catch((error) => {
                            console.log("error", error);
                        });

                    }
                }
                res.json({ success: true });
                return res.status(200).end()
            }
            else {
                return res.status(200).end()
            }
        }
        default: {
            res.setHeader('Allow', ['GET', 'POST'])
            res.status(405).end(`Method ${method} Not Allowed`)
            return res.status(200).end()
        }
    }
}