import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    name: string;
    accessToken: string;
  }

  interface Session {
    accessToken: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    name?: string;
    accessToken?: string;
  }
}
