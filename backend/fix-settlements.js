const prisma = require('./src/lib/prisma.js');

async function main() {
  const result = await prisma.settlement.updateMany({
    where: { status: 'PENDING', proofUrl: null },
    data: { status: 'APPROVED' }
  });
  console.log('Fixed settlements:', result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
