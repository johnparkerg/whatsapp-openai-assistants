import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

console.log("MESSAGES Using storage: " + process.env.STORAGE);

const MessageSchema = z.object({
    message_id: z.number().int().nonnegative().optional(),
    user_id: z.number().int().nonnegative(),
    sender_phone: z.string().length(15),
    receiver_phone: z.string().length(15),
    message_text: z.string(),
    raw_message: z.string(),
    created_on: z.date().optional()
});

type Message = z.infer<typeof MessageSchema>;

const saveMessage = async (message: Message) => {
    // Save message to database using Prisma
    const prisma = new PrismaClient();
    let clean_sender_phone = message.sender_phone;
    if (message.sender_phone && message.sender_phone.startsWith("521")) {
        clean_sender_phone = message.sender_phone.replace(/^521/, "52");
    }
    let clean_receiver_phone = message.receiver_phone;
    if (message.receiver_phone && message.receiver_phone.startsWith("521")) {
        clean_receiver_phone = message.receiver_phone.replace(/^521/, "52");
    }
    await prisma.messages.create({
        data: {
            message_id: message.message_id,
            user_id: message.user_id,
            sender_phone: clean_sender_phone,
            receiver_phone: clean_receiver_phone,
            message_text: message.message_text,
            raw_message: message.raw_message,
            created_on: message.created_on
        }
    });
}

const messagesService = {
    saveMessage
}

export default messagesService;