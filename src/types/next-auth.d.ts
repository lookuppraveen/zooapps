import type { RoleKey } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: RoleKey;
      roleName: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: RoleKey;
    roleName?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: RoleKey;
    roleName?: string;
  }
}
