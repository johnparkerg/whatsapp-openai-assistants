# Whatsapp - Open AI Assistants Connector

This project serves to bridge the gap between Whatsapp Cloud API and OpenAI's Assistants

## Prerequisites

### Setting up Facebook App

To get started, create a Facebook App and configure it using the instructions provided in this guide: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/

Note that you can optionally skip step 4 and use this project directly.

The Webhook Callback URL for Facebook is base_url/api/messages

Make sure you create a permanent token so that your app doesn't stop working randomly, more about this here: https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#1--acquire-an-access-token-using-a-system-user-or-facebook-login

Copy the token to WHATSAPP_TOKEN in your env file

### Signing up for Upstash

To use this project, you'll need to sign up for an account in Upstash at https://upstash.com.

We will use Qstash for Polling Assistant Runs and Redis for saving user thread ids.

### OpenAI

Create an OpenAI account and create an assistant in the playground, then copy the assistant ID (starts with asst_) to your env variables.

### Getting Started

First make sure to copy the .env.sample to .env.local and add OpenAI, Upstash and Facebook tokens.

The FB_VERIFY can be any token you define just as long as it matches the one you use setting up your webhook in FB.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
