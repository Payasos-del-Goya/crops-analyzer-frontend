import LoginForm from "@/components/login-form";

export const metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <section className="flex items-center justify-center w-full h-[calc(100vh-5rem)] p-4">
      <LoginForm />
    </section>
  );
}
