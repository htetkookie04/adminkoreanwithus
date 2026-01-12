import { useEffect, useState } from 'react'
import { api } from '../../../shared/lib/api'
import { useRoles } from '../../users/hooks/useRoles'
import { useAuthStore } from '../../auth/store/authStore'
import { toast } from '../../../shared/components/ui/Toast'
import { Eye, EyeOff, Lock, KeyRound } from 'lucide-react'

export default function Settings() {
  const { user } = useAuthStore()
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { data: rolesData, isLoading: rolesLoading } = useRoles()
  const roles = rolesData?.data || []

  useEffect(() => {
    fetchSettings()
    fetchUserInfo()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings')
      setSettings(response.data.data)
      // Populate admin settings from saved settings or user info
      setAdminName(response.data.data['admin.name'] || user?.firstName + ' ' + user?.lastName || '')
      setAdminEmail(response.data.data['admin.contact_email'] || user?.email || '')
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserInfo = async () => {
    if (user?.id) {
      try {
        const response = await api.get(`/users/${user.id}`)
        const userData = response.data.data
        // If admin settings are empty, populate from user info
        if (!settings['admin.name']) {
          setAdminName(`${userData.first_name || ''} ${userData.last_name || ''}`.trim() || '')
        }
        if (!settings['admin.contact_email']) {
          setAdminEmail(userData.email || '')
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error)
      }
    }
  }

  const updateSetting = async (key: string, value: any) => {
    try {
      await api.put(`/settings/${key}`, { value })
      setSettings((prev) => ({ ...prev, [key]: value }))
    } catch (error) {
      console.error('Failed to update setting:', error)
      throw error
    }
  }

  const handleSaveAdminSettings = async () => {
    setSaving(true)
    try {
      await updateSetting('admin.name', adminName)
      await updateSetting('admin.contact_email', adminEmail)
      setEditing(false)
      toast.success('Admin settings saved successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save admin settings')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (!currentPassword) {
      toast.error('Current password is required')
      return
    }

    setChangingPassword(true)
    try {
      await api.post(`/users/${user?.id}/change-password`, {
        currentPassword,
        newPassword
      })
      toast.success('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const isAdmin = user?.roleName === 'admin' || user?.roleName === 'super_admin'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-gray-900">Settings</h1>

      <div className="space-y-6">
        {/* Admin Settings - Only visible to admins */}
        {isAdmin && (
          <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Admin Settings</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="btn btn-secondary text-sm"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false)
                    // Reset to saved values
                    setAdminName(settings['admin.name'] || user?.firstName + ' ' + user?.lastName || '')
                    setAdminEmail(settings['admin.contact_email'] || user?.email || '')
                  }}
                  className="btn btn-secondary text-sm"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAdminSettings}
                  className="btn btn-primary text-sm"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Name
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Useful if there's a need to identify the site admin in settings.
              </p>
              <input
                type="text"
                className="input"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Enter admin name"
                disabled={!editing}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Admin Contact Email
              </label>
              <p className="text-xs text-gray-500 mb-2">
                For direct communication with the website's admin team.
              </p>
              <input
                type="email"
                className="input"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={!editing}
              />
            </div>
          </div>
        </div>
        )}

        {/* Change Password - Visible to all authenticated users */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-600">Update your account password</p>
            </div>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-5">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  className="input pl-11 pr-11"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600 focus:outline-none transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                New Password <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">Must be at least 6 characters long</p>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="input pl-11 pr-11"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600 focus:outline-none transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="input pl-11 pr-11"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600 focus:outline-none transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="btn btn-primary flex items-center gap-2"
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Changing Password...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Change Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* User Permissions - Only visible to admins */}
        {isAdmin && (
          <div className="card">
          <h2 className="text-xl font-semibold mb-4">User Permissions</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Roles
              </label>
              <p className="text-xs text-gray-500 mb-3">
                If you have different roles, adding a section for role management might be useful.
              </p>
              {rolesLoading ? (
                <div className="text-sm text-gray-500">Loading roles...</div>
              ) : roles.length > 0 ? (
                <div className="space-y-2">
                  {roles.map((role: any) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div>
                        <div className="font-medium text-gray-900 capitalize">
                          {role.name.replace('_', ' ')}
                        </div>
                        {role.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {role.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No roles found</div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

