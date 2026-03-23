"use client";

import { useState, useEffect } from "react";

interface Friend { id: string; name: string; email: string; handicapIndex: number }

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadFriends() {
    const res = await fetch("/api/friends");
    const data = await res.json();
    setFriends(data.friends ?? []);
  }

  useEffect(() => { loadFriends(); }, []);

  async function addFriend(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`Added successfully!`);
      setEmail("");
      loadFriends();
    } else {
      setError(data.error ?? "Failed to add friend");
    }
    setAdding(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-fairway-900">Friends</h1>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-fairway-50">
        <h2 className="font-semibold text-fairway-800 mb-3">Add a friend</h2>
        <form onSubmit={addFriend} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@email.com"
            required
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fairway-500"
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-fairway-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-fairway-800 disabled:opacity-60"
          >
            {adding ? "…" : "Add"}
          </button>
        </form>
        {message && <p className="text-fairway-700 text-sm mt-2">{message}</p>}
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-fairway-800">Your group ({friends.length})</h2>
        {friends.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">
            <p className="text-3xl mb-2">👥</p>
            <p>No friends yet — add someone to play together</p>
          </div>
        ) : (
          friends.map((friend) => (
            <div key={friend.id} className="bg-white rounded-xl p-4 shadow-sm border border-fairway-50 flex items-center justify-between">
              <div>
                <p className="font-semibold text-fairway-900">{friend.name}</p>
                <p className="text-xs text-gray-400">{friend.email}</p>
              </div>
              <div className="text-right">
                <p className="text-fairway-700 font-bold">{friend.handicapIndex.toFixed(1)}</p>
                <p className="text-xs text-gray-400">Hcap</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
