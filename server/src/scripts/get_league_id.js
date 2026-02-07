
import { PrismaClient } from '@prisma/client';

const DATABASE_URL = "postgresql://neondb_owner:npg_JoyZW29bGNEv@ep-shiny-haze-afcdvtmf-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: DATABASE_URL
        }
    }
});

async function main() {
    const league = await prisma.league.findFirst();
    console.log('LEAGUE_ID:', league ? league.id : 'null');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
