"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { AppError, NotFoundError } from "@/lib/errors"
import { REGISTER_MAX_ASSETS } from "@/lib/services/documents"
import { generateAssetDocument, generateRegisterDocument } from "@/lib/services/documents"
import { createAsset, updateAsset } from "@/lib/services/assets"
import { requireUser } from "@/lib/supabase/server"
import { parseAssetForm } from "@/lib/validation/asset"

export type AssetFormState = {
  status: "idle" | "error"
  message: string | null
  errors: Record<string, string>
}

export type DocumentActionState = {
  status: "idle" | "error"
  message: string | null
}

function toFormState(error: unknown, fallback: string): AssetFormState {
  if (error instanceof AppError) {
    return {
      status: "error",
      message: error.message,
      errors: error.field ? { [error.field]: error.message } : {},
    }
  }
  console.error("[assets] unexpected error", error)
  return { status: "error", message: fallback, errors: {} }
}

export async function createAssetAction(
  _prevState: AssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  const user = await requireUser()

  const parsed = parseAssetForm(formData)
  if (!parsed.ok) {
    return { status: "error", message: "กรุณาตรวจสอบข้อมูลที่กรอก", errors: parsed.errors }
  }

  let assetId = ""
  try {
    const asset = await createAsset(parsed.data, user.id)
    assetId = asset.id
  } catch (error) {
    return toFormState(error, "ไม่สามารถบันทึกครุภัณฑ์ได้ กรุณาลองใหม่อีกครั้ง")
  }

  revalidatePath("/assets")
  revalidatePath("/")
  redirect(`/assets/${assetId}?created=1`)
}

export async function updateAssetAction(
  _prevState: AssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  const user = await requireUser()
  const assetId = String(formData.get("id") ?? "")

  if (!assetId) {
    return { status: "error", message: "ไม่พบรหัสอ้างอิงครุภัณฑ์", errors: {} }
  }

  const parsed = parseAssetForm(formData)
  if (!parsed.ok) {
    return { status: "error", message: "กรุณาตรวจสอบข้อมูลที่กรอก", errors: parsed.errors }
  }

  try {
    await updateAsset(assetId, parsed.data, user.id)
  } catch (error) {
    return toFormState(error, "ไม่สามารถบันทึกครุภัณฑ์ได้ กรุณาลองใหม่อีกครั้ง")
  }

  revalidatePath("/assets")
  revalidatePath(`/assets/${assetId}`)
  redirect(`/assets/${assetId}?updated=1`)
}

export async function generateAssetDocumentAction(
  _prevState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireUser()
  const assetId = String(formData.get("asset_id") ?? "")

  if (!assetId) return { status: "error", message: "ไม่พบรหัสอ้างอิงครุภัณฑ์" }

  try {
    const document = await generateAssetDocument(assetId, { userId: user.id })
    revalidatePath(`/assets/${assetId}`)
    revalidatePath("/documents")
    redirect(`/documents/${document.documentId}?generated=1`)
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AppError) {
      return { status: "error", message: error.message }
    }
    console.error("[documents] generate asset document failed", error)
    return {
      status: "error",
      message: "สร้างเอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    }
  }
}

export async function generateRegisterAction(
  _prevState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireUser()
  const assetIds = formData
    .getAll("asset_ids")
    .map((value) => String(value))
    .filter(Boolean)

  if (assetIds.length === 0) {
    return { status: "error", message: "กรุณาเลือกรายการครุภัณฑ์อย่างน้อย 1 รายการ" }
  }
  if (assetIds.length > REGISTER_MAX_ASSETS) {
    return {
      status: "error",
      message: `เลือกได้ไม่เกิน ${REGISTER_MAX_ASSETS} รายการต่อหนึ่งเอกสาร`,
    }
  }

  let documentId = ""
  try {
    const selectionNote = String(formData.get("selection_note") ?? "").trim() || null
    const document = await generateRegisterDocument(assetIds, { userId: user.id }, { selectionNote })
    documentId = document.documentId
  } catch (error) {
    if (error instanceof AppError) return { status: "error", message: error.message }
    console.error("[documents] generate register failed", error)
    return { status: "error", message: "สร้างเอกสารทะเบียนรวมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }
  }

  revalidatePath("/documents")
  redirect(`/documents/${documentId}?generated=1`)
}
