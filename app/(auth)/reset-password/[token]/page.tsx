"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useParams } from "next/navigation";
import { verifyAndSignIn } from "@/app/actions/auth";
import Link from "next/link";

export default function ConfirmResetPage() {
  const { token } = useParams<{ token: string }>();
  const [state, action] = useActionState(verifyAndSignIn, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.requestSubmit();
  }, []);

  if (state?.message) {
    return (
      <div className="text-center space-y-3">
        <p className="text-red-600 font-medium">{state.message}</p>
        <Link
          href="/reset-password"
          className="text-fairway-700 text-sm hover:underline"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-gray-500 text-sm">Verifying your reset link…</p>
      <form ref={formRef} action={action}>
        <input type="hidden" name="token" value={token} />
      </form>
    </div>
  );
}
