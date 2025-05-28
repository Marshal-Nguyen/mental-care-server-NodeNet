import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.testQuestions.findMany({
    select: {
      content: true,
    },
    orderBy: {
      order: "asc", // nếu muốn theo thứ tự câu hỏi
    },
  });

  console.log(questions.map((q) => q.content));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
