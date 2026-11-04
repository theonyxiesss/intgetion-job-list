import { getTranslations } from "next-intl/server";
import { SpokiButtonLink } from "@/components/bot/spoki-link";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/** Closing call to action: Spoki first, then the two sides (D601). */
export async function LandingCta() {
  const t = await getTranslations();
  return (
    <section
      aria-labelledby="home-cta"
      className="border-t border-line py-20 md:py-32"
    >
      <Container className="flex flex-col items-center gap-8 text-center">
        <h2 id="home-cta" className="t-display-l max-w-[20ch]">
          {t("home.landing.ctaTitle")}
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          <SpokiButtonLink>{t("home.landing.ask.submit")}</SpokiButtonLink>
          <ButtonLink href="/jobs" variant="secondary">
            {t("headerNav.findWork")}
          </ButtonLink>
          <ButtonLink href="/post-job" variant="secondary">
            {t("nav.postJob")}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
