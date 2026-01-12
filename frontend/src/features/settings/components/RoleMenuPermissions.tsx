import { useState, useEffect } from 'react'
import { api } from '../../../shared/lib/api'
import { toast } from '../../../shared/components/ui/Toast'
import { Shield, Check, X, Save } from 'lucide-react'

interface Role {
  id: number
  name: string
  description: string
}

interface MenuItem {
  menuKey: string
  menuLabel: string
  menuPath: string
  menuIcon: string
}

interface RoleMenuPermission {
  id?: number
  menuKey: string
  menuLabel: string
  menuPath: string
  menuIcon: string
  sortOrder: number
  enabled: boolean
}

export default function RoleMenuPermissions() {
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [availableMenus, setAvailableMenus] = useState<MenuItem[]>([])
  const [selectedMenus, setSelectedMenus] = useState<RoleMenuPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingPermissions, setLoadingPermissions] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRoles()
    fetchAvailableMenus()
  }, [])

  useEffect(() => {
    if (selectedRoleId) {
      fetchRoleMenuPermissions(selectedRoleId)
    }
  }, [selectedRoleId])

  const fetchRoles = async () => {
    try {
      const response = await api.get('/roles')
      setRoles(response.data.data)
      if (response.data.data.length > 0) {
        setSelectedRoleId(response.data.data[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
      toast.error('Failed to fetch roles')
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableMenus = async () => {
    try {
      const response = await api.get('/menu-permissions/available-menus')
      setAvailableMenus(response.data.data)
    } catch (error) {
      console.error('Failed to fetch available menus:', error)
      toast.error('Failed to fetch available menus')
    }
  }

  const fetchRoleMenuPermissions = async (roleId: number) => {
    setLoadingPermissions(true)
    try {
      const response = await api.get(`/menu-permissions/role/${roleId}`)
      const permissions = response.data.data
      
      // Update selected menus with fetched permissions
      // If no permissions exist for this role, start with empty array
      setSelectedMenus(Array.isArray(permissions) ? permissions : [])
      
      console.log(`Loaded ${permissions?.length || 0} menu permissions for role ${roleId}`, permissions)
    } catch (error) {
      console.error('Failed to fetch role menu permissions:', error)
      toast.error('Failed to fetch menu permissions')
      // Reset to empty if fetch fails
      setSelectedMenus([])
    } finally {
      setLoadingPermissions(false)
    }
  }

  const toggleMenu = (menuKey: string) => {
    const existingIndex = selectedMenus.findIndex(m => m.menuKey === menuKey)
    
    if (existingIndex !== -1) {
      // Remove menu
      setSelectedMenus(selectedMenus.filter(m => m.menuKey !== menuKey))
    } else {
      // Add menu
      const availableMenu = availableMenus.find(m => m.menuKey === menuKey)
      if (availableMenu) {
        setSelectedMenus([
          ...selectedMenus,
          {
            menuKey: availableMenu.menuKey,
            menuLabel: availableMenu.menuLabel,
            menuPath: availableMenu.menuPath,
            menuIcon: availableMenu.menuIcon,
            sortOrder: selectedMenus.length,
            enabled: true
          }
        ])
      }
    }
  }

  const isMenuSelected = (menuKey: string): boolean => {
    const isSelected = selectedMenus.some(m => m.menuKey === menuKey)
    // Debug log to help troubleshoot
    // console.log(`Menu ${menuKey} is ${isSelected ? 'SELECTED' : 'NOT SELECTED'}`)
    return isSelected
  }

  const handleSave = async () => {
    if (!selectedRoleId) return

    setSaving(true)
    try {
      await api.put(`/menu-permissions/role/${selectedRoleId}`, {
        menuPermissions: selectedMenus
      })
      toast.success('Menu permissions updated successfully')
      
      // Refresh the role's permissions
      await fetchRoleMenuPermissions(selectedRoleId)
      
      // Dispatch event to notify other components (like Layout) to refresh
      window.dispatchEvent(new CustomEvent('permissions-updated'))
      
      console.log('✅ Permissions saved and refresh event dispatched')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update menu permissions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Role Menu Permissions</h2>
          <p className="text-sm text-gray-600">
            Control which menus each role can access in the sidebar
          </p>
        </div>
      </div>

      {/* Role Selector */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Select Role
        </label>
        <div className="relative">
          <select
            className="input"
            value={selectedRoleId || ''}
            onChange={(e) => setSelectedRoleId(parseInt(e.target.value))}
            disabled={loadingPermissions}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
          {loadingPermissions && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Checkboxes */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Available Menus
        </label>
        <p className="text-xs text-gray-500 mb-4">
          Select the menus that users with this role should be able to see
        </p>
        
        {loadingPermissions ? (
          <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg border-2 border-gray-200">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Loading role permissions...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {availableMenus.map((menu) => {
              const isSelected = isMenuSelected(menu.menuKey)
              return (
                <label
                  key={menu.menuKey}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'border-pink-500 bg-pink-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleMenu(menu.menuKey)}
                    />
                    <div>
                      <div className={`font-medium ${isSelected ? 'text-pink-900' : 'text-gray-900'}`}>
                        {menu.menuLabel}
                      </div>
                      <div className={`text-sm ${isSelected ? 'text-pink-600' : 'text-gray-500'}`}>
                        {menu.menuPath}
                      </div>
                    </div>
                  </div>
                  {isSelected ? (
                    <Check className="w-5 h-5 text-pink-600" />
                  ) : (
                    <X className="w-5 h-5 text-gray-300" />
                  )}
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected Menus Preview */}
      {!loadingPermissions && selectedMenus.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border-2 border-pink-200">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-pink-600" />
            <h3 className="text-sm font-semibold text-gray-900">
              Selected Menus ({selectedMenus.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedMenus.map((menu) => (
              <span
                key={menu.menuKey}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-pink-300 text-pink-700 rounded-lg text-sm font-medium shadow-sm"
              >
                <Check className="w-3 h-3" />
                {menu.menuLabel}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {!loadingPermissions && selectedMenus.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
          <div className="flex items-center gap-2">
            <X className="w-5 h-5 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-800">
              No menus selected. This role will not have access to any menu items.
            </p>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !selectedRoleId}
          className="btn btn-primary flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Permissions
            </>
          )}
        </button>
      </div>
    </div>
  )
}

