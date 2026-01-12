import { useState } from 'react'
import { useGallery, useUploadGalleryImage, useDeleteGalleryItem, useReorderGallery, GalleryItem } from '../hooks/useGallery'
import { Modal } from '../../../shared'
import GalleryUploadForm from '../components/GalleryUploadForm'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function Gallery() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [draggedItem, setDraggedItem] = useState<GalleryItem | null>(null)

  const { data, isLoading } = useGallery()
  const uploadMutation = useUploadGalleryImage()
  const deleteMutation = useDeleteGalleryItem()
  const reorderMutation = useReorderGallery()

  const items = data?.data || []

  const handleUpload = async ({ file, caption }: { file: File; caption?: string }) => {
    const formData = new FormData()
    formData.append('image', file)
    if (caption) {
      formData.append('caption', caption)
    }
    await uploadMutation.mutateAsync(formData)
    setIsUploadModalOpen(false)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const handleDragStart = (item: GalleryItem) => {
    setDraggedItem(item)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetItem: GalleryItem) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.id === targetItem.id) {
      return
    }

    // Reorder items
    const newItems = [...items]
    const draggedIndex = newItems.findIndex((item) => item.id === draggedItem.id)
    const targetIndex = newItems.findIndex((item) => item.id === targetItem.id)

    // Remove dragged item
    newItems.splice(draggedIndex, 1)
    // Insert at target position
    newItems.splice(targetIndex, 0, draggedItem)

    // Update sort_order
    const reorderData = newItems.map((item, index) => ({
      id: item.id,
      sortOrder: index + 1
    }))

    await reorderMutation.mutateAsync(reorderData)
    setDraggedItem(null)
  }

  const getImageUrl = (imageUrl: string) => {
    if (imageUrl.startsWith('http')) {
      return imageUrl
    }
    return `${API_URL}${imageUrl}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gallery Management</h1>
        <button className="btn btn-primary" onClick={() => setIsUploadModalOpen(true)}>
          + Upload Image
        </button>
      </div>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload New Image"
        size="md"
      >
        <GalleryUploadForm
          onSubmit={handleUpload}
          onCancel={() => setIsUploadModalOpen(false)}
          isLoading={uploadMutation.isPending}
        />
      </Modal>

      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-4">No images in gallery yet</p>
          <button className="btn btn-primary" onClick={() => setIsUploadModalOpen(true)}>
            Upload Your First Image
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(item)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, item)}
              className="card group relative cursor-move hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-100">
                <img
                  src={getImageUrl(item.image_url)}
                  alt={item.caption || 'Gallery image'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/400?text=Image+Not+Found'
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleteMutation.isPending}
                      className="btn btn-sm btn-danger"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              {item.caption && (
                <div className="p-4">
                  <p className="text-sm text-gray-700 line-clamp-2">{item.caption}</p>
                </div>
              )}
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                #{item.sort_order}
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
          <p className="font-medium mb-1">💡 Tip:</p>
          <p>Drag and drop images to reorder them. The order will be saved automatically.</p>
        </div>
      )}
    </div>
  )
}

