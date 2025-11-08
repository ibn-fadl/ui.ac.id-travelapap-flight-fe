import { ref, readonly } from 'vue';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

const isVisible = ref(false);
const options = ref<ConfirmDialogOptions>({
  title: '',
  message: '',
  confirmText: 'OK',
  cancelText: 'Cancel',
  isDestructive: false,
});

let resolvePromise: (value: boolean) => void;

export function useConfirmDialog() {
  const show = (opts: ConfirmDialogOptions): Promise<boolean> => {
    options.value = {
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText || 'OK',
      cancelText: opts.cancelText, // Will be undefined if not provided
      isDestructive: opts.isDestructive || false,
    };
    isVisible.value = true;
    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve;
    });
  };

  const onConfirm = () => {
    isVisible.value = false;
    if (resolvePromise) {
      resolvePromise(true);
    }
  };

  const onCancel = () => {
    isVisible.value = false;
    if (resolvePromise) {
      resolvePromise(false);
    }
  };

  return {
    show,
    onConfirm,
    onCancel,
    isVisible: readonly(isVisible),
    options: readonly(options),
  };
}
