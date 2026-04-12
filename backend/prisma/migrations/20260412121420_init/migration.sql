/*
  Warnings:

  - The primary key for the `NodeType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `NodeType` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `NodeType` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `NodeType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `NodeType` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_nodeTypeId_fkey";

-- DropIndex
DROP INDEX "NodeType_type_key";

-- AlterTable
ALTER TABLE "NodeType" DROP CONSTRAINT "NodeType_pkey",
DROP COLUMN "id",
DROP COLUMN "type",
ADD COLUMN     "name" VARCHAR(100) NOT NULL,
ADD CONSTRAINT "NodeType_pkey" PRIMARY KEY ("name");

-- CreateIndex
CREATE UNIQUE INDEX "NodeType_name_key" ON "NodeType"("name");

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_nodeTypeId_fkey" FOREIGN KEY ("nodeTypeId") REFERENCES "NodeType"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
