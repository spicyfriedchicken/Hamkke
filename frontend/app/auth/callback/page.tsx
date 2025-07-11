// ✅ app/auth/callback/page.tsx
import { Suspense } from "react";
import CallbackHandler from "@/components/auth/CallbackHandler";

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="text-white">Completing sign-in...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}