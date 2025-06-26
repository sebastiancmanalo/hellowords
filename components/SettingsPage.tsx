import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Info, AlertTriangle, Trash2, UserX } from "lucide-react"

const ENCRYPTION_EXPLAINER = `All your journal entries are encrypted in your browser before being sent to our servers. We use strong AES-GCM encryption with a key derived from your user ID and email. Only you can decrypt your data. Even if our database is compromised, your entries remain private and unreadable to anyone else.`

export default function SettingsPage({
  onDeleteAllEntries,
  onDeleteAccount,
  locationEnabled,
  onToggleLocation,
  onSignOut,
  darkMode,
  onToggleDarkMode,
}: {
  onDeleteAllEntries?: () => void
  onDeleteAccount?: () => void
  locationEnabled: boolean
  onToggleLocation: (enabled: boolean) => void
  onSignOut?: () => void
  darkMode?: boolean
  onToggleDarkMode?: (enabled: boolean) => void
}) {
  const [showLocationInfo, setShowLocationInfo] = useState(false)

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Switch
            checked={locationEnabled}
            onCheckedChange={onToggleLocation}
            id="location-toggle"
          />
          <label htmlFor="location-toggle" className="font-medium cursor-pointer">
            Save location with new entries
          </label>
          <span
            onMouseEnter={() => setShowLocationInfo(true)}
            onMouseLeave={() => setShowLocationInfo(false)}
            className="relative cursor-pointer"
          >
            <Info className="w-4 h-4 text-gray-400" />
            {showLocationInfo && (
              <span className="absolute left-6 top-0 bg-gray-800 text-white text-xs rounded px-2 py-1 z-10 w-64 shadow-lg">
                Your location is only saved if you opt in. Location helps you remember where you wrote each entry, but is never shared or sold.
              </span>
            )}
          </span>
        </div>
        <p className="text-xs text-gray-500">Default: location is <span className="font-semibold">not</span> saved.</p>
      </div>

      <div className="mb-8">
        <h2 className="font-semibold mb-2">Encryption & Privacy</h2>
        <div className={`text-sm text-gray-600 whitespace-pre-line border rounded p-3 ${
          darkMode ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-gray-50 border-gray-200"
        }`}>
          {ENCRYPTION_EXPLAINER}
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <h2 className="font-semibold text-orange-600">Danger Zone</h2>
        </div>
        
        <div className="space-y-3">
          <Button 
            variant="destructive" 
            onClick={onDeleteAllEntries} 
            className="w-full justify-start gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete all entries
          </Button>
          <Button 
            variant="destructive" 
            onClick={onDeleteAccount} 
            className="w-full justify-start gap-2"
          >
            <UserX className="w-4 h-4" />
            Delete account & all data
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          These actions cannot be undone. All data will be permanently deleted.
        </p>
      </div>

      {onToggleDarkMode && (
        <div className="mb-8">
          <h2 className="font-semibold mb-2">Appearance</h2>
          <div className="flex items-center gap-2">
            <Switch checked={darkMode} onCheckedChange={onToggleDarkMode} id="darkmode-toggle" />
            <label htmlFor="darkmode-toggle" className="font-medium cursor-pointer">
              Dark mode
            </label>
          </div>
        </div>
      )}

      {onSignOut && (
        <div className="mb-8">
          <h2 className="font-semibold mb-2">Account</h2>
          <Button variant="outline" onClick={onSignOut} className="w-full">
            Sign out
          </Button>
        </div>
      )}
    </div>
  )
} 