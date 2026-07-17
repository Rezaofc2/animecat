"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();
  return (
    <button onClick={() => router.back()} className="p-2 -ml-2 text-slate-400 hover:text-white">
      <ArrowLeft size={18} />
    </button>
  );
}
