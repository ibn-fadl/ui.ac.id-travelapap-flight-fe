import { reactive, readonly } from 'vue';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  visible: boolean;
}

const state = reactive<ToastState>({
  message: '',
  type: 'success',
  visible: false,
});

let hideTimer: number | undefined;

export function useToast() {
  const showToast = (message: string, type: ToastType = 'success', duration = 4000) => {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
    }
    state.message = message;
    state.type = type;
    state.visible = true;
    hideTimer = window.setTimeout(() => {
      state.visible = false;
    }, duration);
  };

  const hideToast = () => {
    if (hideTimer) {
      window.clearTimeout(hideTimer);
    }
    state.visible = false;
  };

  return {
    state: readonly(state),
    showToast,
    hideToast,
  };
}
