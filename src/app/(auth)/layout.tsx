import { SyntheticDataBanner } from "@/components/shell/SyntheticDataBanner";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SyntheticDataBanner />
      <div className="flex flex-1 items-center justify-center p-6">{children}</div>
    </div>
  );
}
