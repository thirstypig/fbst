// Update period dates in database
import { prisma } from '../db/prisma';

// 2025 period date ranges
const PERIOD_DATES_2025 = [
  { periodNumber: 1, startDate: '2025-03-27', endDate: '2025-04-20' }, // Opening day to April 20
  { periodNumber: 2, startDate: '2025-04-21', endDate: '2025-05-18' },
  { periodNumber: 3, startDate: '2025-05-19', endDate: '2025-06-08' },
  { periodNumber: 4, startDate: '2025-06-09', endDate: '2025-07-06' },
  { periodNumber: 5, startDate: '2025-07-07', endDate: '2025-08-03' },
  { periodNumber: 6, startDate: '2025-08-04', endDate: '2025-09-28' }, // End of regular season
];

async function updatePeriodDates() {
  console.log('\n📅 Updating 2025 period dates...\n');

  const season = await prisma.historicalSeason.findFirst({
    where: { year: 2025 },
  });

  if (!season) {
    console.error('❌ 2025 season not found');
    return;
  }

  for (const pd of PERIOD_DATES_2025) {
    const result = await prisma.historicalPeriod.updateMany({
      where: {
        seasonId: season.id,
        periodNumber: pd.periodNumber,
      },
      data: {
        startDate: new Date(pd.startDate),
        endDate: new Date(pd.endDate),
      },
    });
    console.log(`✅ Period ${pd.periodNumber}: ${pd.startDate} to ${pd.endDate} (${result.count} updated)`);
  }

  console.log('\n✅ All period dates updated!\n');
}

async function main() {
  try {
    await updatePeriodDates();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
