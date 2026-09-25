import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ password?: string }>;
}) {
  const { password } = await searchParams;
  return <LoginForm passwordUpdated={password === "updated"} />;
}
