import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";

export class Company {
  async registerCompany(
    slug: string,
    name: string,
    email: string,
    password: string,
  ) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const company = await prisma.company.create({
        data: { slug, name, email, password: hashedPassword },
      });
      return company;
    } catch (err) {
      console.log(err);
    }
  }

  async existingCompany(email: string) {
    try {
      const company = await prisma.company.findUnique({
        where: {
          email: email,
        },
      });
      return company;
    } catch (err) {
      console.log(err);
    }
  }

  async existingSlug(slug: string) {
    try {
      const company = await prisma.company.findUnique({
        where: {
          slug: slug,
        },
      });
      return company;
    } catch (err) {
      console.log(err);
    }
  }
}
