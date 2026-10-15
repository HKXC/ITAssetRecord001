/**
 * Application errors with Thai, user-facing messages.
 *
 * Services throw these; Server Actions turn them into form errors. Anything that is not
 * an AppError is treated as an unexpected failure and hidden from the user (while still
 * being logged) so internal details never leak into the UI.
 */

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  /** Field-level message for form binding, when the failure is attributable to one input. */
  readonly field: string | null;

  constructor(message: string, code: string, status = 400, field: string | null = null) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.field = field;
  }
}

export class DuplicateAssetCodeError extends AppError {
  constructor() {
    super("รหัสครุภัณฑ์นี้มีอยู่แล้วในระบบ", "DUPLICATE_ASSET_CODE", 409, "asset_code");
    this.name = "DuplicateAssetCodeError";
  }
}

export class DuplicateSerialNumberError extends AppError {
  constructor() {
    super("หมายเลขเครื่อง (Serial Number) นี้มีอยู่แล้วในระบบ", "DUPLICATE_SERIAL_NUMBER", 409, "serial_number");
    this.name = "DuplicateSerialNumberError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code = "NOT_FOUND") {
    super(message, code, 404);
    this.name = "NotFoundError";
  }
}

/** Maps a Postgres error onto an AppError, keyed by the constraint that was violated. */
export function mapPostgresError(error: {
  code?: string | null;
  message?: string | null;
}): AppError | null {
  const message = error.message ?? "";

  if (error.code === "23505" || error.code === "23505".toString()) {
    if (message.includes("assets_asset_code_key")) return new DuplicateAssetCodeError();
    if (message.includes("assets_serial_number_key")) return new DuplicateSerialNumberError();
    if (message.includes("asset_types_code_key")) {
      return new AppError("รหัสประเภทครุภัณฑ์นี้มีอยู่แล้ว", "DUPLICATE_TYPE_CODE", 409, "code");
    }
    if (message.includes("asset_types_name_key")) {
      return new AppError("ชื่อประเภทครุภัณฑ์นี้มีอยู่แล้ว", "DUPLICATE_TYPE_NAME", 409, "name");
    }
    if (message.includes("documents_number_revision_key")) {
      return new AppError("เลขที่เอกสารซ้ำ กรุณาลองใหม่", "DUPLICATE_DOCUMENT_NUMBER", 409);
    }
    return new AppError("ข้อมูลซ้ำกับที่มีอยู่แล้วในระบบ", "UNIQUE_VIOLATION", 409);
  }

  if (error.code === "23514") {
    if (message.includes("assets_code_format")) {
      return new AppError(
        "รหัสครุภัณฑ์ต้องเป็น A-Z, 0-9 หรือ . _ / - และยาว 3-32 ตัวอักษร",
        "INVALID_ASSET_CODE",
        400,
        "asset_code",
      );
    }
    if (message.includes("assets_status_valid")) {
      return new AppError("สถานะครุภัณฑ์ไม่ถูกต้อง", "INVALID_STATUS", 400, "status");
    }
    if (message.includes("documents_ready_has_file")) {
      return new AppError("เอกสารสถานะพร้อมใช้งานต้องมีไฟล์แนบ", "DOCUMENT_MISSING_FILE", 500);
    }
    return new AppError("ข้อมูลไม่ผ่านเงื่อนไขของระบบ", "CHECK_VIOLATION", 400);
  }

  if (error.code === "23503") {
    if (message.includes("asset_type")) {
      return new AppError("ไม่พบประเภทครุภัณฑ์ที่เลือก", "ASSET_TYPE_NOT_FOUND", 400, "asset_type_id");
    }
    if (message.includes("document_items_asset_id_fkey")) {
      return new AppError("มีครุภัณฑ์ที่เลือกไว้ถูกลบไปแล้ว กรุณาเลือกใหม่", "ASSET_MISSING", 409);
    }
    return new AppError("ข้อมูลอ้างอิงไม่ถูกต้อง", "FK_VIOLATION", 400);
  }

  if (error.code === "23502") {
    return new AppError("กรุณากรอกข้อมูลให้ครบถ้วน", "NOT_NULL_VIOLATION", 400);
  }

  return null;
}
