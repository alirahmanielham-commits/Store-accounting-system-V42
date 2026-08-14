export function startAppProcessing(msg: string) {
  window.dispatchEvent(new CustomEvent('app:start-processing', { detail: { msg } }));
}

export function updateAppProcessing(msg: string) {
  window.dispatchEvent(new CustomEvent('app:update-processing', { detail: { msg } }));
}

export function stopAppProcessing() {
  window.dispatchEvent(new CustomEvent('app:stop-processing'));
}

export async function withSteppedAnimation(
  actionName: string,
  actionFn: () => Promise<any>
) {
  startAppProcessing(`شروع ${actionName}...`);
  await new Promise(r => setTimeout(r, 400));
  
  try {
    updateAppProcessing("اعتبارسنجی اطلاعات...");
    await new Promise(r => setTimeout(r, 400));
    
    updateAppProcessing("ثبت در پایگاه داده...");
    const result = await actionFn();
    
    updateAppProcessing("بروزرسانی کش سیستم...");
    await new Promise(r => setTimeout(r, 300));
    
    updateAppProcessing("عملیات با موفقیت انجام شد");
    await new Promise(r => setTimeout(r, 300));
    
    return result;
  } finally {
    stopAppProcessing();
  }
}
