import { signOutAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/common/SubmitButton";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SubmitButton variant="secondary" size="sm" pendingLabel="กำลังออกจากระบบ…">
        ออกจากระบบ
      </SubmitButton>
    </form>
  );
}
