import { createVNode, type AppContext, render } from "vue";
import BaseToast from "./components/BaseToast.vue";

export function showToast(props: { iconColor: string, iconSrText: string, text: string }, appContext: AppContext | undefined, duration: number) {
  if (!appContext) return;
  const toastContainer = document.getElementById("toast-container");
  const toastRenderEl = toastContainer?.appendChild(document.createElement("div"));
  if (toastRenderEl) {
    
    const vnode = createVNode(BaseToast, { ...props, isHidden: true, closeEarly() {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      render(null, toastRenderEl);
      toastRenderEl.remove();
    } });
    vnode.appContext = { ...appContext };
    render(vnode, toastRenderEl);
    const t1 = setTimeout(() => {
      if (vnode.component) vnode.component.props.isHidden = false
    }, 0);
    const t2 = setTimeout(() => {
      if (vnode.component) vnode.component.props.isHidden = true; 
    }, duration + 150);
    const t3 = setTimeout(() => {
      render(null, toastRenderEl);
      toastRenderEl.remove();
    }, duration + 300);
  }
}

export function showSuccessToast(text: string, appContext: AppContext | undefined, duration: number) {
  showToast({ iconColor: "green", iconSrText: "Success", text }, appContext, duration);
}

export function showErrorToast(text: string, appContext: AppContext | undefined, duration: number) {
  showToast({ iconColor: "red", iconSrText: "Error", text }, appContext, duration);
}

export function showWarningToast(text: string, appContext: AppContext | undefined, duration: number) {
  showToast({ iconColor: "yellow", iconSrText: "Warning", text }, appContext, duration);
}
