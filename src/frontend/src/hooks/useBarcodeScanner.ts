import { useCallback, useEffect, useRef, useState } from "react";
import { useCamera } from "../camera/useCamera";

declare global {
  interface Window {
    ZXing: any;
  }
}

export interface BarcodeScanResult {
  data: string;
  format: string;
  timestamp: number;
}

const ZXING_CDN =
  "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";

export const useBarcodeScanner = () => {
  const camera = useCamera({ facingMode: "environment" });
  const [result, setResult] = useState<BarcodeScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [zxingLoaded, setZxingLoaded] = useState(false);
  const readerRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (window.ZXing) {
      setZxingLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = ZXING_CDN;
    script.onload = () => {
      if (isMountedRef.current) setZxingLoaded(true);
    };
    script.onerror = () => console.error("Failed to load ZXing library");
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  const startScanning = useCallback(async (): Promise<boolean> => {
    if (!zxingLoaded) return false;
    if (!camera.isActive) {
      const ok = await camera.startCamera();
      if (!ok) return false;
    }
    setIsScanning(true);
    setResult(null);
    return true;
  }, [zxingLoaded, camera]);

  const stopScanning = useCallback(async () => {
    setIsScanning(false);
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {
        /* ignore */
      }
      readerRef.current = null;
    }
    await camera.stopCamera();
  }, [camera]);

  // Start ZXing decode loop when scanning + camera active + zxing loaded
  useEffect(() => {
    if (!isScanning || !camera.isActive || !zxingLoaded || !window.ZXing)
      return;
    if (!camera.videoRef.current) return;

    const video = camera.videoRef.current;

    try {
      const ZXing = window.ZXing;
      const hints = new Map();
      const formats = [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.CODE_93,
        ZXing.BarcodeFormat.QR_CODE,
        ZXing.BarcodeFormat.DATA_MATRIX,
        ZXing.BarcodeFormat.ITF,
        ZXing.BarcodeFormat.AZTEC,
        ZXing.BarcodeFormat.PDF_417,
      ];
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

      const reader = new ZXing.BrowserMultiFormatReader(hints, 200);
      readerRef.current = reader;

      reader.decodeFromVideoElement(video, (res: any, _err: unknown) => {
        if (res && isMountedRef.current) {
          setResult({
            data: res.getText(),
            format: res.getBarcodeFormat().toString(),
            timestamp: Date.now(),
          });
          stopScanning();
        }
      });
    } catch (e) {
      console.error("ZXing init error", e);
    }

    return () => {
      if (readerRef.current) {
        try {
          readerRef.current.reset();
        } catch {
          /* ignore */
        }
        readerRef.current = null;
      }
    };
  }, [isScanning, camera.isActive, zxingLoaded, stopScanning, camera.videoRef]);

  return {
    result,
    isScanning,
    isReady: zxingLoaded && camera.isSupported !== false,
    isLoading: camera.isLoading,
    isSupported: camera.isSupported,
    error: camera.error,
    videoRef: camera.videoRef,
    canvasRef: camera.canvasRef,
    startScanning,
    stopScanning,
    clearResult: () => setResult(null),
    retry: camera.retry,
  };
};
