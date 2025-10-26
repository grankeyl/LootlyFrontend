import { ref } from 'vue'

type ToastType = 'success' | 'error'

interface Toast {
  id: number
  message: string
  type: ToastType
}

export const toasts = ref<Toast[]>([])

let idCounter = 0

export function showToast(message: string, type: ToastType = 'success', duration = 3000) {
  const id = ++idCounter
  const toast: Toast = { id, message, type }
  
  toasts.value.push(toast)

  setTimeout(() => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index !== -1) toasts.value.splice(index, 1)
  }, duration)
}