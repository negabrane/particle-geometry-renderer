/**
 * WebGPU capability detection utilities
 */

export async function isWebGPUAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  
  if (!navigator.gpu) {
    return false;
  }
  
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

export async function getWebGPUAdapter(): Promise<GPUAdapter | null> {
  if (!navigator.gpu) return null;
  
  try {
    return await navigator.gpu.requestAdapter();
  } catch {
    return null;
  }
}

export async function getWebGPUDevice(): Promise<{ device: GPUDevice, adapter: GPUAdapter } | null> {
  const adapter = await getWebGPUAdapter();
  if (!adapter) return null;
  
  try {
    const device = await adapter.requestDevice();
    return { device, adapter };
  } catch {
    return null;
  }
}
