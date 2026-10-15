"use client";

import { useEffect } from "react";

import { Alert } from "@/components/common/Alert";
import { Button, ButtonLink } from "@/components/common/Button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] unhandled error", error.digest, error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg p-6">
      <Alert tone="error" role="alert">
        เกิดข้อผิดพลาดในการทำงาน กรุณาลองใหม่อีกครั้ง
        {error.digest ? <span className="ml-2 text-xs">(รหัสอ้างอิง: {error.digest})</span> : null}
      </Alert>
      <div className="mt-4 flex gap-2">
        <Button type="button" onClick={reset}>
          ลองใหม่
        </Button>
        <ButtonLink href="/" variant="secondary">
          กลับหน้าภาพรวม
        </ButtonLink>
      </div>
    </div>
  );
}
