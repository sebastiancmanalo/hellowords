"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Copy, Check, Sun, Moon, ArrowLeft, Edit, Settings, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { generateEmbedding, searchSimilarEntries } from "@/lib/embeddings"
import { EncryptionService } from "@/lib/encryption"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import SettingsPage from "@/components/SettingsPage"

interface Entry {
  id: string
  content: string // Decrypted content for display
  encrypted_content?: string // Raw encrypted content from DB
  created_at: string
  location: string
  word_count: number
  embedding?: number[]
}

export default function Component() {
  const [content, setContent] = useState("")
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [currentView, setCurrentView] = useState<"editor" | "entries" | "settings">("editor")
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<{ entryId: string; x: number; y: number } | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [showTopBar, setShowTopBar] = useState(true)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [userEncryptionKey, setUserEncryptionKey] = useState<string>("")
  const pendingEntryRef = useRef<string | null>(null)
  const PENDING_ENTRY_KEY = 'pendingEntry'
  const DRAFT_KEY = 'hellowords_draft'
  const [pendingSave, setPendingSave] = useState(false)
  const [locationEnabled, setLocationEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('locationEnabled')
      return stored === 'true'
    }
    return false
  })
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Initialize auth and load data
  useEffect(() => {
    const initializeAuth = async () => {
      // Get initial session
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      if (session?.user) {
        const encryptionKey = EncryptionService.generateUserKey(session.user.id, session.user.email || "")
        setUserEncryptionKey(encryptionKey)
      }

      setIsLoading(false)

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        setUser(session?.user ?? null)

        if (session?.user) {
          const encryptionKey = EncryptionService.generateUserKey(session.user.id, session.user.email || "")
          setUserEncryptionKey(encryptionKey)
        } else {
          setEntries([])
          setUserEncryptionKey("")
        }
      })

      return () => subscription.unsubscribe()
    }

    initializeAuth()

    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }
    }
  }, [])

  // Load entries whenever userEncryptionKey changes and user is present
  useEffect(() => {
    if (user && userEncryptionKey) {
      loadEntries(userEncryptionKey)
    }
  }, [user, userEncryptionKey])

  // Handle mouse movement to show/hide top bar
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= 80) {
        setShowTopBar(true)
      } else if (e.clientY > 120) {
        setShowTopBar(false)
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    return () => document.removeEventListener("mousemove", handleMouseMove)
  }, [])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showUserMenu) setShowUserMenu(false)
      if (deleteConfirm) setDeleteConfirm(null)
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [showUserMenu, deleteConfirm])

  // Save pending entry from localStorage only when user and userEncryptionKey are both set, and not already saving
  useEffect(() => {
    if (
      user &&
      userEncryptionKey &&
      typeof window !== 'undefined' &&
      !pendingSave
    ) {
      const localPending = localStorage.getItem(PENDING_ENTRY_KEY)
      console.log('[PendingEntry] Effect triggered. user:', user?.id, 'userEncryptionKey:', !!userEncryptionKey, 'pendingSave:', pendingSave, 'localPending:', localPending)
      if (localPending) {
        setPendingSave(true)
        console.log('[PendingEntry] Attempting to save pending entry:', localPending)
        saveEntryAfterAuth(localPending)
          .then(() => {
            console.log('[PendingEntry] Successfully saved pending entry.')
            localStorage.removeItem(PENDING_ENTRY_KEY)
          })
          .catch((err) => {
            console.error('[PendingEntry] Failed to save pending entry after auth:', err)
          })
          .finally(() => {
            setPendingSave(false)
            console.log('[PendingEntry] Save attempt finished.')
          })
      }
    } else {
      console.log('[PendingEntry] Effect skipped. user:', user?.id, 'userEncryptionKey:', !!userEncryptionKey, 'pendingSave:', pendingSave)
    }
  }, [user, userEncryptionKey, pendingSave])

  // Load draft on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !selectedEntry) {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft && savedDraft.trim()) {
        setContent(savedDraft)
        console.log('[Draft] Loaded draft from localStorage:', savedDraft.length, 'characters')
      }
    }
  }, [selectedEntry])

  // Clear draft on page refresh
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if this is a page refresh by looking for recent unload timestamp
      const lastUnloadTime = sessionStorage.getItem('hellowords_last_unload')
      const currentTime = Date.now()
      
      if (lastUnloadTime) {
        const timeSinceUnload = currentTime - parseInt(lastUnloadTime)
        // If unload was very recent (within 1 second), it's likely a refresh
        if (timeSinceUnload < 1000) {
          localStorage.removeItem(DRAFT_KEY)
          console.log('[Draft] Cleared draft on page refresh (detected by timing)')
        }
      }

      // Set up beforeunload to record when we're about to unload
      const handleBeforeUnload = () => {
        sessionStorage.setItem('hellowords_last_unload', Date.now().toString())
      }

      window.addEventListener('beforeunload', handleBeforeUnload)
      return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Auto-grow textarea on content change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      
      // Only scroll to bottom if user is already near the bottom
      const isNearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 100;
      if (isNearBottom) {
        // Scroll to show one line below the current position
        const lineHeight = 24; // Approximate line height in pixels
        const targetScrollTop = document.body.scrollHeight - window.innerHeight + lineHeight;
        window.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      }
    }
  }, [content])

  const loadEntries = async (encryptionKey: string) => {
    if (!user || !encryptionKey) return

    const { data, error } = await supabase.from("entries").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("Error loading entries:", error)
      return
    }

    // Decrypt all entries
    const decryptedEntries = await Promise.all(
      (data || []).map(async (entry) => {
        try {
          const decryptedContent = await EncryptionService.decrypt(entry.encrypted_content, encryptionKey)
          return {
            ...entry,
            content: decryptedContent,
          }
        } catch (error) {
          console.error("Failed to decrypt entry:", error)
          return {
            ...entry,
            content: "[Decryption failed - content may be corrupted]",
          }
        }
      }),
    )

    setEntries(decryptedEntries)
  }

  const wordCount = content
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}`,
      },
    })

    if (error) {
      console.error("Error signing in:", error)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error signing out:", error)
    }
    setShowUserMenu(false)
    setUserEncryptionKey("")
  }

  const getLocation = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve("Location unavailable")
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
            )
            const data = await response.json()

            const city = data.city || data.locality || "Unknown"
            const region = data.principalSubdivisionCode
              ? data.principalSubdivisionCode.split("-")[1]
              : data.principalSubdivision || ""
            const country = data.countryCode || "Unknown"

            resolve(`${city}, ${region}, ${country}`)
          } catch (error) {
            resolve(`${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`)
          }
        },
        () => resolve("Location unavailable"),
        { timeout: 5000 },
      )
    })
  }

  const saveEntry = async () => {
    if (!content.trim()) return
    if (selectedEntry && content.trim() === selectedEntry.content.trim()) {
      setCurrentView('entries');
      return;
    }

    if (!user) {
      pendingEntryRef.current = content
      if (typeof window !== 'undefined') {
        localStorage.setItem(PENDING_ENTRY_KEY, content)
      }
      await signInWithGoogle()
      return
    }

    if (!userEncryptionKey) {
      console.error("No encryption key available")
      return
    }

    setIsSaving(true)

    try {
      // Only get location if the user has enabled location saving
      const location = locationEnabled ? await getLocation() : "No location saved"

      // Encrypt the content before sending to database
      const encryptedContent = await EncryptionService.encrypt(content.trim(), userEncryptionKey)

      // Generate embedding from original content (not encrypted)
      const embedding = await generateEmbedding(content.trim())

      // Create content hash for duplicate detection (optional)
      const contentHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content.trim()))
      const hashArray = Array.from(new Uint8Array(contentHash))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

      const entryData = {
        user_id: user.id,
        encrypted_content: encryptedContent,
        content_hash: hashHex,
        location,
        word_count: wordCount,
        embedding: embedding.length > 0 ? embedding : null,
      }

      // Always create a new entry (immutable)
      const result = await supabase.from("entries").insert(entryData).select()

      if (result.error) {
        console.error("Error saving entry:", result.error)
        return
      }

      // Reload entries and navigate
      await loadEntries(userEncryptionKey)
      setContent("")
      setSelectedEntry(null)
      setCurrentView("entries")
      
      // Clear draft from localStorage after successful save
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DRAFT_KEY)
        console.log('[Draft] Cleared draft after successful save')
      }
    } catch (error) {
      console.error("Error saving entry:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const deleteEntry = async (entryId: string) => {
    const { error } = await supabase.from("entries").delete().eq("id", entryId)

    if (error) {
      console.error("Error deleting entry:", error)
      return
    }

    await loadEntries(userEncryptionKey)

    if (entries.length <= 1) {
      setCurrentView("editor")
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user || !userEncryptionKey) return

    setIsSearching(true)
    try {
      const results = await searchSimilarEntries(searchQuery, user.id, userEncryptionKey)
      console.log("Search results:", results)
      // You could show results in a modal or filter the entries list
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const openEntry = (entry: Entry) => {
    setSelectedEntry(entry)
    setContent(entry.content) // This is already decrypted
    setCurrentView("editor")
  }

  const createNewEntry = () => {
    setSelectedEntry(null)
    setContent("")
    setCurrentView("editor")
    
    // Clear draft when starting a new entry
    if (typeof window !== 'undefined') {
      localStorage.removeItem(DRAFT_KEY)
      console.log('[Draft] Cleared draft when creating new entry')
    }
  }

  const handleRightClick = (entryId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setDeleteConfirm({
      entryId,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deleteEntry(deleteConfirm.entryId)
      setDeleteConfirm(null)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirm(null)
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    setIsTyping(true)
    setShowTopBar(false)

    // Save draft to localStorage (debounced)
    if (typeof window !== 'undefined' && !selectedEntry) {
      if (newContent.trim()) {
        localStorage.setItem(DRAFT_KEY, newContent)
      } else {
        localStorage.removeItem(DRAFT_KEY)
      }
    }

    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }

    const newTimeout = setTimeout(() => {
      setIsTyping(false)
      setShowTopBar(true)
    }, 2000)

    setTypingTimeout(newTimeout)
  }

  // Helper to save an entry after auth
  const saveEntryAfterAuth = async (entryContent: string) => {
    if (!user || !userEncryptionKey) {
      console.error('[PendingEntry] saveEntryAfterAuth called without user or userEncryptionKey')
      return
    }
    setIsSaving(true)
    try {
      // For entries created before auth, never save location (privacy)
      const location = "No location saved"
      const encryptedContent = await EncryptionService.encrypt(entryContent.trim(), userEncryptionKey)
      const embedding = await generateEmbedding(entryContent.trim())
      const contentHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(entryContent.trim()))
      const hashArray = Array.from(new Uint8Array(contentHash))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
      const entryData = {
        user_id: user.id,
        encrypted_content: encryptedContent,
        content_hash: hashHex,
        location,
        word_count: entryContent.trim().split(/\s+/).filter((word) => word.length > 0).length,
        embedding: embedding.length > 0 ? embedding : null,
      }
      let result
      if (selectedEntry) {
        result = await supabase
          .from("entries")
          .update({
            ...entryData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedEntry.id)
          .select()
      } else {
        result = await supabase.from("entries").insert(entryData).select()
      }
      if (result.error) {
        console.error('[PendingEntry] Error saving entry after auth:', result.error)
        return
      }
      console.log('[PendingEntry] Entry saved to Supabase:', result)
      await loadEntries(userEncryptionKey)
      setContent("")
      setSelectedEntry(null)
      setCurrentView("entries")
      
      // Clear draft from localStorage after successful save
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DRAFT_KEY)
        console.log('[Draft] Cleared draft after pending entry save')
      }
    } catch (error) {
      console.error('[PendingEntry] Error saving entry after auth:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleLocation = (enabled: boolean) => {
    setLocationEnabled(enabled)
    if (typeof window !== 'undefined') {
      localStorage.setItem('locationEnabled', String(enabled))
    }
  }

  const deleteAllEntries = async () => {
    if (!user || !userEncryptionKey) return

    const confirmed = window.confirm(
      "Are you sure you want to delete ALL your entries? This action cannot be undone."
    )
    
    if (!confirmed) return

    try {
      setIsLoading(true)
      
      // Delete all entries from the database
      const { error } = await supabase
        .from("entries")
        .delete()
        .eq("user_id", user.id)

      if (error) {
        console.error("Error deleting all entries:", error)
        alert("Failed to delete entries. Please try again.")
        return
      }

      // Clear local state
      setEntries([])
      setSelectedEntry(null)
      setContent("")
      
      alert("All entries have been deleted successfully.")
      
      // Navigate back to editor
      setCurrentView("editor")
    } catch (error) {
      console.error("Error deleting all entries:", error)
      alert("An error occurred while deleting entries. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const deleteAccount = async () => {
    if (!user) return

    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This will permanently delete all your data and cannot be undone."
    )
    
    if (!confirmed) return

    try {
      setIsLoading(true)
      
      // Delete all entries first
      const { error: entriesError } = await supabase
        .from("entries")
        .delete()
        .eq("user_id", user.id)

      if (entriesError) {
        console.error("Error deleting entries:", entriesError)
        alert("Failed to delete account data. Please try again.")
        return
      }

      // Delete the user account
      const { error: userError } = await supabase.auth.admin.deleteUser(user.id)
      
      if (userError) {
        console.error("Error deleting user:", userError)
        // If admin delete fails, try to delete user data manually
        // This is a fallback for when admin privileges aren't available
        alert("Account deletion initiated. You may need to contact support to complete the process.")
      }

      // Clear local state
      setEntries([])
      setSelectedEntry(null)
      setContent("")
      setUser(null)
      setUserEncryptionKey("")
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('locationEnabled')
        localStorage.removeItem(PENDING_ENTRY_KEY)
      }
      
      alert("Your account has been deleted successfully.")
      
      // Navigate back to editor (which will show login)
      setCurrentView("editor")
    } catch (error) {
      console.error("Error deleting account:", error)
      alert("An error occurred while deleting your account. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          isDarkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"
        }`}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (currentView === "entries") {
    return (
      <div
        className={`min-h-screen transition-colors duration-300 ${
          isDarkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"
        }`}
      >
        {/* Header Bar */}
        <div
          className={`fixed top-0 left-0 right-0 z-10 transition-colors duration-300 ${
            isDarkMode ? "bg-gray-900" : "bg-white"
          }`}
        >
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              {user && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowUserMenu(!showUserMenu)
                    }}
                    className={`transition-colors ${
                      isDarkMode
                        ? "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                    aria-label="User menu"
                  >
                    <User className="w-4 h-4" />
                  </Button>
                  {showUserMenu && (
                    <div
                      className={`absolute top-full left-0 mt-2 w-64 rounded-lg shadow-lg border z-50 ${
                        isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <User className="w-10 h-10 rounded-full" />
                          <div>
                            <div className={`font-medium ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}>
                              {user.user_metadata?.full_name || "User"}
                            </div>
                            <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleTheme}
                          className={`w-full justify-start gap-2 ${
                            isDarkMode
                              ? "text-gray-300 hover:text-gray-100 hover:bg-gray-700"
                              : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                          }`}
                        >
                          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                          {isDarkMode ? "Light mode" : "Dark mode"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowUserMenu(false)
                            setCurrentView("settings")
                          }}
                          className={`w-full justify-start gap-2 ${
                            isDarkMode
                              ? "text-gray-300 hover:text-gray-100 hover:bg-gray-700"
                              : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                          }`}
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={signOut}
                          className={`w-full justify-start gap-2 ${
                            isDarkMode
                              ? "text-gray-300 hover:text-gray-100 hover:bg-gray-700"
                              : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                          }`}
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={createNewEntry}
                className={`transition-colors ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Edit className="w-4 h-4" />
              </Button>
              {!user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className={`transition-colors ${
                    isDarkMode
                      ? "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>
        {/* Entries List */}
        <div className="pt-20 px-6">
          <div className="max-w-4xl mx-auto py-8">
            {entries.length === 0 ? (
              <div className="text-center py-16">
                <p className={`text-lg mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>No entries yet</p>
                <Button
                  onClick={() => setCurrentView("editor")}
                  className={`${
                    isDarkMode
                      ? "bg-gray-800 hover:bg-gray-700 text-gray-100"
                      : "bg-gray-900 hover:bg-gray-800 text-white"
                  }`}
                >
                  Create your first entry
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => openEntry(entry)}
                    onContextMenu={(e) => handleRightClick(entry.id, e)}
                    className={`cursor-pointer p-6 rounded-lg border transition-all hover:shadow-md ${
                      isDarkMode
                        ? "bg-gray-800 border-gray-700 hover:bg-gray-750"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {formatDate(entry.created_at)}
                      </div>
                      <div className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        {entry.word_count} words
                      </div>
                    </div>
                    {entry.location !== "No location saved" && (
                      <div className={`text-sm mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                        📍 {entry.location}
                      </div>
                    )}
                    <div className={`font-mono leading-relaxed ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                      {entry.content.length > 200 ? entry.content.substring(0, 200) + "..." : entry.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Delete Confirmation Popup */}
            {deleteConfirm && (
              <div
                className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-[200px]"
                style={{
                  left: Math.min(deleteConfirm.x, window.innerWidth - 220),
                  top: Math.min(deleteConfirm.y, window.innerHeight - 100),
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <p className={`text-sm mb-3 ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>Delete this entry?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={confirmDelete} className="text-xs">
                    Delete
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelDelete} className="text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (currentView === "settings") {
    return (
      <div
        className={`min-h-screen transition-colors duration-300 ${
          isDarkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"
        }`}
      >
        {/* Header Bar */}
        <div
          className={`fixed top-0 left-0 right-0 z-10 transition-colors duration-300 ${
            isDarkMode ? "bg-gray-900" : "bg-white"
          }`}
        >
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView("entries")}
                className={`transition-colors ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>
          </div>
        </div>
        
        {/* Settings Content */}
        <div className="pt-20">
          <SettingsPage
            locationEnabled={locationEnabled}
            onToggleLocation={handleToggleLocation}
            onDeleteAllEntries={deleteAllEntries}
            onDeleteAccount={deleteAccount}
            onSignOut={signOut}
            darkMode={isDarkMode}
            onToggleDarkMode={setIsDarkMode}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen h-full flex flex-col transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"
      }`}
    >
      {/* Header Bar - Fixed */}
      <div
        className={`fixed top-0 left-0 right-0 z-10 transition-all duration-300 ${
          isDarkMode ? "bg-gray-900" : "bg-white"
        } ${
          (currentView === "editor" && (isTyping || !showTopBar))
            ? "opacity-0 pointer-events-none"
            : "opacity-100"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            {entries.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={createNewEntry}
                className={`transition-colors ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {selectedEntry && (
              <div className={`flex items-center gap-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isDarkMode ? "bg-gray-300" : "bg-gray-600"}`}></div>
                  <div className={`w-1.5 h-1.5 rounded-full ${isDarkMode ? "bg-gray-400" : "bg-gray-500"}`}></div>
                  <div className={`w-1 h-1 rounded-full ${isDarkMode ? "bg-gray-500" : "bg-gray-400"}`}></div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{wordCount} words</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className={`transition-colors ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className={`transition-colors ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={saveEntry}
                disabled={isSaving || !content.trim()}
                className={`transition-colors ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-100 hover:bg-gray-800 disabled:text-gray-600"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:text-gray-400"
                }`}
              >
                <Check className={`w-4 h-4 ${isSaving ? "animate-pulse" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="pt-20 px-6 pb-8">
        <div className="max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder=""
            className={`w-full resize-none border-none outline-none font-mono text-lg leading-relaxed bg-transparent p-0 pb-8 m-0 transition-colors ${
              isDarkMode ? "text-gray-100" : "text-gray-800"
            }`}
            rows={1}
            style={{ overflow: 'hidden' }}
          />
        </div>
      </div>
    </div>
  )
}
