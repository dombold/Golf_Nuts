"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/auth";

type ProfileFormProps = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  handicapIndex: number;
  memberSince: string;
};

export default function ProfileForm({
  username,
  firstName,
  lastName,
  email,
  handicapIndex,
  memberSince,
}: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  return (
    <div className="space-y-6">
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

      {/* Read-only info */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Member Since</p>
          <p className="text-sm text-gray-800 mt-0.5">{memberSince}</p>
        </div>
      </div>

      {/* Editable form */}
      <form action={action} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            defaultValue={email}
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500"
          />
          {state?.errors?.email && (
            <p className="text-red-600 text-xs mt-1">{state.errors.email[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            name="username"
            type="text"
            required
            defaultValue={username}
            autoComplete="username"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500"
          />
          {state?.errors?.username && (
            <p className="text-red-600 text-xs mt-1">{state.errors.username[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              name="firstName"
              type="text"
              required
              defaultValue={firstName}
              autoComplete="given-name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500"
            />
            {state?.errors?.firstName && (
              <p className="text-red-600 text-xs mt-1">{state.errors.firstName[0]}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              name="lastName"
              type="text"
              required
              defaultValue={lastName}
              autoComplete="family-name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500"
            />
            {state?.errors?.lastName && (
              <p className="text-red-600 text-xs mt-1">{state.errors.lastName[0]}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Handicap Index
          </label>
          <input
            name="handicapIndex"
            type="number"
            min="0"
            max="54"
            step="0.1"
            required
            defaultValue={handicapIndex}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fairway-500"
          />
          {state?.errors?.handicapIndex && (
            <p className="text-red-600 text-xs mt-1">{state.errors.handicapIndex[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 bg-fairway-700 hover:bg-fairway-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
