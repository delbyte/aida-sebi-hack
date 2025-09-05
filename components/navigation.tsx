"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { auth } from "@/lib/firebase"
import { signOut, User } from "firebase/auth"
import { useAuthState } from "react-firebase-hooks/auth"
import {
  Home,
  MessageSquare,
  Settings,
  CreditCard,
  LogOut,
  User as UserIcon,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Navigation() {
  const pathname = usePathname()
  const [user, loading] = useAuthState(auth)
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      setIsDropdownOpen(false)
    } catch (error) {
      // Handle sign out error silently
    }
  }

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.dropdown-container')) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const getUserInitials = (user: User | null | undefined) => {
    if (!user) return "U"
    if (user.displayName) {
      return user.displayName.split(" ").map(n => n[0]).join("").toUpperCase()
    }
    if (user.email) {
      return user.email[0].toUpperCase()
    }
    return "U"
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/dashboard" className="text-xl font-bold">
                A.I.D.A.
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="relative dropdown-container">
              <button
                onClick={toggleDropdown}
                className="relative h-8 w-8 rounded-full p-0 hover:bg-gray-100 transition-colors"
                disabled={loading}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || ""} />
                  <AvatarFallback className="bg-gray-200 text-black">
                    {loading ? "U" : getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <div className="p-3 border-b border-gray-200">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-black">
                        {user?.displayName || "User"}
                      </p>
                      <p className="text-xs leading-none text-gray-600">
                        {user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 py-1">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-3 py-2 text-sm text-black hover:bg-gray-100 transition-colors text-left"
                    >
                      <LogOut className="mr-2 h-4 w-4 text-black" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
