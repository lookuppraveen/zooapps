import { AppShell } from "@/components/shell/AppShell";
import { TRPCReactProvider } from "@/lib/trpc/provider";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TRPCReactProvider>
      <AppShell>{children}</AppShell>
    </TRPCReactProvider>
  );
}
