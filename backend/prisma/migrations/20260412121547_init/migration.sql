/*
  Warnings:

  - You are about to drop the column `nodeTypeId` on the `Node` table. All the data in the column will be lost.
  - Added the required column `type` to the `Node` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_nodeTypeId_fkey";

-- AlterTable
ALTER TABLE "Node" DROP COLUMN "nodeTypeId",
ADD COLUMN     "type" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_type_fkey" FOREIGN KEY ("type") REFERENCES "NodeType"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
