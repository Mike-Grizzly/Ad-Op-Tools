'use client'

import { signOut } from './actions'

export default function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="w-full rounded px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        Sign out
      </button>
    </form>
  )
}
