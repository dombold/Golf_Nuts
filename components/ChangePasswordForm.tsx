"use client";

import { useActionState, useState } from "react";
import { changePassword } from "@/app/actions/auth";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PasswordInput({ name, label, autoComplete }: { name: string; label: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          required
          autoComplete={autoComplete}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 focus-visible:outline-none"
          aria-label={show ? "Hide password" : "Show password"}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordForm({ fromReset = false }: { fromReset?: boolean }) {
  const [open, setOpen] = useState(fromReset);
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <div className="space-y-4">
      {!fromReset && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">Update your account password.</p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-sm font-medium text-fairway-700 hover:text-fairway-800 hover:underline focus-visible:outline-none"
          >
            {open ? "Cancel" : "Change Password"}
          </button>
        </div>
      )}

      {(open || fromReset) && (
        <>
          {state?.success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {state.message}
            </div>
          )}
          {state?.message && !state.success && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {state.message}
            </div>
          )}

          <form action={action} className="space-y-4">
            {!fromReset && (
              <>
                <PasswordInput name="currentPassword" label="Current password" autoComplete="current-password" />
                {state?.errors?.currentPassword && (
                  <p className="text-red-600 text-xs -mt-3">{state.errors.currentPassword[0]}</p>
                )}
              </>
            )}

            <PasswordInput name="newPassword" label="New password" autoComplete="new-password" />
            {state?.errors?.newPassword && (
              <p className="text-red-600 text-xs -mt-3">{state.errors.newPassword[0]}</p>
            )}

            <PasswordInput name="confirmPassword" label="Confirm new password" autoComplete="new-password" />
            {state?.errors?.confirmPassword && (
              <p className="text-red-600 text-xs -mt-3">{state.errors.confirmPassword[0]}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full py-2.5 bg-fairway-700 hover:bg-fairway-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
            >
              {pending ? "Saving…" : "Update Password"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
