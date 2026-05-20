"use client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { data: session } = useSession();
  useEffect(() => {
    if (session?.user?.role === 'superadmin') {
      router.push("/super-admin/dashboard");
    } else {
      router.push("/dashboard");
    }
  }, [session, router]);
}
