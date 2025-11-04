import { useToast } from 'vue-toast-notification';
const toast = useToast();

export function showSuccessToast(msg: string) {
  toast.success(msg, { duration: 1950, position: 'top-right' });
}

export function showErrorToast(msg: string) {
  toast.error(msg, { duration: 1950, position: 'top-right' });
}