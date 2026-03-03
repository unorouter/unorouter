import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { ReactNode } from "react";

export default function AuthLayout(props: { children: ReactNode }) {
  return (
    <div className="from-background via-muted to-background flex min-h-dvh flex-col items-center justify-center bg-linear-to-br px-4 py-12">
      <div className="mb-8 flex items-center gap-2 animate-slide-up">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.webp"
            alt="UnoRouter"
            width={36}
            height={36}
            className="rounded-full"
          />
          <span className="text-foreground text-xl font-bold tracking-tight font-mono">
            UNO<span className="text-muted-foreground">ROUTER</span>
          </span>
        </Link>
      </div>

      {props.children}

      <p className="text-muted-foreground mt-8 text-center text-xs animate-fade-in">
        <Link href="/terms" className="hover:text-foreground transition-colors">
          Terms of Service
        </Link>
        {" · "}
        <Link href="/privacy" className="hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
