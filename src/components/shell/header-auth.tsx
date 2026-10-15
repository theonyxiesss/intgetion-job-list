"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Link } from "@/i18n/navigation";

/**
 * Guest sign-in for the header. The dialog is mounted only while open so
 * login and register field ids are absent from the page until then.
 */
export function HeaderAuth({ social }: { social: ReactNode }) {
  const nav = useTranslations("nav");
  const auth = useTranslations("auth");
  const ui = useTranslations("ui");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <>
      <Button
        variant="secondary"
        className="min-h-9! px-4! text-[14px]!"
        type="button"
        onClick={() => {
          setMode("login");
          setOpen(true);
        }}
      >
        {nav("login")}
      </Button>
      {open ? (
        <Dialog
          open
          onClose={() => setOpen(false)}
          title={mode === "login" ? auth("loginTitle") : auth("registerTitle")}
          closeLabel={ui("close")}
        >
          {mode === "login" ? (
            <div className="flex flex-col gap-6">
              <LoginForm />
              {social}
              <div className="flex flex-col gap-2 border-t border-line pt-6 text-fg-muted">
                <p>
                  {auth("noAccount")}{" "}
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => setMode("register")}
                  >
                    {auth("toRegister")}
                  </button>
                </p>
                <Link
                  href="/reset-password"
                  className="underline underline-offset-4"
                >
                  {auth("forgotPassword")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <RegisterForm />
              <p className="border-t border-line pt-6 text-fg-muted">
                {auth("haveAccount")}{" "}
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => setMode("login")}
                >
                  {auth("toLogin")}
                </button>
              </p>
            </div>
          )}
        </Dialog>
      ) : null}
    </>
  );
}
