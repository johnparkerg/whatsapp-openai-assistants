import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { Redis } from '@upstash/redis'
import { aw } from '@upstash/redis/zmscore-b6b93f14';

// Assert that required environment variables are provided
if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) {
    throw new Error('Required environment variables are missing');
}

const storage = process.env.STORAGE || "redis";

// Redis configuration
const redis = new Redis({
    url: process.env.REDIS_URL!,
    token: process.env.REDIS_TOKEN!,
})

const UserSchema = z.object({
    user_id: z.number().int().nonnegative().optional(),
    username: z.string().max(50).nullish(),
    phone_number: z.string().length(15),
    thread_id: z.string().nullish(),
});

export type User = z.infer<typeof UserSchema>;

const saveUser = async (user: User): Promise<User> => {
    let returned_user = user;
    if (storage === "redis") {
        await redis.set(user.phone_number, { thread_id: user.thread_id, name: user.username });
    }
    else if (storage === "database") {
        // Save message to database using Prisma
        const prisma = new PrismaClient();
        let new_user = await prisma.users.create({
            data: {
                username: user.username,
                phone_number: user.phone_number,
                thread_id: user.thread_id
            }
        });
        returned_user = new_user;
    }
    return returned_user;
}

const getUserByPhoneNumber = async (phone_number: string): Promise<User | null> => {
    let user: User | null = null;
    if (storage === "redis") {
        const redis_user: any = await redis.get(phone_number);
        if (redis_user) {
            user = {
                phone_number: phone_number,
                username: redis_user.name,
                thread_id: redis_user.thread_id
            }
        }
    }
    else if (storage === "database") {
        const prisma = new PrismaClient();
        // Where phone_number = phone_number OR phone_number = phone_number.replace(/^521/, "52")
        const db_user = await prisma.users.findFirst({
            where: {
                OR: [
                    {
                        phone_number: phone_number
                    },
                    {
                        phone_number: phone_number.replace(/^521/, "52")
                    }
                ]
            }
        });
        if (db_user) {
            user = db_user
        }
    }
    return user;
}

const usersService = {
    saveUser,
    getUserByPhoneNumber
}

export default usersService;