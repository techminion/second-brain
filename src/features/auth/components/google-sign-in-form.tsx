import { Button } from "@/shared/ui/button";

import { signInWithGoogle } from "../sign-in-with-google";

export function GoogleSignInForm() {
  return (
    <form action={signInWithGoogle}>
      <Button className="w-full" type="submit" variant="outline">
        Continue with Google
      </Button>
    </form>
  );
}
