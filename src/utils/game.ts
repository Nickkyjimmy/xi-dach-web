import { prisma } from "@/lib/prisma";

export async function generateUniquePin(): Promise<string> {
    const chars = '0123456789';
    const pinLength = 6;
    let pin: string = '';
    let isUnique = false;

    while (!isUnique) {
        pin = '';
        for (let i = 0; i < pinLength; i++) {
            pin += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        // Check if pin exists in active games
        const existingGame = await prisma.game.findUnique({
            where: {
                pin: pin,
            },
        });

        if (!existingGame) {
            isUnique = true;
        }
    }

    return pin;
}
