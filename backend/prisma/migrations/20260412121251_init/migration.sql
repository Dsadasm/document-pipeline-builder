/*
  Warnings:

  - You are about to drop the column `type` on the `Node` table. All the data in the column will be lost.
  - Added the required column `nodeTypeId` to the `Node` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Node" DROP COLUMN "type",
ADD COLUMN     "nodeTypeId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "NodeType";

-- CreateTable
CREATE TABLE "NodeType" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "inputDataType" VARCHAR(50) NOT NULL,
    "outputDataType" VARCHAR(50) NOT NULL,
    "allowedCycleTarget" VARCHAR(100),

    CONSTRAINT "NodeType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NodeType_type_key" ON "NodeType"("type");

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_nodeTypeId_fkey" FOREIGN KEY ("nodeTypeId") REFERENCES "NodeType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
