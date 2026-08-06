/*
  Warnings:

  - A unique constraint covering the columns `[companyId,filename]` on the table `documents` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "documents_companyId_filename_key" ON "documents"("companyId", "filename");
